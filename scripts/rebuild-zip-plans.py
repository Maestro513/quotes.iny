"""
Rebuild zip_backend_plans.json.gz using CMS county-level plan data.

Algorithm:
1. For each ZIP in zip_to_plans.csv, determine its state (prefix lookup)
2. For that state, find which CMS county_code has the best plan overlap
3. Use that county's plans as the result (authoritative, county-specific)

This gives ~47-60 plans per county instead of 228+ statewide.
"""
import sqlite3, json, gzip, os, csv

DB = 'C:/Users/tank5/Desktop/INY_concierge/backend/cms_benefits.db'
EXTRACTED_DIR = 'C:/Users/tank5/Desktop/INY_concierge/backend/extracted'
CSV_PATH = 'C:/Users/tank5/Desktop/INY_concierge/backend/pdf Updated/zip_to_plans.csv'
BACKEND_PLANS = os.path.join(os.path.dirname(__file__), '..', 'data', 'backend_plans.json')
OUT_PATH = 'C:/Users/tank5/Desktop/INY_site_update/quotes-app/data/zip_backend_plans.json.gz'
OUT_PATH_REPO = os.path.join(os.path.dirname(__file__), '..', 'data', 'zip_backend_plans.json.gz')

conn = sqlite3.connect(DB)
cur = conn.cursor()

extracted = set(
    f.replace('.json', '') for f in os.listdir(EXTRACTED_DIR)
    if f.endswith('.json') and not f.startswith('AGREEMENT')
)

# Build per-state: county_code -> plans (extracted only)
cur.execute('SELECT DISTINCT state, county_code, contract_id || "-" || plan_id FROM plan_formulary')
state_county_plans = {}
for state, county, plan in cur.fetchall():
    state = state.strip()
    if not state or plan not in extracted: continue
    state_county_plans.setdefault(state, {}).setdefault(county, set()).add(plan)

conn.close()
print(f"States with county data: {len(state_county_plans)}")

# ZIP prefix -> state
ZIP_STATE = {}
ranges = [
    ('006','009','PR'), ('010','027','MA'), ('028','029','RI'), ('030','038','NH'),
    ('039','049','ME'), ('050','059','VT'), ('060','069','CT'), ('070','089','NJ'),
    ('090','099','NY'), ('100','149','NY'), ('150','196','PA'), ('197','199','DE'),
    ('200','205','DC'), ('206','212','MD'), ('214','219','MD'), ('220','246','VA'),
    ('247','268','WV'), ('270','289','NC'), ('290','299','SC'), ('300','319','GA'),
    ('320','349','FL'), ('350','369','AL'), ('370','385','TN'), ('386','397','MS'),
    ('398','399','GA'), ('400','427','KY'), ('430','458','OH'), ('460','479','IN'),
    ('480','499','MI'), ('500','528','IA'), ('530','549','WI'), ('550','567','MN'),
    ('570','577','SD'), ('580','588','ND'), ('590','599','MT'), ('600','629','IL'),
    ('630','658','MO'), ('660','679','KS'), ('680','693','NE'), ('700','714','LA'),
    ('716','723','AR'), ('730','749','OK'), ('750','799','TX'), ('800','816','CO'),
    ('820','831','WY'), ('832','838','ID'), ('840','847','UT'), ('850','865','AZ'),
    ('870','884','NM'), ('885','885','TX'), ('889','898','NV'), ('900','961','CA'),
    ('967','968','HI'), ('970','979','OR'), ('980','994','WA'), ('995','999','AK'),
]
for start, end, state in ranges:
    for i in range(int(start), int(end) + 1):
        ZIP_STATE[str(i).zfill(3)] = state

def zip_to_state(z):
    return ZIP_STATE.get(z[:3])

# Also build state -> all extracted plans (for fallback)
state_all_plans = {}
for state, counties in state_county_plans.items():
    all_plans = set()
    for plans in counties.values():
        all_plans |= plans
    state_all_plans[state] = sorted(all_plans)

print("Matching each ZIP to its best CMS county...")
result = {}
processed = 0
zips_in_csv = set()

with open(CSV_PATH, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    next(reader)
    for row in reader:
        if len(row) < 2: continue
        zipcode = row[0].strip()
        zips_in_csv.add(zipcode)
        state = zip_to_state(zipcode)
        if not state or state not in state_county_plans: continue

        csv_plans = set(p.strip() for p in row[1].split(',') if p.strip())
        counties = state_county_plans[state]

        # Find county with most plan overlap (among extracted plans)
        best_county = None
        best_overlap = 0
        for county, county_plans in counties.items():
            overlap = len(county_plans & csv_plans)
            if overlap > best_overlap:
                best_overlap = overlap
                best_county = county

        if best_county and best_overlap > 0:
            result[zipcode] = sorted(counties[best_county])
        elif state in state_all_plans:
            result[zipcode] = state_all_plans[state]

        processed += 1
        if processed % 5000 == 0:
            print(f"  {processed} ZIPs processed...", end='\r')

# Add state-level fallback for ZIPs not in CSV
print(f"\nAdding fallback for ZIPs not in CSV...")
all_zips_prefix = set()
for i in range(100000):
    z = str(i).zfill(5)
    state = zip_to_state(z)
    if state and state in state_all_plans and z not in zips_in_csv and z not in result:
        result[z] = state_all_plans[state]

# Expand 2-segment plan numbers (H0169-001) to the ORIGINAL backend IDs
# (e.g. H0169-001-000) so the Concierge API can resolve them.
print("Expanding plan numbers to original backend IDs...")
with open(BACKEND_PLANS, 'r') as f:
    backend_raw = json.load(f)

def normalize(pn):
    parts = pn.split('-')
    return f"{parts[0]}-{parts[1]}" if len(parts) >= 3 else pn

norm_to_originals = {}
for pn in backend_raw:
    norm = normalize(pn)
    norm_to_originals.setdefault(norm, []).append(pn)

expanded = {}
for zipcode, plans in result.items():
    full = set()
    for p in plans:
        norm = normalize(p)
        if norm in norm_to_originals:
            full.update(norm_to_originals[norm])
        else:
            full.add(p)
    expanded[zipcode] = sorted(full)

result = expanded

print(f"\nZIPs with plans: {len(result)}")
for z in ['33067', '33334', '10001', '90210', '60601', '77001', '30301']:
    print(f"  {z}: {len(result.get(z, []))} plans")

json_bytes = json.dumps(result).encode('utf-8')
print(f"JSON size: {len(json_bytes)/1024:.0f} KB")

for out in [OUT_PATH, OUT_PATH_REPO]:
    with gzip.open(out, 'wb', compresslevel=9) as f:
        f.write(json_bytes)
    size = os.path.getsize(out)
    print(f"Written: {out} ({size/1024:.1f} KB)")
