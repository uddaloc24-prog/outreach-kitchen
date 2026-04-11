import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Job Board",
  description:
    "Browse active chef positions at Michelin-starred restaurants worldwide. Filter by star rating and country, then apply directly.",
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
