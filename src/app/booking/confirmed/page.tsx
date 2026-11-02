import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingResult } from "@/components/booking-ui";

export const metadata: Metadata = { title: "Booking", robots: { index: false } };

export default function BookingConfirmedPage() {
  return (
    <section className="narrow page-head page-end stack">
      <Suspense fallback={<h1 className="title-small">Finishing up...</h1>}>
        <BookingResult />
      </Suspense>
    </section>
  );
}
