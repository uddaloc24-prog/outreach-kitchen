import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Track your Michelin kitchen applications — see sent emails, replies, and follow-ups due across all your outreach.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
