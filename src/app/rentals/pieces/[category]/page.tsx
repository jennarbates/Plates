import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryBar } from "@/components/CategoryBar";
import { FilterGrid } from "@/components/catalog-ui";
import { categories, itemsInCategory, panFilterKeys, pieceFilterKeys } from "@/lib/catalog";

// Known paths are prerendered, so there is no streaming shell to show.
export const instant = false;

type Props = { params: Promise<{ category: string }> };

export function generateStaticParams() {
  return categories.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  return { title: categories.find((item) => item.slug === category)?.name };
}

export default async function CategoryPage({ params }: Props) {
  const { category: slug } = await params;
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();

  return (
    <section className="container page-head">
      <h1>{category.name}</h1>
      <div style={{ marginTop: 24 }}>
        <CategoryBar current={category.slug} />
        <FilterGrid
          items={itemsInCategory(category.slug)}
          filterKeys={category.slug === "baking-pans" ? panFilterKeys : pieceFilterKeys}
        />
      </div>
    </section>
  );
}
