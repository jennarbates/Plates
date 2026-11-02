import type { Metadata } from "next";
import { GroupCalculator } from "@/components/GroupCalculator";
import { Photo } from "@/components/Photo";
import { NextDates } from "@/components/availability-ui";
import { groupPage } from "@/lib/site";

export const metadata: Metadata = { title: groupPage.title };

export default function GroupsPage() {
  return (
    <section className="container flow">
      <div className="group-layout">
        <div className="stack group-intro">
          <p className="eyebrow">4 to 10 guests</p>
          <h1>{groupPage.title}</h1>
          <p className="lead">One long vintage table for all your favorite people. Tell us who is coming and see the total.</p>
        </div>
        <div className="group-calculator">
          <GroupCalculator />
        </div>
        <div className="stack group-extras">
          <Photo label="a full group table with teacups" kind="tier" />
          <NextDates />
        </div>
      </div>
    </section>
  );
}
