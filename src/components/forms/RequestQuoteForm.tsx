"use client";

import { useState } from "react";
import { siteConfig } from "@/config/site";

/**
 * RFQ form.
 *
 * Flow: POST to /api/quote for authoritative server-side validation. Because no
 * email transport is configured yet (Phase 11), a valid submission comes back
 * `delivered: false`, and we open a pre-filled mailto: to the sales inbox so the
 * enquiry still reaches the team — real, working, no data loss and no fake
 * "sent" state. When delivery is wired server-side, `delivered: true` will show
 * an on-page confirmation instead.
 */

const fieldBase =
  "mt-2 w-full rounded-[var(--radius)] border border-line-strong bg-paper px-3 py-2.5 text-ink " +
  "placeholder:text-muted/70 focus:border-brand focus-visible:outline-none";
const labelBase = "block text-sm font-medium text-ink";

type FieldErrors = Record<string, string>;

function mailtoFor(fields: Record<string, string>) {
  const lines = [
    `Name: ${fields.name}`,
    `Company: ${fields.company || "-"}`,
    `Email: ${fields.email}`,
    `Phone: ${fields.phone || "-"}`,
    `Product: ${fields.product}`,
    `Quantity: ${fields.quantity || "-"}`,
    "",
    "Message:",
    fields.message || "-",
  ];
  const subject = `Quote request: ${fields.product}`;
  return `${siteConfig.contact.salesEmailHref}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(lines.join("\n"))}`;
}

export function RequestQuoteForm({ defaultProduct = "" }: { defaultProduct?: string }) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const get = (k: string) => String(data.get(k) ?? "").trim();
    const fields = {
      name: get("name"),
      company: get("company"),
      email: get("email"),
      phone: get("phone"),
      product: get("product"),
      quantity: get("quantity"),
      message: get("message"),
      company_website: get("company_website"), // honeypot
    };

    setSubmitting(true);
    setErrors({});
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const result = await res.json();
      if (!res.ok) {
        setErrors(
          result.errors ?? { form: result.message ?? "Something went wrong." },
        );
        return;
      }
      if (result.delivered) {
        setDone(true);
      } else {
        // No transport yet — hand off to the user's email client.
        const a = document.createElement("a");
        a.href = mailtoFor(fields);
        a.click();
        setDone(true);
      }
    } catch {
      // Network/API unavailable — still let the enquiry through via mailto.
      const a = document.createElement("a");
      a.href = mailtoFor(fields);
      a.click();
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div
        role="status"
        className="rounded-[var(--radius-lg)] border border-accent-ink/30 bg-accent-050 p-6"
      >
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.12em] text-accent-ink">
          Enquiry ready
        </p>
        <h2 className="mt-2 text-xl text-ink">Your email client should now be open.</h2>
        <p className="mt-2 text-muted">
          Send the pre-filled message to reach our sales team. If nothing opened,
          email us directly at{" "}
          <a href={siteConfig.contact.salesEmailHref} className="text-brand-700 hover:underline">
            {siteConfig.company.salesEmail}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5">
      {/* Honeypot — visually hidden, off-screen, not focusable */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company_website">Company website</label>
        <input id="company_website" name="company_website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Name" required error={errors.name} autoComplete="name" />
        <Field id="company" label="Company" error={errors.company} autoComplete="organization" />
        <Field id="email" label="Email" type="email" required error={errors.email} autoComplete="email" />
        <Field id="phone" label="Phone" type="tel" error={errors.phone} autoComplete="tel" />
        <Field
          id="product"
          label="Product / chemical"
          required
          error={errors.product}
          defaultValue={defaultProduct}
        />
        <Field id="quantity" label="Quantity" error={errors.quantity} placeholder="e.g. 25 kg, 200 L" />
      </div>
      <div>
        <label htmlFor="message" className={labelBase}>
          Message
        </label>
        <textarea id="message" name="message" rows={4} className={fieldBase} />
        {errors.message && <FieldError>{errors.message}</FieldError>}
      </div>

      {errors.form && (
        <p role="alert" className="text-sm text-[#b3261e]">
          {errors.form}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-12 items-center justify-center rounded-[var(--radius)] bg-brand px-6 font-medium text-white transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Send enquiry"}
        </button>
        <p className="text-sm text-muted">
          Opens your email app addressed to our sales team.
        </p>
      </div>
    </form>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-1.5 text-sm text-[#b3261e]">
      {children}
    </p>
  );
}

function Field({
  id,
  label,
  type = "text",
  required = false,
  error,
  autoComplete,
  placeholder,
  defaultValue,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  error?: string;
  autoComplete?: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelBase}>
        {label} {required && <span className="text-accent-ink">*</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        className={fieldBase}
      />
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
