import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Welcome",
  description:
    "Choose how you'll use Kitchen Applications — as a chef looking for positions or a restaurant looking to hire.",
};

export default function OnboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
