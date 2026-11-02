import type { Metadata } from "next";
import { CategoryBar } from "@/components/CategoryBar";
import { FilterGrid } from "@/components/catalog-ui";
import { pieceFilterKeys, pieces, pans } from "@/lib/catalog";

export const metadata: Metadata = { title: "All pieces" };

export default function AllPiecesPage() {
  return (
    <section className="container page-head">
      <h1>All the pretty things</h1>
      <p className="lead">Choose exactly what your table needs. Every rental runs 3 days.</p>
      <div style={{ marginTop: 24 }}>
        <CategoryBar />
        <FilterGrid items={[...pieces, ...pans]} filterKeys={pieceFilterKeys} />
      </div>
    </section>
  );
}
