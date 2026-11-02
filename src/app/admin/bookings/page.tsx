import type { Metadata } from "next";
import { AdminBookings } from "@/components/AdminBookings";

export const metadata: Metadata = { title: "Bookings", robots: { index: false } };

export default function AdminBookingsPage() {
  return (
    <section className="container page-head page-end stack">
      <h1 className="title-small">Bookings</h1>
      <AdminBookings />
    </section>
  );
}
