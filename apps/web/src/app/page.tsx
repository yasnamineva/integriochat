import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { PLANS } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";

const FEATURE_PLANS: PlanId[] = ["FREE", "HOBBY", "STANDARD", "PRO", "USAGE"];

const FEATURES = [
  {
    icon: "🌐",
    title: "Website scraping",
    description:
      "Point the bot at your site and it crawls every page, chunks the content, and indexes it with vector embeddings. No manual uploads needed.",
  },
  {
    icon: "⚡",
    title: "Streaming responses",
    description:
      "Tokens stream directly to the browser as they're generated — no spinners, no waiting for the full reply to arrive at once.",
  },
  {
    icon: "🎨",
    title: "Fully white-labeled",
    description:
      "Set your own title, avatar, theme color, and dark/light mode. The Shadow DOM widget is style-isolated so it never conflicts with your site.",
  },
  {
    icon: "📊",
    title: "Usage analytics",
    description:
      "See message volume, per-chatbot breakdowns, and plan consumption at a glance. USAGE plan includes per-chatbot spend caps.",
  },
  {
    icon: "🔗",
    title: "REST API & webhooks",
    description:
      "Every chatbot gets its own API key. Fire webhooks on message completion, conversation start, or lead capture to connect any downstream tool.",
  },
  {
    icon: "🔒",
    title: "Multi-tenant isolation",
    description:
      "Row-level tenant isolation enforced by Prisma middleware and pgvector. Your customers' data never leaks between accounts.",
  },
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <span className="text-lg font-bold text-indigo-600">IntegrioChat</span>
          <nav className="flex items-center gap-4">
            <Link
              href="#pricing"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Get started free
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
          Pay-as-you-go · No seat fees · No contracts
        </div>
        <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-6xl">
          AI chatbots that{" "}
          <span className="text-indigo-600">learn your website</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-500">
          Crawl any site, train a bot in minutes, and embed it anywhere with a
          single{" "}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm font-mono text-indigo-700">
            {"<script>"}
          </code>{" "}
          tag. Full streaming, vector search RAG, per-chatbot spending caps, and
          a white-label Shadow DOM widget included on every plan.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="rounded-xl bg-indigo-600 px-7 py-3 text-base font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            Start for free
          </Link>
          <a
            href="#pricing"
            className="rounded-xl border border-gray-200 px-7 py-3 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            View pricing
          </a>
        </div>
      </section>

      {/* ── Embed snippet teaser ── */}
      <section className="bg-gray-950 py-10">
        <div className="mx-auto max-w-xl px-6">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-gray-500">
            One line to embed
          </p>
          <pre className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900 px-6 py-4 text-sm text-green-400">
            {`<script src="${process.env["NEXT_PUBLIC_BASE_URL"] ?? "https://app.integriochat.com"}/widget.js"\n        data-bot="your-chatbot-id"></script>`}
          </pre>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="mb-3 text-center text-3xl font-bold">
          Everything you need, nothing you don&apos;t
        </h2>
        <p className="mb-14 text-center text-base text-gray-500">
          Built for developers shipping AI features to their clients.
        </p>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-100 bg-gray-50 p-6"
            >
              <div className="mb-3 text-2xl">{icon}</div>
              <h3 className="mb-2 text-base font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="bg-gray-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-3 text-center text-3xl font-bold">
            Simple, transparent pricing
          </h2>
          <p className="mb-14 text-center text-base text-gray-500">
            Start free. Scale to USAGE for unlimited bots with pay-per-token
            billing.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {FEATURE_PLANS.map((planId) => {
              const plan = PLANS[planId];
              const isHighlighted = plan.highlighted;
              const isUsage = planId === "USAGE";

              return (
                <div
                  key={planId}
                  className={[
                    "relative flex flex-col rounded-2xl border p-6",
                    isHighlighted
                      ? "border-indigo-500 bg-indigo-600 text-white shadow-xl"
                      : "border-gray-200 bg-white",
                  ].join(" ")}
                >
                  {isHighlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-0.5 text-xs font-bold text-gray-900">
                      Most popular
                    </div>
                  )}

                  <p
                    className={`mb-1 text-sm font-semibold ${isHighlighted ? "text-indigo-200" : "text-gray-500"}`}
                  >
                    {plan.name}
                  </p>

                  {isUsage ? (
                    <div className="mb-4">
                      <span className="text-2xl font-extrabold">
                        Pay as you go
                      </span>
                      <p
                        className={`mt-1 text-xs ${isHighlighted ? "text-indigo-200" : "text-gray-400"}`}
                      >
                        $0.005 per AI response
                        <br />
                        $5 per 1,000 messages
                      </p>
                    </div>
                  ) : plan.monthlyPrice === 0 ? (
                    <div className="mb-4">
                      <span className="text-3xl font-extrabold">Free</span>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <span className="text-3xl font-extrabold">
                        ${plan.monthlyPrice}
                      </span>
                      <span
                        className={`ml-1 text-sm ${isHighlighted ? "text-indigo-200" : "text-gray-400"}`}
                      >
                        / mo
                      </span>
                    </div>
                  )}

                  <ul className="mb-6 flex flex-col gap-2 text-xs">
                    {plan.featureList.map((f) => (
                      <li key={f} className="flex items-start gap-1.5">
                        <span className="mt-px shrink-0 text-green-400">✓</span>
                        <span
                          className={
                            isHighlighted ? "text-indigo-100" : "text-gray-600"
                          }
                        >
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto">
                    <Link
                      href="/register"
                      className={[
                        "block w-full rounded-lg py-2 text-center text-sm font-semibold transition-opacity",
                        isHighlighted
                          ? "bg-white text-indigo-600 hover:opacity-90"
                          : "border border-indigo-200 text-indigo-600 hover:bg-indigo-50",
                      ].join(" ")}
                    >
                      {planId === "FREE" ? "Start free" : "Get started"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h2 className="mb-4 text-3xl font-bold">
          Ready to ship your first AI chatbot?
        </h2>
        <p className="mb-8 text-base text-gray-500">
          Create an account, paste your URL, click Train — you&apos;re live in
          under 5 minutes.
        </p>
        <Link
          href="/register"
          className="rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        >
          Create free account
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-8">
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-4 text-xs text-gray-400">
            <Link href="/tos" className="hover:text-gray-600 hover:underline">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-gray-600 hover:underline">
              Privacy Policy
            </Link>
          </div>
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} IntegrioChat. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
