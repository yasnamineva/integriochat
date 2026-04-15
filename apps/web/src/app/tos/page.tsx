import Link from "next/link";
import { LegalPageNav } from "@/components/LegalPageNav";

export const metadata = {
  title: "Terms of Service — IntegrioChat",
};

const EFFECTIVE_DATE = "April 15, 2026";
const COMPANY = "IntegrioChat";
const CONTACT_EMAIL = "support@integriochat.com";

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
            By accessing or using {COMPANY} (&ldquo;the Service&rdquo;), you acknowledge that
            you have read, understood, and agree to be bound by these Terms of Service
            (&ldquo;Terms&rdquo;), which constitute a legally binding agreement between you and
            {" "}{COMPANY}. If you do not agree, do not use the Service.
          </p>

          <h2>2. Eligibility</h2>
          <p>
            You must be at least 18 years old and legally capable of entering into
            binding contracts to use the Service. By using the Service, you represent
            that you meet these requirements.
          </p>

          <h2>3. Description of Service</h2>
          <p>
            {COMPANY} provides a platform for creating, training, and embedding AI-powered
            chat assistants on websites. The Service includes a dashboard, an embeddable
            widget, and associated APIs.
          </p>

          <h2>4. Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account
            credentials and for all activity that occurs under your account. You must
            notify us immediately of any unauthorized access at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-600 underline">
              {CONTACT_EMAIL}
            </a>.
          </p>

          <h2>5. Subscription &amp; Billing</h2>
          <ul>
            <li>
              Paid subscriptions renew automatically unless canceled before the applicable
              renewal date.
            </li>
            <li>
              Free trials automatically convert to paid subscriptions at the end of the
              trial period unless canceled beforehand.
            </li>
            <li>
              You authorize {COMPANY} and its payment processors to charge all applicable
              fees to your selected payment method.
            </li>
            <li>
              Failure to pay fees when due may result in suspension or termination of
              your account.
            </li>
            <li>
              We reserve the right to modify pricing or features with reasonable notice.
            </li>
            <li>
              Usage-based charges are billed at the end of each billing period based on
              actual consumption.
            </li>
          </ul>

          <h2>6. No Refund Policy</h2>
          <p>
            <strong>ALL FEES ARE NON-REFUNDABLE EXCEPT WHERE REQUIRED BY APPLICABLE LAW.</strong>{" "}
            No refunds or credits will be issued for partial billing periods, unused
            services, downgrades, or cancellations. Chargebacks or payment disputes made
            in bad faith may result in immediate account suspension and recovery actions.
            See our full{" "}
            <Link href="/refund" className="text-indigo-600 underline">Refund Policy</Link>.
          </p>

          <h2>7. Acceptable Use</h2>
          <p>
            You may not use the Service for unlawful, abusive, infringing, harmful, or
            deceptive purposes. See our{" "}
            <Link href="/aup" className="text-indigo-600 underline">Acceptable Use Policy</Link>{" "}
            for the full list of prohibited activities. Violations may result in immediate
            suspension or termination without notice.
          </p>

          <h2>8. AI Output Disclaimer</h2>
          <p>
            Artificial intelligence outputs generated through the Service may be inaccurate,
            incomplete, biased, or otherwise unsuitable for your intended purpose. You are
            solely responsible for independently reviewing, validating, and approving all
            AI outputs before reliance, publication, or deployment to end users.{" "}
            {COMPANY} makes no warranty regarding the accuracy or fitness of AI-generated
            content.
          </p>

          <h2>9. Intellectual Property</h2>
          <p>
            You retain ownership of all content you upload or create. You grant {COMPANY}
            a limited, non-exclusive license to process that content solely to provide
            the Service. We retain all rights, title, and interest in and to the Service
            itself, including all software, designs, and documentation.
          </p>

          <h2>10. Suspension &amp; Termination</h2>
          <p>
            We may suspend, restrict, or terminate your access immediately and without
            prior notice for suspected violations of these Terms, abuse, excessive usage,
            security threats, payment disputes, legal or regulatory concerns, or conduct
            that may expose {COMPANY} to risk or liability. You may terminate your account
            at any time through your account settings; termination takes effect at the
            end of the current billing period.
          </p>

          <h2>11. Service Availability</h2>
          <p>
            The Service is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis.
            We do not warrant uninterrupted, error-free, or secure operation, nor that
            the Service will meet all of your requirements. We may modify or discontinue
            features at any time.
          </p>

          <h2>12. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, OUR TOTAL LIABILITY
            ARISING OUT OF OR RELATED TO THE SERVICE SHALL NOT EXCEED THE AMOUNTS PAID
            BY YOU TO {COMPANY.toUpperCase()} DURING THE TWELVE (12) MONTHS PRECEDING
            THE EVENT GIVING RISE TO LIABILITY.
          </p>
          <p>
            WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
            EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, BUSINESS,
            OR GOODWILL, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>

          <h2>13. Indemnification</h2>
          <p>
            You agree to defend, indemnify, and hold harmless {COMPANY}, its operators,
            affiliates, contractors, and licensors from and against any claims, damages,
            liabilities, costs, and expenses (including reasonable legal fees) arising
            from your use of the Service, your submitted content, your end users&apos;
            use of your chatbots, or your violation of these Terms.
          </p>

          <h2>14. Data &amp; Privacy</h2>
          <p>
            Our collection and use of personal data is described in our{" "}
            <Link href="/privacy" className="text-indigo-600 underline">Privacy Policy</Link>,
            which is incorporated into these Terms by reference. By using the Service,
            you consent to our data practices as described therein.
          </p>

          <h2>15. Governing Law &amp; Jurisdiction</h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of
            Bulgaria, without regard to conflict of law principles. Any disputes arising
            out of or relating to these Terms or the Service shall be subject to the
            exclusive jurisdiction of the competent courts of Sofia, Bulgaria.
          </p>

          <h2>16. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. We will notify you by updating
            the effective date above and, for material changes, by email. Continued use
            of the Service after changes constitutes acceptance of the updated Terms.
          </p>

          <h2>17. Contact</h2>
          <p>
            Questions about these Terms? Email us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-600 underline">
              {CONTACT_EMAIL}
            </a>.
          </p>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
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
