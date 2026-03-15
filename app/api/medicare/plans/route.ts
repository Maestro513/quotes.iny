import { NextRequest, NextResponse } from "next/server";
import { mockMedicarePlans } from "@/lib/medicare/mock";

export async function GET(req: NextRequest) {
  const zip = req.nextUrl.searchParams.get("zip") ?? "";

  const plans = zip
    ? mockMedicarePlans.filter((p) => p.zip_codes.includes(zip))
    : mockMedicarePlans;

  return NextResponse.json(plans);
}
