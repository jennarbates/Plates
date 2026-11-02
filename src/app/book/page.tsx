import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingFromUrl } from "@/components/BookingFlow";

export const metadata: Metadata = { title: "Book a setup" };

export default function BookPage() {
  return (
    <Suspense
      fallback={
        <section className="container flow">
          <h1 className="title-small">Book a setup</h1>
        </section>
      }
    >
      <BookingFromUrl />
    </Suspense>
  );
}
