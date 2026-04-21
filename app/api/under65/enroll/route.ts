import { NextRequest, NextResponse } from "next/server";
import type { Under65Application } from "@/types/under65-enrollment";

/**
 * Under-65 enrollment submission endpoint.
 *
 * For now this validates the critical fields and returns a receipt ID — the
 * agent team reaches out from the Conci CRM after the submission. Once we
 * wire a persistence layer (Vercel Postgres / Conci API / CRM webhook),
 * this handler can forward there. Until then the payload is logged so it
 * surfaces in Vercel logs for debugging and ops can spot-check submissions.
 */

function generateReceiptId(): string {
  // 10-char alnum receipt, uppercase, no ambiguous characters
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return `INY-${out.slice(0, 4)}-${out.slice(4)}`;
}

function validate(app: Under65Application): string | null {
  if (!app?.planId) return "planId required";
  if (!app?.primaryContact?.firstName) return "primary contact first name required";
  if (!app?.primaryContact?.lastName) return "primary contact last name required";
  if (!app?.primaryContact?.dob) return "primary contact date of birth required";
  if (!app?.primaryContact?.contactDetails?.phone) return "primary contact phone required";
  if (!app?.finalize?.signAndSubmit?.signatureName) return "signature required";
  if (app?.finalize?.signAndSubmit?.agreeToTruthfulness !== "yes") return "must agree to truthfulness attestation";
  return null;
}

export async function POST(req: NextRequest) {
  let body: Under65Application;
  try {
    body = (await req.json()) as Under65Application;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const validationError = validate(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const receiptId = generateReceiptId();
  const submittedAt = new Date().toISOString();

  // Non-PII log — logs structure + receipt, redacts SSN / DOB so Vercel log
  // retention stays HIPAA-adjacent until we migrate to a proper data store.
  const redacted = {
    receiptId,
    submittedAt,
    planId: body.planId,
    planYear: body.planYear,
    primaryName: `${body.primaryContact.firstName} ${body.primaryContact.lastName}`,
    state: body.primaryContact.homeAddress.state,
    zip: body.primaryContact.homeAddress.zip,
    applicantCount: 1 + (body.household?.applicants?.length ?? 0),
    wantsCostSavings: body.household?.wantsCostSavings,
  };
  console.log("[under65/enroll]", JSON.stringify(redacted));

  return NextResponse.json({ receiptId, submittedAt });
}
