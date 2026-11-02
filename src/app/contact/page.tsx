import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <section className="narrow page-head page-end stack">
      <h1>Do write to us</h1>
      <p className="lead">Tell us the date, the occasion and who is coming. We do love the details.</p>
      <ContactForm />
      <p className="muted">
        {site.email} · {site.instagram}
        <br />
        Serving {site.serviceArea}.
      </p>
    </section>
  );
}
