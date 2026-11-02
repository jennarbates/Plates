import type { Metadata } from "next";
import Link from "next/link";
import { faqGroups } from "@/lib/policies";

export const metadata: Metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <section className="narrow page-head page-end">
      <h1>A few particulars</h1>
      <aside className="callout" style={{ marginTop: 24 }}>
        <h2 className="heading-small">About vintage dishes</h2>
        <p>
          Old china is beautiful, but it may contain lead or cadmium, and we don&apos;t test for it.{" "}
          <Link href="/policies#addendum-b">Read Addendum B</Link> before you book. We can swap in modern plates whenever
          you prefer.
        </p>
      </aside>
      {faqGroups.map((group) => (
        <section key={group.title} style={{ marginTop: 36 }}>
          <h2 className="heading-small" style={{ marginBottom: 8 }}>{group.title}</h2>
          {group.items.map((item) => (
            <details className="faq-item" key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </section>
      ))}
    </section>
  );
}
