import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Kitchen Applications — Uddaloc Ghosh",
  description: "Restaurant outreach machine for Michelin-starred kitchen applications.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&family=Karla:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-parchment text-ink font-body">
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
