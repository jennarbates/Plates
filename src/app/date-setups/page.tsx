import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/Photo";
import { NextDates } from "@/components/availability-ui";
import { MenuLine, PackageCards } from "@/components/parts";
import { addOns, extraHourPrice, feb14Surcharge, packageDetailsNote, packages } from "@/lib/catalog";
import { money } from "@/lib/site";

export const metadata: Metadata = { title: "Date setups" };

const faqs = [
  ["How long do we get the table?", "A base package includes 2 hours on site. Each extra hour costs $25."],
  ["Where can you set up?", "Anywhere in the Amherst and Five College area that allows it. You need any park, campus or building permission."],
  ["Do I have to clean up?", "No. We deliver, arrange and collect everything."],
];

export default function DateSetupsPage() {
  return (
    <>
      <section className="container page-head">
        <p className="eyebrow">Date setups</p>
        <h1>
          Tea for two, all arranged
        </h1>
        <p className="lead">We set it up and style it, you take all the credit, and we clear it away.</p>
      </section>

      <section className="container">
        <NextDates />
      </section>

      <section className="section container" aria-labelledby="compare-heading">
        <h2 id="compare-heading" style={{ marginBottom: 28 }}>Choose your table</h2>
        <div className="only-phone">
          <PackageCards />
        </div>
        <div className="table-wrap only-wide">
          <table className="compare-table">
            <thead>
              <tr>
                <td />
                {packages.map((item) => (
                  <th scope="col" key={item.slug}>{item.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Price</th>
                {packages.map((item) => (
                  <td key={item.slug} className="menu-price">{money(item.price)}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">Every package</th>
                <td colSpan={3}>{packages[0].includes.join(". ")}.</td>
              </tr>
              <tr>
                <th scope="row">What it adds</th>
                <td colSpan={3} className="placeholder-text">{packageDetailsNote}</td>
              </tr>
              <tr>
                <th scope="row">Photo</th>
                {packages.map((item) => (
                  <td key={item.slug}><Photo label={`the ${item.name} setup`} /></td>
                ))}
              </tr>
              <tr>
                <td />
                {packages.map((item) => (
                  <td key={item.slug}>
                    <Link className="button" href={`/book?package=${item.slug}`}>Book</Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="section section-pink" aria-labelledby="addons-heading">
        <div className="container">
          <h2 id="addons-heading" style={{ marginBottom: 24 }}>A few little extras</h2>
          <ul className="menu-list menu-columns">
            {addOns.map((addOn) => (
              <MenuLine key={addOn.id} name={addOn.name} price={`+${money(addOn.price)}`} />
            ))}
            <MenuLine name="Extra hour" price={`+${money(extraHourPrice)}`} />
            <MenuLine name="February 14" price={`+${money(feb14Surcharge)}`} />
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="date-faq-heading">
        <div className="narrow">
          <h2 id="date-faq-heading" style={{ marginBottom: 16 }}>A few particulars</h2>
          {faqs.map(([question, answer]) => (
            <details className="faq-item" key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
