import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upgrade Your Plan",
  description: "Unlock unlimited applications to Michelin-starred kitchens.",
  robots: { index: false, follow: false },
};

export default function UpgradeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
