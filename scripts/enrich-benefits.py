"""
Enrich extracted CMS plan JSONs with actual copay/coinsurance amounts from PBP data.

Sources:
  - cms_benefits.db (SQLite): B7 specialist/PCP, B4 ER/urgent care copays
  - pbp_mrx_tier.txt (TSV):   Drug tier copay/coinsurance amounts

This script:
  1. Reads all JSON files in data/extracted_cms/ (5,488 plans)
  2. Queries DB for medical copays (B7/B4)
  3. Reads pbp_mrx_tier.txt for drug tier pricing
  4. Fills gaps: _yn=2 -> $0, PACE -> $0, SNP -> Covered, MA-only -> Rx N/A
  5. Writes updated JSON files back in place

Usage:
    python scripts/enrich-benefits.py [--db PATH] [--mrx PATH] [--dry-run]
"""

import sqlite3
import csv
import json
import os
import argparse
import glob

EXTRACTED_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "extracted_cms")

DB_CANDIDATES = [
    os.path.join(os.path.expanduser("~"), "Conci", "backend", "cms_benefits.db"),
    os.path.join(os.path.expanduser("~"), "INY_concierge", "backend", "cms_benefits.db"),
]

MRX_CANDIDATES = [
    os.path.join(
        os.path.expanduser("~"),
        "Conci", "backend", "Pdfs", "CMS", "pbp-benefits-2026", "pbp_mrx_tier.txt",
    ),
]


def find_file(candidates):
    for p in candidates:
        if os.path.isfile(p):
            return p
    return None


def safe_float(val):
    if val is None or str(val).strip() == "":
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def format_copay(copay_min, copay_max, coins_min, coins_max):
    c_min = safe_float(copay_min)
    c_max = safe_float(copay_max)
    p_min = safe_float(coins_min)
    p_max = safe_float(coins_max)

    if c_min is not None:
        if c_max is not None and c_max != c_min:
            return f"${c_min:.0f}-${c_max:.0f} copay"
        return f"${c_min:.0f} copay"

    if p_min is not None:
        if p_max is not None and p_max != p_min:
            return f"{p_min:.0f}-{p_max:.0f}% coinsurance"
        return f"{p_min:.0f}% coinsurance"

    return None


def format_drug_tier(copay, coins):
    c = safe_float(copay)
    p = safe_float(coins)
    if c is not None:
        return f"${c:.0f}"
    if p is not None:
        return f"{p:.0f}%"
    return None


def is_vague(value):
    v = value.lower().strip()
    return v in ("covered", "included", "") or "eoc" in v


