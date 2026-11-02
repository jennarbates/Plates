import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FilterGrid } from "@/components/catalog-ui";
import { kits, kitTypes } from "@/lib/catalog";

// Known paths are prerendered, so there is no streaming shell to show.
export const instant = false;

type Props = { params: Promise<{ type: string }> };

export function generateStaticParams() {
  return kitTypes.map((type) => ({ type: type.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;
  return { title: kitTypes.find((item) => item.slug === type)?.name };
}

export default async function KitTypePage({ params }: Props) {
  const { type: slug } = await params;
  const type = kitTypes.find((item) => item.slug === slug);
  if (!type) notFound();

  return (
    <section className="container page-head">
      <h1>{type.name}</h1>
      <p className="lead">{type.blurb}</p>
      <nav className="category-bar" aria-label="Kit types" style={{ marginTop: 24 }}>
        {kitTypes.map((item) => (
          <Link
            key={item.slug}
            className="chip"
            href={`/rentals/kits/${item.slug}`}
            aria-current={item.slug === type.slug ? "page" : undefined}
          >
            {item.name}
          </Link>
        ))}
      </nav>
      <FilterGrid items={kits.filter((kit) => kit.kitType === type.slug)} filterKeys={type.filterKeys} />
    </section>
  );
}
