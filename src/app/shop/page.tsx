import type { Metadata } from "next";
import { Photo } from "@/components/Photo";
import { shopPieces } from "@/lib/catalog";

export const metadata: Metadata = { title: "Shop" };

export default function ShopPage() {
  return (
    <section className="container page-head page-end">
      <h1>To keep forever</h1>
      <p className="lead">A few collector pieces looking for a permanent home. Sales happen on eBay, and anything here is off the rental shelf.</p>
      <div className="card-grid" style={{ marginTop: 28 }}>
        {shopPieces.map((item) => (
          <article className="card" key={item.slug}>
            <Photo label={item.name} kind="cup" />
            <div className="card-body">
              <p className="tag">{item.maker}</p>
              <h2 className="heading-small">{item.name}</h2>
              <p className="placeholder-text">[Price and condition to add when listed]</p>
              <button type="button" className="button" disabled>eBay link to add</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
