import Link from "next/link";
import { Photo } from "@/components/Photo";
import { packageDetailsNote, packages } from "@/lib/catalog";
import { money } from "@/lib/site";

export function MenuLine({ name, price }: { name: string; price: string }) {
  return (
    <li>
      <span>{name}</span>
      <span className="leader" aria-hidden="true" />
      <strong>{price}</strong>
    </li>
  );
}

export function PackageCards() {
  return (
    <div className="card-grid">
      {packages.map((item) => (
        <article className="card menu-card" key={item.slug}>
          <Photo label={`the ${item.name} setup`} kind="plate" />
          <div className="card-body">
            <div className="menu-card-head">
              <h3>{item.name}</h3>
              <p className="menu-price">{money(item.price)}</p>
            </div>
            <ul className="plain-list">
              {item.includes.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="placeholder-text" style={{ marginBottom: 8 }}>{packageDetailsNote}</p>
            <Link className="button" href={`/book?package=${item.slug}`}>
              Book {item.name}
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
