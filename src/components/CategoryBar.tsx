import Link from "next/link";
import { categories } from "@/lib/catalog";

export function CategoryBar({ current }: { current?: string }) {
  return (
    <nav className="category-bar" aria-label="Categories">
      <Link className="chip" href="/rentals/pieces" aria-current={current ? undefined : "page"}>
        All pieces
      </Link>
      {categories.map((category) => (
        <Link
          key={category.slug}
          className="chip"
          href={`/rentals/pieces/${category.slug}`}
          aria-current={current === category.slug ? "page" : undefined}
        >
          {category.name}
        </Link>
      ))}
    </nav>
  );
}
