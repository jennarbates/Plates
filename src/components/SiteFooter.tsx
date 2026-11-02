import Link from "next/link";
import { Garland } from "@/components/Photo";
import { LogoText } from "@/components/Logo";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <>
      <Garland />
      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <h2 className="footer-name">
              <LogoText />
            </h2>
            <p className="footer-tag">May your table always be set.</p>
            <p className="small">Serving {site.serviceArea}.</p>
          </div>
          <div>
            <h3>Look around</h3>
            <ul>
              <li><Link href="/rentals">Rentals</Link></li>
              <li><Link href="/shop">Shop</Link></li>
              <li><Link href="/gallery">Gallery</Link></li>
              <li><Link href="/about">About</Link></li>
            </ul>
          </div>
          <div>
            <h3>A few particulars</h3>
            <ul>
              <li><Link href="/faq">Questions</Link></li>
              <li><Link href="/policies">Policies</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li>{site.instagram}</li>
              <li>{site.email}</li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
}
