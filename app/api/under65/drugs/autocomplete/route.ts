import { NextRequest, NextResponse } from "next/server";

const BASE = "https://marketplace.api.healthcare.gov/api/v1";

export async function GET(req: NextRequest) {
  const apiKey = process.env.MARKETPLACE_API_KEY;
  if (!apiKey) return NextResponse.json([]);

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const year = req.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear());

  if (q.length < 2) return NextResponse.json([]);

  const res = await fetch(
    `${BASE}/drugs/autocomplete?q=${encodeURIComponent(q)}&year=${year}&apikey=${apiKey}`
  );
  if (!res.ok) return NextResponse.json([]);
  const data = await res.json();

  const results = (Array.isArray(data) ? data : []).slice(0, 8).map((d: {
    rxcui: string; name: string; strength?: string; route?: string;
  }) => ({
    rxcui: d.rxcui,
    name: d.name,
    detail: [d.strength, d.route].filter(Boolean).join(" · "),
  }));

  return NextResponse.json(results);
}
