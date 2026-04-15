import Link from "next/link";
import { LegalPageNav } from "@/components/LegalPageNav";

export const metadata = {
  title: "Cookie Policy — IntegrioChat",
};

const EFFECTIVE_DATE = "April 15, 2026";
const COMPANY = "IntegrioChat";
const CONTACT_EMAIL = "support@integriochat.com";

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-4">
        <LegalPageNav />
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Cookie Policy</h1>
        <p className="mb-10 text-sm text-gray-400">Effective date: {EFFECTIVE_DATE}</p>

        <div className="prose prose-gray max-w-none text-sm leading-relaxed text-gray-700 [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-gray-900 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1">

          <p>
            {COMPANY} uses cookies and similar technologies on its platform. This policy
            explains what cookies we use and why.
          </p>

          <h2>1. What Are Cookies</h2>
          <p>
            Cookies are small text files stored on your device by your browser when you
            visit a website. They are widely used to make websites work, remember your
            preferences, and provide information to site operators.
          </p>

          <h2>2. Cookies We Use</h2>
          <p>
            We use only <strong>strictly necessary cookies</strong>:
          </p>
          <ul>
            <li>
              <strong>Session cookie (NextAuth)</strong> — keeps you signed in during
              your browser session. This cookie is essential for the Service to function
              and cannot be disabled without preventing login.
            </li>
            <li>
              <strong>CSRF token</strong> — protects against cross-site request forgery
              attacks. Required for security.
            </li>
          </ul>
          <p>
            We do <strong>not</strong> use advertising cookies, third-party tracking
            cookies, or analytics cookies that identify individual users.
          </p>

          <h2>3. Your Choices</h2>
          <p>
            You can configure your browser to block or delete cookies. Note that blocking
            essential cookies will prevent you from signing in to the {COMPANY} dashboard.
            Browser-level cookie controls are available in your browser settings under
            Privacy or Security.
          </p>

          <h2>4. Changes</h2>
          <p>
            We may update this policy if we introduce new technologies. We will update
            the effective date above and, where required by law, obtain your consent.
          </p>

          <h2>5. Contact</h2>
          <p>
            Questions?{" "}
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
        <Link href="/refund" className="hover:underline">Refund Policy</Link>
        {" · "}
        <Link href="/aup" className="hover:underline">Acceptable Use</Link>
        {" · "}
        © {new Date().getFullYear()} {COMPANY}
      </footer>
    </div>
  );
}
