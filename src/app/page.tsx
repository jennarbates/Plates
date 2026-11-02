import Link from "next/link";
import { Bouquet, Garland, Photo, TableScene, type PhotoKind } from "@/components/Photo";
import { PackageCards } from "@/components/parts";
import { kits } from "@/lib/catalog";
import { faqGroups } from "@/lib/policies";
import { money } from "@/lib/site";

const chapters = [
  ["Chapter the First", "You choose a table", "Pick a package and a date. It takes about 3 minutes."],
  ["Chapter the Second", "We lay it out", "Vintage china, candlelight and every small detail."],
  ["Chapter the Third", "You arrive", "Sit down, pour the tea and enjoy the afternoon."],
  ["Chapter the Last", "We clear it away", "Everything is packed up, as if by magic."],
];

const goodToKnow = [
  ["The china is truly old", "Faint gold wear and tiny marks are part of the charm, and you are never charged for them."],
  ["Accidents do happen", "Add the damage waiver for 10% of the rental fee. It covers up to 2 everyday or fine china pieces."],
  ["Hosting at home?", "Rent a single teacup or a whole kit, and collect it locally."],
  ["Candles, but no flames", "Every setup glows with LED candles, so your RA can rest easy."],
];

const featuredKits = ["galentines-heart", "tea-party-madeleine", "bundt-brunch"].map(
  (slug) => kits.find((kit) => kit.slug === slug)!,
);

const faqPreview = faqGroups.flatMap((group) => group.items).filter((item) => item.preview);

const album: [string, PhotoKind, string][] = [
  ["strawberries and daisies", "kit", "Strawberries & daisies"],
  ["a teacup on the lawn", "cup", "An afternoon cup"],
  ["a floral plate", "plate", "The good china"],
  ["a tiered stand", "tier", "Two tiers of sweetness"],
  ["a floral teapot", "teapot", "Shall I pour?"],
];

export default function HomePage() {
  return (
    <>
      <section className="container hero">
        <div className="hero-copy">
          <Bouquet className="hero-bouquet" />
          <p className="eyebrow">Vintage tea setups &amp; rentals</p>
          <h1>A little tea party, set up for you</h1>
          <p className="lead">
            Real vintage china and candlelight, laid out wherever you would like it. You arrive, you enjoy it, and we
            clear it all away.
          </p>
          <div className="button-row">
            <Link className="button" href="/date-setups">Book a setup</Link>
            <Link className="button button-secondary" href="/rentals/kits/bake">Rent a bake kit</Link>
          </div>
        </div>
        <div className="hero-art">
          <TableScene label="a tea table on the lawn" />
        </div>
      </section>

      <Garland />

      <section className="section container" aria-labelledby="how-heading">
        <h2 id="how-heading" className="centered">How it unfolds</h2>
        <ol className="chapters">
          {chapters.map(([chapter, title, text]) => (
            <li key={chapter}>
              <p className="eyebrow">{chapter}</p>
              <h3>{title}</h3>
              <p className="muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section section-pink" aria-labelledby="packages-heading">
        <div className="container">
          <div className="section-head">
            <h2 id="packages-heading">Choose your table</h2>
            <Link href="/date-setups">Compare all three</Link>
          </div>
          <PackageCards />
        </div>
      </section>

      <section className="section section-sage" aria-labelledby="group-heading">
        <div className="container feature">
          <div className="arch">
            <Photo label="a table for friends with a tiered stand" kind="tier" />
          </div>
          <div className="feature-copy">
            <p className="eyebrow">Galentine&apos;s &amp; groups</p>
            <h2 id="group-heading">Gather your dearest friends</h2>
            <p className="lead">One long table for 4 to 10 guests, at $30 per guest. No one lifts a finger, and no one washes a dish.</p>
            <Link className="button" href="/galentines">Plan a Galentine&apos;s</Link>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="kits-heading">
        <div className="container">
          <div className="section-head">
            <div>
              <h2 id="kits-heading">Bake kits from $12</h2>
              <p className="lead">A vintage pan, the pretty plates and a recipe card to keep. You bring the butter.</p>
            </div>
          </div>
          <div className="card-grid">
            {featuredKits.map((kit, index) => (
              <article className="card" key={kit.slug}>
                <Photo label={kit.name} kind={index === 2 ? "pan" : "kit"} />
                <div className="card-body">
                  <h3>
                    <Link className="card-title" href={`/rentals/item/${kit.slug}`}>{kit.name}</Link>
                  </h3>
                  <p className="price">{money(kit.price ?? 0)} <small>for 3 days</small></p>
                </div>
              </article>
            ))}
          </div>
          <div className="link-row">
            <Link href="/rentals/kits/bake">See all kits</Link>
            <Link href="/rentals/kits/event">Event kits</Link>
            <Link href="/rentals/kits/activity">Activity kits</Link>
            <Link href="/rentals/pieces">All pieces</Link>
          </div>
        </div>
      </section>

      <section className="section section-butter" aria-labelledby="gallery-heading">
        <div className="container">
          <div className="section-head">
            <h2 id="gallery-heading">From the album</h2>
            <Link href="/gallery">See the gallery</Link>
          </div>
          <div className="collage">
            {album.map(([label, kind, note]) => (
              <figure className="polaroid" key={label}>
                <Photo label={label} kind={kind} />
                <figcaption className="polaroid-note">{note}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="section container" aria-labelledby="trust-heading">
        <h2 id="trust-heading" className="sr-only">Good to know</h2>
        <ul className="trust-row">
          {goodToKnow.map(([title, text]) => (
            <li key={title}>
              <h3>{title}</h3>
              <p className="muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="section section-pink" aria-labelledby="faq-heading">
        <div className="narrow">
          <div className="section-head">
            <h2 id="faq-heading">A few particulars</h2>
            <Link href="/faq">Read them all</Link>
          </div>
          {faqPreview.map((item) => (
            <details className="faq-item" key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
