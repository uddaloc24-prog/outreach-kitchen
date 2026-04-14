import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign-in Error",
  description: "Something went wrong during sign-in.",
  robots: { index: false, follow: false },
};

export default function AuthErrorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
