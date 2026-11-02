import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/Photo";
import { kits, kitTypes } from "@/lib/catalog";

export const metadata: Metadata = { title: "Kits" };

export default function KitsPage() {
  return (
    <>
      <section className="container page-head">
        <h1>Parties, packed</h1>
        <p className="lead">Everything is packed and waiting. Collect it, enjoy the day and bring it back.</p>
      </section>
      <section className="container card-grid page-end">
        {kitTypes.map((type) => (
          <article className="card" key={type.slug}>
            <Photo label={type.name} kind="kit" />
            <div className="card-body">
              <h2 className="heading-small">{type.name}</h2>
              <p className="muted">{type.blurb}</p>
              <p className="small muted">{kits.filter((kit) => kit.kitType === type.slug).length} kits</p>
              <Link className="button" href={`/rentals/kits/${type.slug}`}>See {type.name.toLowerCase()}</Link>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
