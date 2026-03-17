import { NextRequest, NextResponse } from "next/server";

const BASE = "https://marketplace.api.healthcare.gov/api/v1";

export async function GET(req: NextRequest) {
  const apiKey = process.env.MARKETPLACE_API_KEY;
  if (!apiKey) return NextResponse.json([], { status: 200 });

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const zip = req.nextUrl.searchParams.get("zip") ?? "";
  const year = req.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear());

  if (q.length < 2) return NextResponse.json([]);

  const res = await fetch(
    `${BASE}/providers/autocomplete?q=${encodeURIComponent(q)}&zipcode=${zip}&year=${year}&apikey=${apiKey}`
  );
  if (!res.ok) return NextResponse.json([]);
  const data = await res.json();

  const results = (Array.isArray(data) ? data : []).slice(0, 8).map((p: {
    npi: string; name: string; specialties?: string[]; provider_type?: string;
  }) => ({
    npi: p.npi,
    name: p.name,
    specialty: p.specialties?.[0] ?? p.provider_type ?? "",
  }));

  return NextResponse.json(results);
}
