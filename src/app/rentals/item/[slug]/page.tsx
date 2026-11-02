import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/catalog-ui";
import { Photo } from "@/components/Photo";
import { AvailabilityCalendar } from "@/components/availability-ui";
import { allRentals, categories, findRental, kitTypes, photoKind, priceLabel } from "@/lib/catalog";
import { money } from "@/lib/site";

// Known paths are prerendered, so there is no streaming shell to show.
export const instant = false;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return allRentals.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: findRental(slug)?.name };
}

export default async function ItemPage({ params }: Props) {
  const { slug } = await params;
  const item = findRental(slug);
  if (!item) notFound();

  const back =
    item.kind === "kit"
      ? { href: `/rentals/kits/${item.kitType}`, label: kitTypes.find((type) => type.slug === item.kitType)!.name }
      : { href: `/rentals/pieces/${item.category}`, label: categories.find((category) => category.slug === item.category)!.name };

  return (
    <section className="container flow">
      <p className="small" style={{ marginBottom: 16 }}>
        <Link href={back.href}>Back to {back.label}</Link>
      </p>
      <div className="item-layout">
        <div className="item-photos">
          <Photo label={item.name} kind={photoKind(item)} caption />
          {item.kind === "piece" && item.category === "dinnerware" ? (
            <Photo label={`the backstamp of ${item.name}`} kind="plate" />
          ) : null}
        </div>
        <div className="item-buy">
          <h1 className="item-title">{item.name}</h1>
          <p className="price-large">
            {priceLabel(item)} <small>for 3 days</small>
          </p>
          <AddToCart item={item} />
          <dl className="detail-list">
            <div>
              <dt>Security deposit</dt>
              <dd>{item.deposit === null ? "$50 to $150, by order size" : money(item.deposit)}</dd>
            </div>
            <div>
              <dt>Replacement price</dt>
              <dd>{item.replacement}</dd>
            </div>
            {item.kind === "piece" ? (
              <div>
                <dt>On hand</dt>
                <dd>{item.quantity}</dd>
              </div>
            ) : null}
            {item.kind === "kit" && item.serves ? (
              <div>
                <dt>Serves</dt>
                <dd>{item.serves}</dd>
              </div>
            ) : null}
          </dl>

          {item.kind === "kit" ? (
            <div className="stack">
              <h2 className="heading-small">What&apos;s inside</h2>
              <ul className="plain-list">
                {item.contents.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {item.howItWorks ? <p className="muted">{item.howItWorks}</p> : null}
              {item.kitType === "bake" ? (
                <p className="placeholder-text">[Recipe card preview to add]</p>
              ) : null}
              <p className="small muted">
                {item.kitType === "bake"
                  ? "Pans are hand wash only. Plates and serving pieces never go in the oven. Recipe cards and paper extras are yours to keep."
                  : "No dishwasher, microwave, oven or freezer for any piece. Scrape off food before you return it."}
              </p>
            </div>
          ) : null}

          {item.kind === "pan" ? (
            <div className="callout">
              <h2 className="heading-small">Care tag</h2>
              <p className="small">Material: <span className="placeholder-text">[to add as the pan comes in]</span></p>
              <p className="small">Max oven temperature: <span className="placeholder-text">[to add as the pan comes in]</span></p>
              <p className="small">Hand wash only. Return clean, dry and free of batter.</p>
            </div>
          ) : null}

          {item.kind === "piece" ? <p className="small muted">{item.condition}</p> : null}

          <AvailabilityCalendar slug={item.slug} />
          <p className="small muted">
            Vintage pieces may contain lead. <Link href="/policies#addendum-b">Read Addendum B</Link> or ask us about modern swaps.
          </p>
        </div>
      </div>
    </section>
  );
}
