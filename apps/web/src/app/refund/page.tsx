import Link from "next/link";
import { LegalPageNav } from "@/components/LegalPageNav";

export const metadata = {
  title: "Refund & Cancellation Policy — IntegrioChat",
};

const EFFECTIVE_DATE = "April 15, 2026";
const COMPANY = "IntegrioChat";
const CONTACT_EMAIL = "support@integriochat.com";

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-4">
        <LegalPageNav />
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Refund &amp; Cancellation Policy</h1>
        <p className="mb-10 text-sm text-gray-400">Effective date: {EFFECTIVE_DATE}</p>

        <div className="prose prose-gray max-w-none text-sm leading-relaxed text-gray-700 [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-gray-900 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1">

          <h2>1. Cancellation</h2>
          <p>
            You may cancel your subscription at any time through your account settings.
            Cancellation takes effect at the end of the current billing period. You will
            retain access to paid features until that date. No further charges will be
            made after cancellation.
          </p>

          <h2>2. No Refund Policy</h2>
          <p>
            <strong>All fees paid to {COMPANY} are non-refundable except where expressly
            required by applicable law.</strong> This includes:
          </p>
          <ul>
            <li>Subscription fees for the current or past billing periods.</li>
            <li>Partial months — no pro-rata refunds for mid-period cancellations.</li>
            <li>Unused message credits, tokens, or chatbot capacity.</li>
            <li>Downgrades to a lower-tier plan.</li>
            <li>
              Free trial conversions — if you do not cancel before the trial ends, the
              subscription fee for the first paid period is non-refundable.
            </li>
          </ul>

          <h2>3. Exceptions</h2>
          <p>
            We may, at our sole discretion, issue a refund or account credit in exceptional
            circumstances (e.g., a billing error or a significant service outage directly
            caused by us). To request a review, contact{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-600 underline">
              {CONTACT_EMAIL}
            </a>{" "}
            within 7 days of the charge in question.
          </p>
          <p>
            Where applicable law (including EU consumer protection law) grants you
            mandatory refund rights, those rights are not affected by this policy.
          </p>

          <h2>4. Chargebacks</h2>
          <p>
            Initiating a chargeback or payment dispute without first contacting us may
            result in immediate account suspension. We encourage you to reach out before
            disputing a charge — most billing issues can be resolved quickly.
          </p>

          <h2>5. Contact</h2>
          <p>
            Billing questions or refund requests:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-600 underline">
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
        {" · "}
        <Link href="/tos" className="hover:underline">Terms of Service</Link>
        {" · "}
        <Link href="/cookie" className="hover:underline">Cookie Policy</Link>
        {" · "}
        <Link href="/aup" className="hover:underline">Acceptable Use</Link>
        {" · "}
        © {new Date().getFullYear()} {COMPANY}
      </footer>
    </div>
  );
}
