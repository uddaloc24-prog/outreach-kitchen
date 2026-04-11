import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Employer Inbox",
  description:
    "Review applications from chefs worldwide. Track candidates, mark interest, and manage your restaurant's hiring pipeline.",
};

export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
