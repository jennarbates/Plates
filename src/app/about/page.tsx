import type { Metadata } from "next";
import { Photo } from "@/components/Photo";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <section className="container flow">
      <div className="item-layout">
        <div className="stack">
          <h1 className="title-small">
            Estate sale finds, in bloom again
          </h1>
          <p className="lead">Every plate here has already had a long and lovely life. We find them at estate sales and give them another good party.</p>
          <p className="placeholder-text">[Your story to add: why vintage, how it started and who sets up each table]</p>
        </div>
        <Photo label="Kunal sourcing or styling a table" kind="teapot" caption />
      </div>
    </section>
  );
}
