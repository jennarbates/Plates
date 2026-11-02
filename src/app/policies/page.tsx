import type { Metadata } from "next";
import { agreementPoints } from "@/lib/policies";

export const metadata: Metadata = { title: "Policies" };

const replacementRows = [
  ["1. Everyday", "Glassware, ramekins, flatware, common plates", "$12 per piece"],
  ["2. Fine china", "Matched plates, standard cups and saucers", "$35 per piece, $45 per cup and saucer set"],
  ["3. Premium china", "Named patterns with high resale value", "Current replacement retail"],
  ["4. Serving and collector", "Teapots, pitchers, cut crystal, silverplate trays", "Priced one by one on your order form"],
  ["Pan 1. Standard", "Heart, springform, mini muffin, number and letter pans", "$25 per pan"],
  ["Pan 2. Vintage specialty", "Bundts, madeleine pans, molds, tart pans", "$40 per pan"],
  ["Pan 3. Premium and sets", "Tiered sets, cast aluminum, rare pieces", "$60 to $90, on your order form"],
];

export default function PoliciesPage() {
  return (
    <section className="narrow page-head page-end stack">
      <h1>Policies</h1>
      <p className="notice">
        This is a plain language summary of a draft. Amounts may change, and the full documents will be downloadable here
        once the attorney signs off.
      </p>

      <h2 id="agreement">Rental Agreement</h2>
      <ul className="plain-list">
        {agreementPoints.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>

      <h2 id="appendix-a">Appendix A: Replacement prices</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Tier</th>
              <th scope="col">Covers</th>
              <th scope="col">Price</th>
            </tr>
          </thead>
          <tbody>
            {replacementRows.map(([tier, covers, price]) => (
              <tr key={tier}>
                <th scope="row">{tier}</th>
                <td>{covers}</td>
                <td>{price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 id="addendum-b">Addendum B: Lead and food safety</h2>
      <p><strong>We do not test rental items for lead or other metals, and we don&apos;t claim any vintage item is lead free.</strong></p>
      <ul className="plain-list">
        <li>Ceramic and glass made before 1971 may contain lead or cadmium in the glaze, decoration or gold trim. Some later imports may too.</li>
        <li>Risk is higher with acidic foods and drinks, hot liquids, long contact and worn or crazed glaze.</li>
        <li>Children and people who are or may become pregnant are more sensitive to lead.</li>
        <li>To lower risk, serve food briefly, don&apos;t store food or drinks in rental items, and use plates as chargers under modern plates. We can swap in modern pieces on request.</li>
        <li>We rent only metal pans and oven safe glass in sound condition. Line uncoated aluminum with parchment for acidic recipes, and follow the temperature on each pan&apos;s tag.</li>
      </ul>
    </section>
  );
}
