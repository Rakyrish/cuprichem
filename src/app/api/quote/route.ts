import { NextResponse } from "next/server";

/**
 * RFQ intake — authoritative server-side validation.
 *
 * Delivery transport (email/DB) is not configured in this phase, so a valid
 * submission returns `{ ok: true, delivered: false }` and the client falls back
 * to a mailto: so the enquiry still reaches sales — no data is silently dropped
 * and no fake "sent" state is shown. When SMTP/DB is wired (Phase 11) this
 * handler performs delivery and returns `delivered: true`.
 *
 * Protections here: field validation, length caps, and a honeypot. Rate
 * limiting / CAPTCHA are added at the edge/proxy in production hardening.
 */

type Errors = Record<string, string>;

const MAX = { short: 150, name: 100, message: 2000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  // Honeypot: real users never fill this hidden field.
  if (str(body.company_website) !== "") {
    // Pretend success to bots without processing.
    return NextResponse.json({ ok: true, delivered: false });
  }

  const name = str(body.name);
  const email = str(body.email);
  const product = str(body.product);
  const company = str(body.company);
  const phone = str(body.phone);
  const quantity = str(body.quantity);
  const message = str(body.message);

  const errors: Errors = {};
  if (name.length < 2 || name.length > MAX.name) errors.name = "Please enter your name.";
  if (!EMAIL_RE.test(email) || email.length > MAX.short)
    errors.email = "Please enter a valid email address.";
  if (product.length < 2 || product.length > MAX.short)
    errors.product = "Please tell us which product you need.";
  if (company.length > MAX.short) errors.company = "Company name is too long.";
  if (phone.length > MAX.short) errors.phone = "Phone number is too long.";
  if (quantity.length > MAX.short) errors.quantity = "Quantity is too long.";
  if (message.length > MAX.message) errors.message = "Message is too long.";

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 400 });
  }

  // Valid enquiry. No transport configured yet → client uses mailto fallback.
  return NextResponse.json({ ok: true, delivered: false });
}
