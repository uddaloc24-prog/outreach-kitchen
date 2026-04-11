export function JsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Kitchen Applications",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://outreach-kitchen.vercel.app",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "AI-powered outreach platform for chefs applying to Michelin-starred restaurants. Research kitchens, generate personalised cover emails, and track applications.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free trial with 1 application included",
    },
    featureList: [
      "AI restaurant research briefs",
      "Personalised cover email generation",
      "Gmail integration for sending",
      "Reply tracking and follow-up automation",
      "Public chef profile pages",
      "Employer application inbox",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
