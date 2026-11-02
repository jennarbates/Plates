import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ReleaseBooking } from "@/components/booking-ui";

export const metadata: Metadata = { title: "Payment cancelled", robots: { index: false } };

export default function BookingCancelledPage() {
  return (
    <section className="narrow page-head page-end stack">
      <Suspense>
        <ReleaseBooking />
      </Suspense>
      <h1 className="title-small">No charge, no problem.</h1>
      <p className="lead">You left before paying, so your booking wasn&apos;t made. Your cart is still here when you&apos;re ready.</p>
      <div className="button-row">
        <Link className="button" href="/date-setups">Book a setup</Link>
        <Link className="button button-secondary" href="/rentals/cart">Back to cart</Link>
      </div>
    </section>
  );
}
