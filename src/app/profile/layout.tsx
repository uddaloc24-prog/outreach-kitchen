import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Profile",
  description:
    "Manage your chef profile, CV, and experience details. Your profile is attached to every application you send.",
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
