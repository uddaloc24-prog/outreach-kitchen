import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Choose a plan for Kitchen Applications — free trial included. Unlock unlimited AI-powered applications to Michelin-starred restaurants.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
