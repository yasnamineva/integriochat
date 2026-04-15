import Link from "next/link";
import { LegalPageNav } from "@/components/LegalPageNav";

export const metadata = {
  title: "Privacy Policy — IntegrioChat",
};

const EFFECTIVE_DATE = "April 15, 2026";
const COMPANY = "IntegrioChat";
const CONTACT_EMAIL = "support@integriochat.com";
// Operating as an individual (физическо лице) in Bulgaria.
// Replace with your full name and address for GDPR compliance.
const OPERATOR = "IntegrioChat, operated by Yasmina Mineva, Sofia, Bulgaria";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-4">
        <LegalPageNav />
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mb-10 text-sm text-gray-400">Effective date: {EFFECTIVE_DATE}</p>

        <div className="prose prose-gray max-w-none text-sm leading-relaxed text-gray-700 [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-gray-900 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1">

          <p>
            {OPERATOR} (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;) operates the{" "}
            {COMPANY} platform and related services (the &ldquo;Service&rdquo;). This Privacy
            Policy explains how we collect, use, disclose, and protect personal data in
            accordance with the General Data Protection Regulation (GDPR) and applicable
            Bulgarian law.
          </p>

          <h2>1. Data We Collect</h2>
          <ul>
            <li>
              <strong>Account data</strong> — name, email address, and hashed password
              when you register.
            </li>
            <li>
              <strong>Billing data</strong> — payment and transaction metadata processed
              via Stripe. We store only subscription status and Stripe customer/subscription
              IDs; full card details are never stored by us.
            </li>
            <li>
              <strong>Chatbot content</strong> — website URLs you provide for training,
              custom Q&amp;A pairs, system prompts, and conversation messages.
            </li>
            <li>
              <strong>Usage data</strong> — token counts, message counts, and timestamps
              used for billing and analytics.
            </li>
            <li>
              <strong>Log data</strong> — IP addresses, browser types, and request logs
              retained for security and debugging.
            </li>
            <li>
              <strong>Cookies</strong> — a session cookie (NextAuth) to keep you signed
              in. We do not use advertising or third-party tracking cookies.
            </li>
          </ul>

          <h2>2. How We Use Your Data</h2>
          <ul>
            <li>To provide, operate, and improve the Service.</li>
            <li>To process payments and manage subscriptions.</li>
            <li>To send transactional emails (password resets, billing notices).</li>
            <li>To detect abuse, fraud, and security incidents.</li>
            <li>To comply with legal obligations.</li>
          </ul>
          <p>
            We do not sell your personal data to third parties. We do not use your content
            to train AI models beyond what is necessary to operate your chatbots.
          </p>

          <h2>3. Subprocessors</h2>
          <p>We share data only with the following processors under appropriate agreements:</p>
          <ul>
            <li><strong>Stripe</strong> — payment processing (United States)</li>
            <li><strong>OpenAI</strong> — AI inference for chatbot responses (United States)</li>
            <li><strong>Vercel</strong> — hosting and infrastructure (United States / EU)</li>
            <li><strong>Supabase</strong> — database hosting (EU region where available)</li>
            <li><strong>Resend</strong> — transactional email delivery</li>
            <li><strong>Upstash</strong> — rate limiting (IP addresses only, transiently)</li>
          </ul>

          <h2>4. International Data Transfers</h2>
          <p>
            Some subprocessors are based outside the European Economic Area (EEA). Where
            personal data is transferred internationally, we rely on Standard Contractual
            Clauses (SCCs) or other appropriate safeguards as required by GDPR Chapter V.
          </p>

          <h2>5. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active. You may request
            deletion at any time; data is removed within 30 days of a verified request.
            Billing records may be retained for up to 7 years to comply with Bulgarian
            accounting and tax law.
          </p>

          <h2>6. Security</h2>
          <p>
            Passwords are stored as bcrypt hashes. All data in transit is protected by
            TLS. We apply row-level tenant isolation so one customer&apos;s data cannot
            be accessed by another. We implement commercially reasonable technical and
            organizational safeguards; however, no system is completely secure.
          </p>

          <h2>7. Your Rights (GDPR)</h2>
          <p>
            As a data subject under GDPR, you have the right to:
          </p>
          <ul>
            <li><strong>Access</strong> — request a copy of your personal data.</li>
            <li><strong>Rectification</strong> — correct inaccurate or incomplete data.</li>
            <li><strong>Erasure</strong> — request deletion (&ldquo;right to be forgotten&rdquo;).</li>
            <li><strong>Restriction</strong> — request that we limit processing of your data.</li>
            <li><strong>Portability</strong> — receive your data in a machine-readable format.</li>
            <li><strong>Objection</strong> — object to processing based on legitimate interests.</li>
            <li>
              <strong>Lodge a complaint</strong> — with the Commission for Personal Data
              Protection (CPDP) in Bulgaria (www.cpdp.bg) or your local supervisory authority.
            </li>
          </ul>
          <p>
            To exercise any of these rights, email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-600 underline">
              {CONTACT_EMAIL}
            </a>
            . We will respond within 30 days.
          </p>

          <h2>8. Cookies</h2>
          <p>
            We use only essential cookies required for authentication and security. No
            advertising or analytics cookies are used. See our{" "}
            <Link href="/cookie" className="text-indigo-600 underline">Cookie Policy</Link>{" "}
            for details.
          </p>

          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. We will notify you by updating
            the effective date above and, for material changes, by email. Continued use
            of the Service after changes constitutes acceptance of the updated policy.
          </p>

          <h2>10. Contact</h2>
          <p>
            For privacy questions or to exercise your rights:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-600 underline">
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        <Link href="/tos" className="hover:underline">Terms of Service</Link>
        {" · "}
        <Link href="/cookie" className="hover:underline">Cookie Policy</Link>
        {" · "}
        <Link href="/refund" className="hover:underline">Refund Policy</Link>
        {" · "}
        <Link href="/aup" className="hover:underline">Acceptable Use</Link>
        {" · "}
        © {new Date().getFullYear()} {COMPANY}
      </footer>
    </div>
  );
}
