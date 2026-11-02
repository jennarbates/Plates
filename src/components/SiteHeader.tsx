"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { LogoText } from "@/components/Logo";
import { useCart } from "@/lib/cart";
import { groupPage } from "@/lib/site";

const infoLinks = [
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/policies", label: "Policies" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const cart = useCart();
  const count = cart.reduce((total, line) => total + line.quantity, 0);

  useEffect(() => {
    function closeInfoMenu(event: PointerEvent) {
      header.current?.querySelectorAll("details[open]").forEach((details) => {
        if (!details.contains(event.target as Node)) details.removeAttribute("open");
      });
    }
    document.addEventListener("pointerdown", closeInfoMenu);
    return () => document.removeEventListener("pointerdown", closeInfoMenu);
  }, []);

  function closeAfterLink(event: MouseEvent<HTMLElement>) {
    if (!(event.target as HTMLElement).closest("a")) return;
    setOpen(false);
    event.currentTarget.querySelector("details")?.removeAttribute("open");
  }

  return (
    <header className="site-header" ref={header}>
      <div className="container">
        <div className="header-row">
          <Link href="/" className="logo">
            <LogoText />
          </Link>
          <nav aria-label="Main" className="main-nav desktop-nav" onClick={closeAfterLink}>
            <NavLinks />
          </nav>
          <div className="header-actions">
            <Link href="/rentals/cart" className="cart-link">
              Cart
              {count > 0 ? <span className="cart-count">{count}</span> : null}
            </Link>
            <Link href="/date-setups" className="button header-book">
              Book a setup
            </Link>
            <button
              type="button"
              className="menu-button"
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen(!open)}
            >
              {open ? "Close" : "Menu"}
            </button>
          </div>
        </div>
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className={`main-nav mobile-nav${open ? " open" : ""}`}
          onClick={closeAfterLink}
        >
          <NavLinks />
        </nav>
      </div>
    </header>
  );
}

function NavLinks() {
  const pathname = usePathname();
  const current = (href: string) => (pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined);
  return (
    <>
      <Link href="/date-setups" aria-current={current("/date-setups")}>Date setups</Link>
      <Link href="/galentines" aria-current={current("/galentines")}>{groupPage.name}</Link>
      <Link href="/rentals" aria-current={current("/rentals")}>Rentals</Link>
      <Link href="/shop" aria-current={current("/shop")}>Shop</Link>
      <details className="nav-group">
        <summary>Info</summary>
        <div className="nav-group-links">
          {infoLinks.map((link) => (
            <Link key={link.href} href={link.href} aria-current={current(link.href)}>
              {link.label}
            </Link>
          ))}
        </div>
      </details>
    </>
  );
}
