import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment Confirmed",
  description: "Your Kitchen Applications account is ready.",
  robots: { index: false, follow: false },
};

export default function CheckoutSuccessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
