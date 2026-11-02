"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDate, moneyFromCents } from "@/lib/site";

type Payment = {
  id: string;
  kind: "balance" | "security_hold" | "extra";
  status: "processing" | "succeeded" | "failed" | "held" | "released" | "captured";
  amount_cents: number;
  captured_cents: number | null;
  attempts: number;
  failure_code: string | null;
  note: string | null;
  capture_before: string | null;
};

type Booking = {
  id: string;
  reference: string;
  kind: "setup" | "rental";
  status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  start_date: string;
  end_date: string;
  time_slot: string | null;
  location: string | null;
  access_notes: string | null;
  quote: { lines: { label: string }[] };
  total_cents: number;
  due_now_cents: number;
  balance_cents: number;
  security_hold_cents: number;
  payments: Payment[];
};

const kindNames = { balance: "Balance", security_hold: "Security hold", extra: "Extra charge" };

function describe(payment: Payment) {
  const amount = moneyFromCents(payment.amount_cents);
  if (payment.status === "failed") return `${amount} failed, try ${payment.attempts} of 3 (${payment.failure_code})`;
  if (payment.status === "captured") return `${moneyFromCents(payment.captured_cents ?? 0)} charged from a ${amount} hold`;
  const until = payment.status === "held" && payment.capture_before ? `, until ${formatDate(payment.capture_before.slice(0, 10))}` : "";
  return `${amount} ${payment.status}${until}`;
}

function DamageForm({ booking, action, title, onDone }: { booking: Booking; action: "capture" | "extra"; title: string; onDone: (body: object, question: string) => void }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const cents = Math.round(Number(amount) * 100);
  const ready = cents > 0 && note.trim().length >= 3 && sent;

  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        onDone(
          { action, bookingId: booking.id, amountCents: cents, note, itemizedListSent: sent },
          `Charge ${booking.customer_name} ${moneyFromCents(cents)}?`,
        );
      }}
    >
      <h3>{title}</h3>
      <label className="field">
        Amount in dollars
        <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
      </label>
      <label className="field">
        Reason, sent to the customer
        <input value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <label className="choice">
        <input type="checkbox" checked={sent} onChange={(event) => setSent(event.target.checked)} />
        <span className="choice-main">I already emailed the customer an itemized list with photos.</span>
      </label>
      <button type="submit" className="button button-secondary" disabled={!ready}>{title}</button>
    </form>
  );
}

function BookingCard({ booking, act, busy }: { booking: Booking; act: (body: object, question: string) => void; busy: boolean }) {
  const paymentFor = (kind: "balance" | "security_hold") => booking.payments.find((payment) => payment.kind === kind);
  const balance = paymentFor("balance");
  const hold = paymentFor("security_hold");
  const confirmed = booking.status === "confirmed";
  const canBalance = confirmed && booking.balance_cents > 0 && (!balance || balance.status === "failed");
  const canHold = confirmed && booking.security_hold_cents > 0 && (!hold || hold.status === "failed");
  const held = hold?.status === "held";

  return (
    <article className="panel admin-booking">
      <div className="admin-booking-head">
        <h2 className="heading-small">
          {formatDate(booking.start_date)}
          {booking.time_slot ? `, ${booking.time_slot}` : ""}
          {booking.kind === "rental" ? ` to ${formatDate(booking.end_date)}` : ""}
        </h2>
        <p className={`admin-status status-${booking.status}`}>{booking.status.replace("_", " ")}</p>
      </div>
      <p>
        <strong>{booking.reference}</strong>: {booking.quote.lines.map((line) => line.label).join(", ")}
      </p>
      <p>
        {booking.customer_name}, <a href={`mailto:${booking.customer_email}`}>{booking.customer_email}</a>, {booking.customer_phone}
      </p>
      {booking.location ? <p>{booking.location}{booking.access_notes ? `. ${booking.access_notes}` : ""}</p> : null}
      <p className="muted">
        Total {moneyFromCents(booking.total_cents)}. First payment {moneyFromCents(booking.due_now_cents)}. Balance{" "}
        {moneyFromCents(booking.balance_cents)}. Hold {moneyFromCents(booking.security_hold_cents)}.
      </p>
      {booking.payments.length ? (
        <ul className="plain-list">
          {booking.payments.map((payment) => (
            <li key={payment.id}>
              {kindNames[payment.kind]}: {describe(payment)}
              {payment.note ? `. ${payment.note}` : ""}
            </li>
          ))}
        </ul>
      ) : null}

      {confirmed || booking.status === "needs_review" ? (
        <fieldset className="admin-actions" disabled={busy}>
          <legend className="sr-only">Actions for {booking.reference}</legend>
          <div className="button-row">
            {canBalance ? (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => act({ action: "retry", bookingId: booking.id, kind: "balance" }, `Charge the ${moneyFromCents(booking.balance_cents)} balance now?`)}
              >
                {balance ? "Retry balance" : "Charge balance now"}
              </button>
            ) : null}
            {canHold ? (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => act({ action: "retry", bookingId: booking.id, kind: "security_hold" }, `Place the ${moneyFromCents(booking.security_hold_cents)} hold now?`)}
              >
                {hold ? "Retry hold" : "Place hold now"}
              </button>
            ) : null}
            {held ? (
              <button
                type="button"
                className="button"
                onClick={() => act({ action: "release", bookingId: booking.id }, "Release the hold? The customer will be emailed.")}
              >
                Release hold
              </button>
            ) : null}
            <button
              type="button"
              className="button button-secondary"
              onClick={() => act({ action: "cancel", bookingId: booking.id }, "Cancel this booking? This stops future charges and releases any hold. Any refund is done by hand in Stripe.")}
            >
              Cancel booking
            </button>
          </div>
          <details>
            <summary>Charge for damage or fees</summary>
            <div className="stack" style={{ marginTop: 14 }}>
              {held ? <DamageForm booking={booking} action="capture" title="Charge from hold" onDone={act} /> : null}
              <DamageForm booking={booking} action="extra" title="Charge saved card" onDone={act} />
            </div>
          </details>
        </fieldset>
      ) : null}
    </article>
  );
}

export function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/admin/api/bookings");
    if (!response.ok) throw new Error("failed");
    const data = (await response.json()) as { bookings: Booking[] };
    setBookings(data.bookings);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/admin/api/bookings")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("failed"))))
      .then((data: { bookings: Booking[] }) => {
        if (active) setBookings(data.bookings);
      })
      .catch(() => {
        if (active) setMessage("Bookings couldn't be loaded. Please refresh.");
      });
    return () => {
      active = false;
    };
  }, []);

  async function act(body: object, question: string) {
    if (!window.confirm(question)) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/admin/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { result?: string; error?: string };
      if (!response.ok) setMessage(data.error ?? "That didn't work.");
      else setMessage(data.result === "failed" ? "The card was declined. The customer has been emailed." : "Done.");
      await load();
    } catch {
      setMessage("We couldn't reach the server. Refresh before trying again, in case it went through.");
    }
    setBusy(false);
  }

  if (!bookings) return <p className="muted" role="status">{message || "Loading bookings..."}</p>;
  return (
    <>
      {message ? <p className="notice" role="status">{message}</p> : null}
      {bookings.length === 0 ? <p className="muted">No bookings yet.</p> : null}
      <div className="admin-list">
        {bookings.map((booking) => (
          <BookingCard key={booking.id} booking={booking} act={act} busy={busy} />
        ))}
      </div>
    </>
  );
}
