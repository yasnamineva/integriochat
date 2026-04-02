import Link from "next/link";
import { LegalPageNav } from "@/components/LegalPageNav";

export const metadata = {
  title: "Terms of Service — IntegrioChat",
};

const EFFECTIVE_DATE = "January 1, 2025";
const COMPANY = "IntegrioChat";
const CONTACT_EMAIL = "hello@integriochat.com";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-4">
        <LegalPageNav />
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Terms of Service</h1>
        <p className="mb-10 text-sm text-gray-400">Effective date: {EFFECTIVE_DATE}</p>

        <div className="prose prose-gray max-w-none text-sm leading-relaxed text-gray-700 [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-gray-900 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1">

          <h2>1. Acceptance</h2>
          <p>
            By accessing or using {COMPANY} (&ldquo;the Service&rdquo;), you agree to be bound
            by these Terms. If you do not agree, do not use the Service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            {COMPANY} provides a platform for creating, training, and embedding AI-powered
            chat assistants on your website. The Service includes a dashboard, an
            embeddable widget, and associated APIs.
          </p>

          <h2>3. Accounts</h2>
          <p>
            You must be at least 18 years old to create an account. You are responsible
            for maintaining the confidentiality of your credentials and for all activity
            under your account.
          </p>

          <h2>4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service to generate or distribute illegal, harmful, or deceptive content.</li>
            <li>Attempt to reverse-engineer, scrape, or copy the Service infrastructure.</li>
            <li>Violate any applicable law or third-party rights.</li>
            <li>Introduce malware or interfere with Service availability.</li>
          </ul>

          <h2>5. Subscription and Billing</h2>
          <p>
            Paid plans are billed through Stripe. Subscription fees are charged at the
            start of each billing period and are non-refundable except where required by
            law. Usage-based charges are billed at the end of each period based on actual
            consumption. You may cancel at any time; cancellation takes effect at the
            end of the current billing period.
          </p>

          <h2>6. Intellectual Property</h2>
          <p>
            You retain ownership of all content you upload or create. You grant
            {" "}{COMPANY} a limited license to process that content solely to provide the
            Service. We retain all rights to the Service itself.
          </p>

          <h2>7. Data and Privacy</h2>
          <p>
            Our collection and use of personal information is described in our{" "}
            <Link href="/privacy" className="text-indigo-600 underline">
              Privacy Policy
            </Link>
            , which is incorporated by reference.
          </p>

          <h2>8. Disclaimers</h2>
          <p>
            THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTIES OF ANY KIND. AI
            responses may be inaccurate. You are responsible for reviewing chatbot output
            before deploying it to end users.
          </p>

          <h2>9. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, {COMPANY.toUpperCase()} SHALL NOT BE LIABLE
            FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM
            YOUR USE OF THE SERVICE.
          </p>

          <h2>10. Changes</h2>
          <p>
            We may update these Terms from time to time. Continued use of the Service
            after changes constitutes acceptance of the new Terms.
          </p>

          <h2>11. Contact</h2>
          <p>
            Questions? Email us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-600 underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
        {" · "}
        © {new Date().getFullYear()} {COMPANY}
      </footer>
    </div>
  );
}
