import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Kitchen Applications — the rules governing use of our platform.",
};

export default function TermsOfServicePage() {
  const lastUpdated = "April 14, 2026";

  return (
    <main className="min-h-screen bg-parchment">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/"
          className="text-[13px] font-body tracking-wide text-muted hover:text-ink transition-colors"
        >
          &larr; Back to Home
        </Link>

        <h1 className="mt-8 font-display text-4xl font-light text-ink">Terms of Service</h1>
        <p className="mt-2 text-[13px] text-muted font-body">Last updated: {lastUpdated}</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-ink/80 font-body">
          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">1. Agreement to Terms</h2>
            <p>
              By accessing or using Kitchen Applications (&quot;the Service&quot;), operated at
              kitchenapplications.com, you agree to be bound by these Terms of Service. If you do not
              agree to these terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">2. Description of Service</h2>
            <p>
              Kitchen Applications is an AI-powered platform that helps culinary professionals apply to
              restaurants worldwide. The Service provides AI-generated research briefs, personalised
              cover emails, email sending via your Gmail account, reply tracking, and automated
              follow-up generation.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">3. Account Registration</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must sign in with a valid Google account to use the Service.</li>
              <li>You are responsible for maintaining the security of your account.</li>
              <li>You must provide accurate and complete information.</li>
              <li>You must be at least 16 years old to use the Service.</li>
              <li>One person may not maintain more than one account.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">4. Subscriptions and Payments</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access to the Service requires a paid subscription (Starter, Pro, or Elite tier).</li>
              <li>Subscriptions are billed monthly through Dodo Payments.</li>
              <li>Each tier includes a specific number of application emails per month. Unused
                applications do not roll over.</li>
              <li>You may cancel your subscription at any time. Cancellation takes effect at the end of
                the current billing period.</li>
              <li>We reserve the right to change pricing with 30 days&apos; notice. Existing subscribers
                will be notified by email before any price change takes effect.</li>
              <li>Refunds are handled on a case-by-case basis. Contact us within 7 days of a charge
                if you believe it was made in error.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">5. Acceptable Use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service to send spam, unsolicited bulk emails, or harassing messages.</li>
              <li>Misrepresent your identity, qualifications, or experience in applications.</li>
              <li>Attempt to circumvent application limits or abuse the email sending functionality.</li>
              <li>Use automated scripts, bots, or scraping tools to access the Service.</li>
              <li>Reverse-engineer, decompile, or attempt to extract the source code of the Service.</li>
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws.</li>
              <li>Share your account credentials with others or allow multiple people to use one account.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">6. Gmail Integration</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>The Service sends emails through your Gmail account using OAuth 2.0 authorisation.</li>
              <li>Emails are only sent when you explicitly click &quot;Send&quot; or confirm a send action.
                We never send emails automatically without your approval.</li>
              <li>You are responsible for the content of emails sent through your account, even when
                generated by AI. Always review emails before sending.</li>
              <li>You may revoke Gmail access at any time through your Google Account settings.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">7. AI-Generated Content</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>The Service uses AI (Anthropic Claude) to generate research briefs and email drafts.</li>
              <li>AI-generated content is provided as a starting point. You are responsible for reviewing
                and editing all content before use.</li>
              <li>We do not guarantee the accuracy, completeness, or suitability of AI-generated content.</li>
              <li>AI-generated emails may occasionally contain errors or inaccuracies. Always verify
                facts before sending.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">8. Intellectual Property</h2>
            <p>
              The Service, including its design, code, and features, is owned by Kitchen Applications.
              Content you create using the Service (emails, profile information) remains yours. By using
              the Service, you grant us a limited licence to process your content as necessary to provide
              the Service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">9. Disclaimer of Warranties</h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of
              any kind, either express or implied. We do not guarantee that the Service will be
              uninterrupted, error-free, or secure. We do not guarantee that using the Service will
              result in job offers, interviews, or employment at any restaurant.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Kitchen Applications shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages, or any loss of profits
              or revenue, whether incurred directly or indirectly, or any loss of data, use, goodwill,
              or other intangible losses resulting from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">11. Termination</h2>
            <p>
              We may terminate or suspend your account at any time if you violate these Terms. Upon
              termination, your right to use the Service ceases immediately. You may terminate your
              account at any time by contacting us. Data deletion follows the timeline described in
              our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">12. Changes to Terms</h2>
            <p>
              We may modify these Terms at any time. We will notify users of material changes by posting
              updated Terms on this page and updating the &quot;Last updated&quot; date. Continued use
              of the Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">13. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India,
              without regard to conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">14. Contact Us</h2>
            <p>
              If you have questions about these Terms of Service, contact us at:{" "}
              <a href="mailto:uddaloc24@gmail.com" className="underline hover:text-ink">
                uddaloc24@gmail.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
