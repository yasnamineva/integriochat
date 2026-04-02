import Link from "next/link";
import { LegalPageNav } from "@/components/LegalPageNav";

export const metadata = {
  title: "Privacy Policy — IntegrioChat",
};

const EFFECTIVE_DATE = "January 1, 2025";
const COMPANY = "IntegrioChat";
const CONTACT_EMAIL = "hello@integriochat.com";

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

          <h2>1. What we collect</h2>
          <p>When you use {COMPANY} we collect:</p>
          <ul>
            <li>
              <strong>Account data</strong> — name, email address, company name,
              and hashed password when you register.
            </li>
            <li>
              <strong>Chatbot content</strong> — website URLs you provide for
              training, custom Q&amp;A pairs, and conversation messages.
            </li>
            <li>
              <strong>Usage data</strong> — token counts, message counts, and
              timestamps to power billing and analytics.
            </li>
            <li>
              <strong>Billing data</strong> — handled by Stripe; we store only
              subscription status and Stripe customer/subscription IDs.
            </li>
            <li>
              <strong>Log data</strong> — IP addresses, browser types, and request
              logs for security and debugging.
            </li>
          </ul>

          <h2>2. How we use it</h2>
          <ul>
            <li>To provide, operate, and improve the Service.</li>
            <li>To process payments and prevent fraud.</li>
            <li>To send transactional emails (password resets, billing notices).</li>
            <li>To enforce our Terms of Service.</li>
          </ul>
          <p>
            We do not sell your data to third parties or use it to train AI models
            beyond what is necessary to operate your chatbots.
          </p>

          <h2>3. Data sharing</h2>
          <p>We share data only with:</p>
          <ul>
            <li><strong>Stripe</strong> — payment processing.</li>
            <li><strong>OpenAI</strong> — AI inference for chatbot responses.</li>
            <li><strong>Resend</strong> — transactional email delivery.</li>
            <li><strong>Upstash</strong> — rate limiting (IP addresses only, briefly).</li>
            <li>Service providers under confidentiality agreements.</li>
          </ul>

          <h2>4. Data retention</h2>
          <p>
            We retain your data for as long as your account is active. You may
            delete your account at any time; data is removed within 30 days.
            Billing records may be retained longer to comply with legal obligations.
          </p>

          <h2>5. Security</h2>
          <p>
            Passwords are stored as bcrypt hashes. Data in transit uses TLS.
            We apply row-level tenant isolation so one customer&apos;s data cannot
            be accessed by another.
          </p>

          <h2>6. Your rights</h2>
          <p>
            Depending on where you live, you may have the right to access, correct,
            or delete your personal data, or to object to its processing. To exercise
            these rights, email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-600 underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>

          <h2>7. Cookies</h2>
          <p>
            We use a session cookie (NextAuth) to keep you signed in. We do not
            use advertising or tracking cookies.
          </p>

          <h2>8. Changes</h2>
          <p>
            We may update this policy from time to time and will notify you by
            updating the effective date above.
          </p>

          <h2>9. Contact</h2>
          <p>
            Privacy questions:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-600 underline">
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        <Link href="/tos" className="hover:underline">Terms of Service</Link>
        {" · "}
        © {new Date().getFullYear()} {COMPANY}
      </footer>
    </div>
  );
}
