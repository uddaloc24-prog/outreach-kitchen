import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Kitchen Applications — how we collect, use, and protect your data.",
};

export default function PrivacyPolicyPage() {
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

        <h1 className="mt-8 font-display text-4xl font-light text-ink">Privacy Policy</h1>
        <p className="mt-2 text-[13px] text-muted font-body">Last updated: {lastUpdated}</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-ink/80 font-body">
          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">1. Introduction</h2>
            <p>
              Kitchen Applications (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the website at
              kitchenapplications.com. This Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect the following information when you use our service:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Account information:</strong> Your name and email address provided through Google
                sign-in.
              </li>
              <li>
                <strong>Profile information:</strong> Professional details you voluntarily provide, such as
                your CV, culinary experience, and career preferences.
              </li>
              <li>
                <strong>Email data:</strong> When you authorise Gmail access, we use your Gmail account
                solely to send application emails and follow-ups on your behalf. We do not read, store,
                or process any other emails in your inbox.
              </li>
              <li>
                <strong>Usage data:</strong> Information about how you interact with our service, including
                pages visited and features used.
              </li>
              <li>
                <strong>Payment information:</strong> Subscription billing is handled by our payment
                processor (Dodo Payments). We do not store your credit card or bank details.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and maintain our service, including generating personalised cover emails and
                research briefs.</li>
              <li>To send application emails and follow-ups via your Gmail account, only when you
                explicitly initiate the action.</li>
              <li>To track the status of your outreach (sent, replied, follow-up due).</li>
              <li>To process your subscription and manage your account.</li>
              <li>To improve and optimise our service.</li>
              <li>To communicate with you about your account or service updates.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">4. Google API Services</h2>
            <p>
              Our use and transfer of information received from Google APIs adheres to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-ink"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements. Specifically:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>We only request access to Gmail scopes necessary for sending emails on your behalf.</li>
              <li>We do not use Gmail data for advertising or marketing purposes.</li>
              <li>We do not sell or transfer Gmail data to third parties.</li>
              <li>We do not allow humans to read your email content, except where you have given explicit
                consent, where it is required for security purposes, or to comply with applicable law.</li>
              <li>Gmail OAuth tokens are stored securely and encrypted at rest in our database.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">5. Data Storage and Security</h2>
            <p>
              Your data is stored securely using Supabase (hosted on AWS infrastructure). We implement
              industry-standard security measures including encrypted connections (TLS/SSL),
              row-level security policies, and secure token storage. However, no method of electronic
              transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">6. Data Sharing</h2>
            <p className="mb-3">We do not sell your personal data. We may share information with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Service providers:</strong> Third-party services that help us operate (Supabase for
                database, Anthropic for AI generation, Dodo Payments for billing, Google for
                authentication and email sending).
              </li>
              <li>
                <strong>Legal requirements:</strong> If required by law, regulation, or legal process.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">7. Data Retention</h2>
            <p>
              We retain your account data for as long as your account is active. You may request deletion
              of your account and associated data at any time by contacting us. Upon deletion, we remove
              your personal data within 30 days, except where retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">8. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your data.</li>
              <li>Revoke Gmail access at any time through your{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-ink"
                >
                  Google Account permissions
                </a>.
              </li>
              <li>Cancel your subscription at any time.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">9. Cookies</h2>
            <p>
              We use essential cookies for authentication and session management. We do not use
              advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">10. Children&apos;s Privacy</h2>
            <p>
              Our service is not intended for individuals under the age of 16. We do not knowingly
              collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material
              changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-light text-ink mb-3">12. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or wish to exercise your data rights,
              contact us at:{" "}
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
