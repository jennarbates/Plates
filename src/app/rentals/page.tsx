import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/Photo";
import { CategoryBar } from "@/components/CategoryBar";
import { kitTypes } from "@/lib/catalog";

export const metadata: Metadata = { title: "Rentals" };

export default function RentalsPage() {
  return (
    <>
      <section className="container page-head">
        <h1>
          Your party, our pretty plates
        </h1>
        <p className="lead">Borrow one perfect teacup or a whole table. Pick a date, grab it locally and bring it back when the party&apos;s over.</p>
      </section>
      <section className="container path-grid page-end">
        <article className="card">
          <Photo label="vintage teaware" kind="teapot" />
          <div className="card-body">
            <h2>The pretty things</h2>
            <p className="muted">Every plate, cup and pan, one at a time. Take exactly what you need.</p>
            <Link className="button" href="/rentals/pieces">Browse all pieces</Link>
          </div>
        </article>
        <article className="card">
          <Photo label="a packed rental kit" kind="kit" />
          <div className="card-body">
            <h2>Parties, packed</h2>
            <p className="muted">Ready-made kits for baking, hosting or doing something fun together.</p>
            <Link className="button" href="/rentals/kits">See all kits</Link>
          </div>
        </article>
      </section>
      <section className="section section-sage">
        <div className="container">
          <h2 style={{ marginBottom: 16 }}>Browse by shelf</h2>
          <CategoryBar />
          <h2 style={{ margin: "28px 0 16px" }}>Or choose a kit</h2>
          <div className="category-bar">
            {kitTypes.map((type) => (
              <Link key={type.slug} className="chip" href={`/rentals/kits/${type.slug}`}>{type.name}</Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
