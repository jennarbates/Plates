import type { Metadata } from "next";
import { RentalCheckout } from "@/components/RentalCheckout";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return <RentalCheckout />;
}
