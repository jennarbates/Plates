import type { Metadata } from "next";
import { Photo } from "@/components/Photo";
import { packages } from "@/lib/catalog";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Gallery" };

export default function GalleryPage() {
  const tiles = packages.flatMap((item) => [
    `the ${item.name} table`,
    `${item.name} place setting`,
    `${item.name} details`,
  ]);
  return (
    <section className="container page-head page-end">
      <h1>From the album</h1>
      <p className="lead">Real tables only, coming soon. Photographs from the first test setups will be pressed in here.</p>
      <div className="gallery-grid" style={{ marginTop: 28 }}>
        {tiles.map((label, index) => (
          <Photo key={label} label={label} kind={index % 3 === 1 ? "cup" : index % 3 === 2 ? "kit" : "plate"} />
        ))}
      </div>
      <p className="muted" style={{ marginTop: 24 }}>Instagram feed goes here: {site.instagram}</p>
    </section>
  );
}
