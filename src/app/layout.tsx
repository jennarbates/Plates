import type { Metadata } from "next";
import { EB_Garamond, Pinyon_Script } from "next/font/google";
import { ArtDefs } from "@/components/Photo";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StickyBook } from "@/components/StickyBook";
import { site } from "@/lib/site";
import "./globals.css";

const script = Pinyon_Script({
  variable: "--font-script",
  subsets: ["latin"],
  weight: "400",
});

const body = EB_Garamond({
  variable: "--font-body",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: { default: `${site.name} | ${site.tagline}`, template: `%s | ${site.name}` },
  description: `Styled vintage tea setups, kits and dish rentals in ${site.serviceArea}. We set it up, you show up, and we clear it all away.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${script.variable} ${body.variable}`}>
      <body>
        <ArtDefs />
        <p className="preview-banner">
          Preview only: nothing can be booked yet. The name, pictures, dates and some prices are placeholders.
        </p>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        <StickyBook />
      </body>
    </html>
  );
}
