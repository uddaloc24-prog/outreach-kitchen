import type { Metadata } from "next";
import { Cormorant_Garamond, Karla } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";
import { JsonLd } from "@/components/JsonLd";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const karla = Karla({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-karla",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://outreach-kitchen.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kitchen Applications — AI-Powered Michelin Restaurant Outreach",
    template: "%s — Kitchen Applications",
  },
  description:
    "Apply to 40+ Michelin-starred kitchens with AI-researched cover emails sent from your Gmail. Track replies, generate follow-ups, and land your dream stage.",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    siteName: "Kitchen Applications",
    title: "Kitchen Applications — AI-Powered Michelin Restaurant Outreach",
    description:
      "Apply to 40+ Michelin-starred kitchens with AI-researched cover emails sent from your Gmail. Track replies, generate follow-ups, and land your dream stage.",
    url: SITE_URL,
    images: [{ url: "/icon.svg", width: 512, height: 512, alt: "Kitchen Applications" }],
  },
  twitter: {
    card: "summary",
    title: "Kitchen Applications — AI-Powered Michelin Restaurant Outreach",
    description:
      "Apply to 40+ Michelin-starred kitchens with AI-researched cover emails. Track replies and land your dream stage.",
    images: ["/icon.svg"],
  },
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${karla.variable}`}>
      <body className="bg-parchment text-ink font-body">
        <JsonLd />
        <Providers>{children}</Providers>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#1A1714",
              color: "#F6F1E9",
              border: "1px solid #7A6E60",
              borderRadius: "0",
              fontFamily: "var(--font-karla)",
              fontSize: "13px",
            },
          }}
        />
      </body>
    </html>
  );
}
