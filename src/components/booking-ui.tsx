"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { clearCart } from "@/lib/cart";
import { formatDate, moneyFromCents } from "@/lib/site";

type BookingStatus = {
  status: "not_found" | "pending_payment" | "confirmed" | "expired" | "needs_review";
  reference?: string;
  kind?: "setup" | "rental";
  firstName?: string;
  email?: string;
  startDate?: string;
  endDate?: string;
  timeSlot?: string | null;
  dueNowCents?: number;
  balanceCents?: number;
  securityHoldCents?: number;
};

export function BookingResult() {
  const sessionId = useSearchParams().get("session_id");
  const [booking, setBooking] = useState<BookingStatus | null>(null);

  useEffect(() => {
    let active = true;
    let timer = 0;
    async function check() {
      let next: BookingStatus = { status: "pending_payment" };
      try {
        const response = await fetch(`/api/booking-status?session_id=${encodeURIComponent(sessionId ?? "")}`);
        next = (await response.json()) as BookingStatus;
      } catch {
        // Try again on the next round.
      }
      if (!active) return;
      setBooking(next);
      if (next.status === "pending_payment") timer = window.setTimeout(check, 3000);
      if (next.status === "confirmed") clearCart();
    }
    check();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [sessionId]);

  if (!booking || booking.status === "pending_payment") {
    return (
      <>
        <h1 className="title-small">Finishing up...</h1>
        <p className="lead" role="status">We&apos;re confirming your payment. This page updates on its own.</p>
      </>
    );
  }

  if (booking.status === "not_found") {
    return (
      <>
        <h1 className="title-small">We couldn&apos;t find that booking.</h1>
        <p className="lead">If you were charged, please contact us and we&apos;ll sort it out.</p>
        <Link className="button" href="/contact">Contact us</Link>
      </>
    );
  }

  if (booking.status !== "confirmed") {
    return (
      <>
        <h1 className="title-small">We&apos;re checking your booking.</h1>
        <p className="lead">
          Your booking needs a quick look from us before it&apos;s final. We&apos;ll contact you at {booking.email}. Your
          reference is {booking.reference}.
        </p>
      </>
    );
  }

  return (
    <>
      <p className="eyebrow">Booking confirmed</p>
      <h1 className="title-small">
        You&apos;re all set, {booking.firstName}
      </h1>
      <p className="lead">Keep your reference handy. We&apos;ll use it for anything about this booking.</p>
      <div className="panel">
        <dl className="summary-lines">
          <div>
            <dt>Reference</dt>
            <dd>{booking.reference}</dd>
          </div>
          <div>
            <dt>{booking.kind === "setup" ? "Date" : "Pickup"}</dt>
            <dd>
              {formatDate(booking.startDate ?? "")}
              {booking.timeSlot ? `, ${booking.timeSlot}` : ""}
            </dd>
          </div>
          {booking.kind === "rental" ? (
            <div>
              <dt>Return by</dt>
              <dd>{formatDate(booking.endDate ?? "")}</dd>
            </div>
          ) : null}
          <div>
            <dt>Paid today</dt>
            <dd>{moneyFromCents(booking.dueNowCents ?? 0)}</dd>
          </div>
          {booking.balanceCents ? (
            <div>
              <dt>{booking.kind === "setup" ? "Balance, 48 hours before" : "Balance at pickup"}</dt>
              <dd>{moneyFromCents(booking.balanceCents)}</dd>
            </div>
          ) : null}
          <div>
            <dt>Security hold, the day before</dt>
            <dd>{moneyFromCents(booking.securityHoldCents ?? 0)}</dd>
          </div>
        </dl>
      </div>
      <Link className="button" href="/">Back to home</Link>
    </>
  );
}

export function ReleaseBooking() {
  const booking = useSearchParams().get("booking");
  useEffect(() => {
    if (!booking) return;
    fetch("/api/checkout/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking }),
    }).catch(() => {});
  }, [booking]);
  return null;
}
