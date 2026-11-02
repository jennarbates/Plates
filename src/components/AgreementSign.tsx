"use client";

import Link from "next/link";
import { useState } from "react";
import { addendumPoints, agreementPoints } from "@/lib/policies";

export type Signature = {
  fullName: string;
  email: string;
  phone: string;
  agreed: boolean;
  adult: boolean;
  initials: boolean[];
  noPhotos: boolean;
};

export const emptySignature: Signature = {
  fullName: "",
  email: "",
  phone: "",
  agreed: false,
  adult: false,
  initials: addendumPoints.map(() => false),
  noPhotos: false,
};

export function signatureComplete(signature: Signature) {
  return (
    signature.fullName.trim().length > 1 &&
    /\S+@\S+\.\S+/.test(signature.email) &&
    signature.phone.trim().length >= 7 &&
    signature.agreed &&
    signature.adult &&
    signature.initials.every(Boolean)
  );
}

export function AgreementSign({
  value,
  onChange,
  showErrors,
}: {
  value: Signature;
  onChange: (next: Signature) => void;
  showErrors: boolean;
}) {
  return (
    <>
      <h2>Sign the agreement</h2>
      <p className="notice small">
        Draft agreement, pending attorney review. <Link href="/policies" target="_blank">Read the full summary</Link>
      </p>
      <div className="agreement-summary" tabIndex={0} aria-label="Rental agreement summary">
        {agreementPoints.map((point) => (
          <p key={point}>{point}</p>
        ))}
      </div>
      <label className="choice">
        <input
          type="checkbox"
          checked={value.agreed}
          onChange={(event) => onChange({ ...value, agreed: event.target.checked })}
        />
        <span className="choice-main">I agree to the Rental Agreement and Appendix A replacement prices.</span>
      </label>
      <label className="choice">
        <input
          type="checkbox"
          checked={value.adult}
          onChange={(event) => onChange({ ...value, adult: event.target.checked })}
        />
        <span className="choice-main">I am at least 18 years old.</span>
      </label>

      <h3>Addendum B: lead and food safety</h3>
      <p className="small muted">
        Vintage pieces may contain lead or cadmium. <Link href="/policies#addendum-b" target="_blank">Read Addendum B</Link>, then confirm each line.
      </p>
      <div className="choice-stack">
        {addendumPoints.map((point, index) => (
          <label className="choice" key={point}>
            <input
              type="checkbox"
              checked={value.initials[index]}
              onChange={(event) =>
                onChange({
                  ...value,
                  initials: value.initials.map((item, i) => (i === index ? event.target.checked : item)),
                })
              }
            />
            <span className="choice-main">{point}</span>
          </label>
        ))}
      </div>

      <label className="field">
        Full name, typed as your signature
        <input
          autoComplete="name"
          value={value.fullName}
          onChange={(event) => onChange({ ...value, fullName: event.target.value })}
        />
      </label>
      <label className="field">
        Email
        <input
          type="email"
          autoComplete="email"
          value={value.email}
          onChange={(event) => onChange({ ...value, email: event.target.value })}
        />
      </label>
      <label className="field">
        Phone
        <input
          type="tel"
          autoComplete="tel"
          value={value.phone}
          onChange={(event) => onChange({ ...value, phone: event.target.value })}
        />
      </label>
      <label className="choice">
        <input
          type="checkbox"
          checked={value.noPhotos}
          onChange={(event) => onChange({ ...value, noPhotos: event.target.checked })}
        />
        <span className="choice-main">No photos of my setup, please.</span>
      </label>
      {showErrors && !signatureComplete(value) ? (
        <p className="field-error" role="alert">
          Please check every required box and add your name, email and phone.
        </p>
      ) : null}
    </>
  );
}

export function PaymentStep({
  amount,
  order,
  onUnavailable,
}: {
  amount: string;
  order: Record<string, unknown>;
  onUnavailable: (message: string, unavailable: string[]) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function pay() {
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      const data = (await response.json()) as { url?: string; code?: string; error?: string; unavailable?: string[] };
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      if (data.code === "unavailable") {
        onUnavailable(data.error ?? "That is no longer available.", data.unavailable ?? []);
        return;
      }
      setMessage(data.error ?? "We couldn't start checkout, and you weren't charged. Please try again.");
    } catch {
      setMessage("We couldn't reach the server, and you weren't charged. Please try again.");
    }
    setSubmitting(false);
  }

  return (
    <>
      <h2>Payment</h2>
      <p className="muted">
        You&apos;ll pay {amount} on Stripe&apos;s secure page. Your card is saved for your balance, security hold and any charges
        allowed by the agreement. We hold your booking for about 30 minutes while you pay.
      </p>
      {message ? <p className="notice" role="alert">{message}</p> : null}
      <button type="button" className="button button-full" disabled={submitting} onClick={pay}>
        {submitting ? "Opening secure payment..." : `Pay ${amount} securely`}
      </button>
    </>
  );
}