def load_mrx_tiers(mrx_path):
    tiers = {}
    with open(mrx_path, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            hn = row.get("pbp_a_hnumber", "").strip()
            pid = row.get("pbp_a_plan_identifier", "").strip()
            if not hn or not pid:
                continue

            plan_key = f"{hn}-{pid}"
            tid = row.get("mrx_tier_id", "").strip()
            label = row.get("mrx_tier_label_list", "").strip()

            display = None
            for copay_col, coins_col in [
                ("mrx_tier_rstd_copay_1m", "mrx_tier_rstd_coins_1m"),
                ("mrx_tier_rspfd_copay_1m", "mrx_tier_rspfd_coins_1m"),
                ("mrx_tier_rsstd_copay_1m", "mrx_tier_rsstd_coins_1m"),
            ]:
                copay = row.get(copay_col, "").strip()
                coins = row.get(coins_col, "").strip()
                display = format_drug_tier(copay, coins)
                if display is not None:
                    break

            if display is None:
                continue

            if plan_key not in tiers:
                tiers[plan_key] = []
            tiers[plan_key].append((int(tid) if tid.isdigit() else 99, label, display))

    for plan_key in tiers:
        tiers[plan_key].sort(key=lambda x: x[0])

    return tiers


def main():
    parser = argparse.ArgumentParser(description="Enrich CMS plan benefits")
    parser.add_argument("--db", default=None, help="Path to cms_benefits.db")
    parser.add_argument("--mrx", default=None, help="Path to pbp_mrx_tier.txt")
    parser.add_argument("--dry-run", action="store_true", help="Print stats without writing")
    args = parser.parse_args()

    db_path = args.db or find_file(DB_CANDIDATES)
    mrx_path = args.mrx or find_file(MRX_CANDIDATES)

    if not db_path or not os.path.isfile(db_path):
        print(f"ERROR: cms_benefits.db not found. Tried: {DB_CANDIDATES}")
        return
    if not mrx_path or not os.path.isfile(mrx_path):
        print(f"WARNING: pbp_mrx_tier.txt not found.")
        mrx_path = None

    print(f"DB:  {db_path}")
    print(f"MRX: {mrx_path or 'NOT FOUND'}")
    print(f"Dir: {EXTRACTED_DIR}")

    # Load all plan JSONs
    json_files = glob.glob(os.path.join(EXTRACTED_DIR, "*.json"))
    plans = {}
    for fp in json_files:
        with open(fp, "r", encoding="utf-8") as f:
            plan = json.load(f)
        pid = plan.get("plan_id")
        if pid:
            plans[pid] = (fp, plan)
    print(f"Loaded {len(plans)} plans")

    drug_tiers = load_mrx_tiers(mrx_path) if mrx_path else {}
    print(f"Loaded drug tiers for {len(drug_tiers)} plans")

    db = sqlite3.connect(db_path)
    db.row_factory = sqlite3.Row

    # Build set of plans with Part D
    part_d_plans = set()
    for row in db.execute("SELECT DISTINCT contract_id, plan_id FROM plan_formulary"):
        part_d_plans.add(f"{row['contract_id']}-{row['plan_id']}")

    stats = {
        "specialist_added": 0, "specialist_updated": 0,
        "er_added": 0, "urgent_added": 0,
        "pcp_updated": 0, "er_updated": 0, "urgent_updated": 0,
        "rx_enriched": 0, "rx_na": 0, "rx_filled": 0,
        "zero_filled": 0, "covered_filled": 0,
        "files_modified": 0,
    }

    BENEFIT_CHECKS = [
        ("Specialist Visit", "pbp_b7_health_prof", "pbp_b7b_copay_yn", "pbp_b7b_coins_yn",
         "pbp_b7b_copay_mc_amt_min", "pbp_b7b_copay_mc_amt_max",
         "pbp_b7b_coins_pct_mc_min", "pbp_b7b_coins_pct_mc_max"),
        ("Emergency Room", "pbp_b4_emerg_urgent", "pbp_b4a_copay_yn", "pbp_b4a_coins_yn",
         "pbp_b4a_copay_amt_mc_min", "pbp_b4a_copay_amt_mc_max",
         "pbp_b4a_coins_pct_mc_min", "pbp_b4a_coins_pct_mc_max"),
        ("Urgent Care", "pbp_b4_emerg_urgent", "pbp_b4b_copay_yn", "pbp_b4b_coins_yn",
         "pbp_b4b_copay_amt_mc_min", "pbp_b4b_copay_amt_mc_max",
         "pbp_b4b_coins_pct_mc_min", "pbp_b4b_coins_pct_mc_max"),
    ]

    for plan_id, (filepath, plan) in plans.items():
        parts = plan_id.split("-")
        if len(parts) < 2:
            continue
        cid, pid = parts[0], parts[1]

        sections = plan.get("sections", [])
        kb = next((s for s in sections if s["title"] == "Key Benefits"), None)
        if not kb:
            continue

        modified = False
        snp = plan.get("snp_type", "") or ""
        is_snp = snp in ("D-SNP", "C-SNP", "I-SNP")
        is_pace = "pace" in plan.get("plan_name", "").lower()

        # ── Medical benefits: enrich from DB, then gap-fill ──────────────────
        for label, table, copay_yn_col, coins_yn_col, c_min_col, c_max_col, p_min_col, p_max_col in BENEFIT_CHECKS:
            existing = next((r for r in kb["rows"] if r["label"] == label), None)

            # Skip if already has a good value
            if existing:
                v = existing["value"]
                if "$" in v or "%" in v:
                    continue

            # Query DB for actual amounts
            row = db.execute(
                f"SELECT {copay_yn_col}, {coins_yn_col}, {c_min_col}, {c_max_col}, {p_min_col}, {p_max_col} "
                f"FROM {table} WHERE pbp_a_hnumber = ? AND pbp_a_plan_identifier = ? LIMIT 1",
                (cid, pid),
            ).fetchone()

            # Try to get a specific amount
            amount = None
            if row:
                amount = format_copay(row[c_min_col], row[c_max_col], row[p_min_col], row[p_max_col])

            if amount:
                # We have a real dollar/percent value
                stat_key = f"{'specialist' if 'Specialist' in label else label.lower().replace(' ', '_')}"
                if existing:
                    if is_vague(existing["value"]):
                        existing["value"] = amount
                        stats[f"{'specialist_updated' if 'Specialist' in label else 'er_updated' if 'Emergency' in label else 'urgent_updated'}"] += 1
                        modified = True
                else:
                    pcp_idx = next(
                        (i for i, r in enumerate(kb["rows"]) if r["label"] == "PCP Visit"), None
                    )
                    if label == "Specialist Visit":
                        insert_at = (pcp_idx + 1) if pcp_idx is not None else 1
                    elif label == "Emergency Room":
                        spec_idx = next((i for i, r in enumerate(kb["rows"]) if r["label"] == "Specialist Visit"), pcp_idx)
                        insert_at = (spec_idx + 1) if spec_idx is not None else len(kb["rows"])
                    else:  # Urgent Care
                        er_idx = next((i for i, r in enumerate(kb["rows"]) if r["label"] == "Emergency Room"), None)
                        insert_at = (er_idx + 1) if er_idx is not None else len(kb["rows"])
                    kb["rows"].insert(insert_at, {"label": label, "value": amount})
                    stats[f"{'specialist_added' if 'Specialist' in label else 'er_added' if 'Emergency' in label else 'urgent_added'}"] += 1
                    modified = True
                continue

            # No specific amount — gap-fill
            copay_yn = str(row[copay_yn_col]).strip() if row else ""
            coins_yn = str(row[coins_yn_col]).strip() if row else ""

            fill_val = None
            if copay_yn == "2" and coins_yn == "2":
                fill_val = "$0 copay"
                stats["zero_filled"] += 1
            elif is_pace:
                fill_val = "$0 copay"
                stats["zero_filled"] += 1
            else:
                fill_val = "Covered"
                stats["covered_filled"] += 1

            if existing:
                existing["value"] = fill_val
            else:
                order = ["PCP Visit", "Specialist Visit", "Emergency Room", "Urgent Care"]
                insert_at = len(kb["rows"])
                for i, r in enumerate(kb["rows"]):
                    if r["label"] in order:
                        if order.index(label) <= order.index(r["label"]):
                            insert_at = i
                            break
                    insert_at = i + 1
                kb["rows"].insert(insert_at, {"label": label, "value": fill_val})
            modified = True

        # ── PCP: update if vague ─────────────────────────────────────────────
        pcp_row_data = next((r for r in kb["rows"] if r["label"] == "PCP Visit"), None)
        if pcp_row_data and is_vague(pcp_row_data["value"]):
            b7 = db.execute(
                """SELECT pbp_b7a_copay_amt_mc_min, pbp_b7a_copay_amt_mc_max,
                          pbp_b7a_coins_pct_mc_min, pbp_b7a_coins_pct_mc_max
                   FROM pbp_b7_health_prof
                   WHERE pbp_a_hnumber = ? AND pbp_a_plan_identifier = ? LIMIT 1""",
                (cid, pid),
            ).fetchone()
            if b7:
                pcp_val = format_copay(
                    b7["pbp_b7a_copay_amt_mc_min"], b7["pbp_b7a_copay_amt_mc_max"],
                    b7["pbp_b7a_coins_pct_mc_min"], b7["pbp_b7a_coins_pct_mc_max"],
                )
                if pcp_val:
                    pcp_row_data["value"] = pcp_val
                    stats["pcp_updated"] += 1
                    modified = True

        # ── Drug Tiers ────────────────────────────────────────────────────────
        rx_section = next((s for s in sections if s["title"] == "Prescription Drugs"), None)
        has_real_tier = False
        if rx_section:
            has_real_tier = any(
                ("Tier 1" in r["label"] and "$" in r["value"])
                or ("Tier 1" in r["label"] and "%" in r["value"])
                for r in rx_section["rows"]
            )

        if plan_id in drug_tiers and not has_real_tier:
            if not rx_section:
                rx_section = {"title": "Prescription Drugs", "icon": "pills", "rows": []}
                sections.append(rx_section)

            ded_row = next(
                (r for r in rx_section["rows"] if r["label"] == "Drug Deductible"), None
            )
            new_rows = []
            if ded_row:
                new_rows.append(ded_row)

            for tier_id, tier_label, tier_display in drug_tiers[plan_id]:
                new_rows.append({
                    "label": f"Tier {tier_id}: {tier_label}",
                    "value": tier_display,
                })

            rx_section["rows"] = new_rows
            stats["rx_enriched"] += 1
            modified = True

        # ── Rx gap-fill ──────────────────────────────────────────────────────
        if not rx_section:
            rx_section = next((s for s in sections if s["title"] == "Prescription Drugs"), None)

        rx_has_tier = False
        if rx_section:
            rx_has_tier = any("Tier 1" in r["label"] or r["label"] == "T1" for r in rx_section["rows"])

        if not rx_has_tier:
            has_part_d = plan_id in part_d_plans
            if is_pace:
                fill_rx = "$0"
                stats["rx_filled"] += 1
            elif not has_part_d:
                fill_rx = "N/A"
                stats["rx_na"] += 1
            else:
                fill_rx = "$0"
                stats["rx_filled"] += 1

            if not rx_section:
                rx_section = {"title": "Prescription Drugs", "icon": "pills", "rows": []}
                sections.append(rx_section)
            rx_section["rows"].append({"label": "Tier 1: Preferred Generic", "value": fill_rx})
            modified = True

        # Write back if modified
        if modified:
            stats["files_modified"] += 1
            if not args.dry_run:
                with open(filepath, "w", encoding="utf-8") as f:
                    json.dump(plan, f, indent=2, ensure_ascii=False)

    db.close()

    print(f"\n-- Medical Benefits --")
    print(f"  Specialist added:    {stats['specialist_added']}")
    print(f"  Specialist updated:  {stats['specialist_updated']}")
    print(f"  ER added:            {stats['er_added']}")
    print(f"  ER updated:          {stats['er_updated']}")
    print(f"  Urgent added:        {stats['urgent_added']}")
    print(f"  Urgent updated:      {stats['urgent_updated']}")
    print(f"  PCP updated:         {stats['pcp_updated']}")
    print(f"\n-- Drug Tiers --")
    print(f"  Rx enriched:         {stats['rx_enriched']}")
    print(f"\n-- Gap-Fill --")
    print(f"  Filled with $0:      {stats['zero_filled']}")
    print(f"  Filled with Covered: {stats['covered_filled']}")
    print(f"  Rx filled ($0):      {stats['rx_filled']}")
    print(f"  Rx filled (N/A):     {stats['rx_na']}")
    print(f"\n  Files modified:      {stats['files_modified']}")

    if args.dry_run:
        print("\n[DRY RUN] No files written.")


if __name__ == "__main__":
    main()
