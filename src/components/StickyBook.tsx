"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function StickyBook() {
  const pathname = usePathname();
  const hidden = ["/book", "/booking", "/galentines", "/rentals", "/admin"];
  if (hidden.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return null;
  return (
    <div className="sticky-book">
      <Link href={pathname === "/date-setups" ? "/book" : "/date-setups"} className="button">
        Book a setup
      </Link>
    </div>
  );
}
