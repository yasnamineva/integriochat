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

      {/* ── Supported platforms ── */}
      <section className="border-b border-gray-100 bg-white py-14">
        <div className="mx-auto max-w-5xl px-6">
          <p className="mb-10 text-center text-sm font-semibold uppercase tracking-widest text-gray-400">
            Works on any platform
          </p>
          <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-14">
            {[
              {
                name: "WordPress",
                svg: (
                  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zM3.6 12c0-1.127.232-2.198.645-3.17l3.55 9.725A8.406 8.406 0 013.6 12zm8.4 8.4a8.394 8.394 0 01-2.386-.344l2.533-7.36 2.595 7.11a.337.337 0 00.025.05A8.4 8.4 0 0112 20.4zm1.16-12.26c.505-.027.96-.08.96-.08.452-.054.399-.719-.054-.693 0 0-1.358.107-2.235.107-.822 0-2.207-.107-2.207-.107-.454-.026-.507.666-.053.693 0 0 .428.053.88.08l1.308 3.582-1.837 5.51-3.054-9.092c.506-.027.959-.08.959-.08.452-.054.399-.719-.054-.693 0 0-1.357.107-2.234.107-.157 0-.342-.004-.538-.01A8.4 8.4 0 0112 3.6c2.203 0 4.21.843 5.717 2.222-.036-.002-.072-.005-.109-.005-.822 0-1.405.716-1.405 1.485 0 .692.399 1.278.825 1.971.319.56.694 1.278.694 2.315 0 .719-.276 1.553-.639 2.715l-.838 2.797-3.085-9.16zm3.447 11.109l2.574-7.436c.48-1.2.64-2.16.64-3.013 0-.31-.02-.597-.057-.864A8.397 8.397 0 0120.4 12a8.395 8.395 0 01-3.793 7.249z" />
                  </svg>
                ),
              },
              {
                name: "Shopify",
                svg: (
                  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
                    <path d="M15.337 23.979l6.21-1.347S18.79 7.43 18.77 7.28c-.019-.148-.148-.245-.276-.245s-2.574-.177-2.574-.177-.92-1.809-1.377-2.18c-.01-.008-.02-.017-.03-.023v-.001c-.003-.002-.006-.004-.01-.005a.523.523 0 00-.186-.062V4.58c-.01 0-.019-.001-.029-.001-.026 0-.052.002-.077.007V4.58l-.052.01c-.004 0-.008.002-.012.003-.005.001-.01.003-.016.004l-.038.01c-.007.002-.014.004-.021.007l-.02.007c-.006.002-.012.005-.017.007l-.017.007-.017.007c-.006.003-.011.005-.017.008l-.015.007-.016.007-.015.007-.017.008c-.005.002-.01.005-.015.008l-.016.007-.014.007-.015.008-.013.007-.015.007-.013.007-.014.007-.012.007-.013.007-.012.006-.012.007-.013.006-.01.006-.012.006-.01.006-.011.006-.01.006-.01.005-.01.006-.009.005-.01.005-.008.005-.01.005-.007.004-.009.005-.007.004-.008.004-.007.004-.008.004-.006.003-.008.004-.006.003-.007.004-.006.003-.007.003-.005.003-.007.003-.005.003-.006.003-.005.003-.006.003-.004.002-.006.003-.004.002-.005.003-.004.002-.005.002-.004.002-.005.002-.003.002-.005.002-.003.001-.004.002-.003.001-.004.002-.003.001-.003.002-.003.001-.003.001-.003.002-.002.001-.003.001-.002.001-.003.001-.002.001-.002.001-.003.001-.001.001-.002.001h-.001l-.002.001h-.001l-.001.001h-.001l-.001.001H14v.001h-.001v.001h-.001V4.603l-.001.001v.001h-.001v.001h-.001v.001h-.001v.001h-.001V4.61h-.001v.001h-.001v.001h-.001v.001h-.001v.001l-.001.001v.001h-.001v.001h-.001v.002h-.001v.001h-.001v.002h-.001v.001h-.001v.002l-.001.001v.002h-.001v.002h-.001v.002h-.001v.002h-.001v.003h-.001v.003l-.001.002v.003h-.001v.003h-.001v.004h-.001v.003l-.001.003v.004h-.001v.004l-.001.004v.004l-.001.004v.005l-.001.004v.005l-.001.005v.005l-.001.005V4.7l-.001.006v.006l-.001.006v.007l-.001.007V4.74l-.001.008v.009l-.001.009v.01l-.001.01v.011l-.001.012v.013l-.001.013v.015l-.001.016v.017l-.001.018v.02l-.001.021v.023l-.001.025v.027l-.001.029V5.07l-.001.034v.038l-.001.041v.045l-.001.05v.055l-.001.06v.067l-.001.074v.082l-.001.092v.103l-.001.116v.13l-.001.147v.167l-.001.189v.215l-.001.245V7.23c-.54.165-1.129.345-1.75.533C9.728 5.405 8.387 4.58 6.819 4.58c-.048 0-.097.001-.145.003-.44-.576-.979-.86-1.526-.86-3.78 0-5.588 4.724-6.148 7.124-.003.011-.004.022-.004.032-.001.014 0 .026.003.039.007.033.025.062.052.083l.003.002.004.003.002.001.004.002.003.002.004.002.003.001.004.002.004.002.004.001.004.002.004.001.004.002.005.001.004.001.005.001.004.001.005.001.005.001.005.001.005.001.005.001.005.001.006.001.005.001.006.001.005.001.006.001.006.001.006.001.006.001.007.001.006.001.007.001.007.001.007.001.007.001.008.001.007.001.008.001.008.001.008.001.009.001.008.001.009.001.009.001.009.001.01.001.01.001.01.001.01.001.011.001.011.001.011.001.011.001.012.001.012.001.013.001.013.001.013.001.014.001.014.001.014.001.015.001.015.001.016.001.016.001.017.001.017.001.018.001.018.001.019.001.019.001.02.002.02.001.021.002.021.002.022.002.023.002.023.002.024.002.025.002.025.002.026.002.027.002.027.003.028.002.03.003.03.003.031.003.032.003.033.003.034.003.035.003.036.004.037.004.038.004.039.004.041.004.042.005.043.005.045.005.046.005.047.005.049.006.05.006.052.006.054.007.055.007.057.007.059.007.061.008.063.008.065.008.067.009.07.009.072.01.074.01.077.01.08.011.082.011.085.012.088.012.091.013.094.013.097.014.101.014.104.015.107.015.111.016.115.017.118.017.122.018.127.019.131.02.135.02.139.021.144.022.149.023.154.024.159.025.164.026.169.027.175.028.181.029.186.03.193.032.199.033.205.034.212.036.219.037.226.038.233.04.241.041.248.043.256.045.264.047.273.049.281.051.29.053.3.055.309.058.318.06.328.063.338.066.349.069.36.072.371.075.382.078.393.082.405.085.417.089.429.093.441.097.454.101.467.105.48.11.494.114.507.119.521.123.535.128.549.133.564.138.578.143.593.148.608.153.623.158.638.163.653.169.668.174.683.179.698.185.713.19.729.196.744.201.759.206.774.212.789.217.804.222.818.228.833.233.847.238.861.243.875.248.888.253.901.258.914.263.926.267.938.272.949.276.96.28.971.284.981.289.99.293.999.297 1.007.3 1.015.305 1.022.308 1.028.312 1.034.315 1.039.318 1.044.321 1.048.324 1.052.327 1.055.329 1.057.332 1.06.334 1.062.336 1.063.338 1.064.34 1.065.341 1.065.343c0 .001 0 .001 0 0l6.21 1.347z"/>
                  </svg>
                ),
              },
              {
                name: "Webflow",
                svg: (
                  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
                    <path d="M17.877 6.058S15.4 13.97 15.28 14.37c-.07-.41-1.354-8.312-1.354-8.312C10.716 6.058 8.917 8.43 8.03 10.9c-.07-.675-1.048-4.842-1.048-4.842C4.65 6.058 3 8.337 2.35 9.947L0 23.99h5.617l1.913-6.327c.758 2.075 2.082 6.327 2.082 6.327h3.378s.988-3.198 1.936-6.327l1.878 6.327h5.596L24 6.058h-6.123zm-9.25 11.84c-.507-1.52-1.84-5.476-1.84-5.476S7.877 16.433 8.627 17.898zm9.156 0c.749-1.465 1.75-5.476 1.75-5.476s-.48 3.956-1.75 5.476z"/>
                  </svg>
                ),
              },
              {
                name: "Squarespace",
                svg: (
                  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
                    <path d="M19.506 3.138l-1.336 1.337a7.474 7.474 0 010 10.573l-.014.014a.626.626 0 01-.885 0L5.938 3.729a.626.626 0 010-.885l.014-.014a7.474 7.474 0 0110.573 0l1.337-1.337A9.474 9.474 0 004.494 4.494l-.014.014a2.626 2.626 0 000 3.712L15.79 19.532l.014.014a.626.626 0 010 .885l-.014.014a7.474 7.474 0 01-10.573 0L3.88 21.782a9.474 9.474 0 0013.368-.001l.014-.014a2.626 2.626 0 000-3.712L6.95 6.744a.626.626 0 010-.885l.014-.014a7.474 7.474 0 0110.573 0l1.336-1.337a9.474 9.474 0 00-.367-.37z"/>
                  </svg>
                ),
              },
              {
                name: "Wix",
                svg: (
                  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
                    <path d="M10.488 5.37c-.54.28-.826.673-1.045 1.408-.04.14-.602 2.553-1.25 5.363-.647 2.81-1.186 5.09-1.196 5.068-.01-.022-.535-2.287-1.166-5.034-.63-2.746-1.2-5.148-1.265-5.336C4.342 6.26 3.99 5.8 3.4 5.527 3.065 5.368 2.983 5.35 2.463 5.35c-.506 0-.607.02-.889.16-.514.26-.83.662-.985 1.254-.035.135-.582 2.47-1.216 5.188-.634 2.72-1.16 4.94-1.17 4.933-.009-.007-.553-2.246-1.209-4.974-.656-2.73-1.22-5.06-1.254-5.18-.145-.502-.447-.88-.893-1.109-.31-.158-.404-.177-.906-.177-.48 0-.605.021-.896.162-.547.27-.857.69-.98 1.32-.05.25 2.43 10.608 2.655 11.397.238.838.608 1.336 1.222 1.635.336.164.42.18.953.18.557 0 .608-.013.969-.197.59-.3.826-.662 1.064-1.61.07-.278.636-2.764 1.257-5.525l.985 4.308c.288 1.26.562 2.335.61 2.39.37.428.755.659 1.28.752.175.03.533.04.733.016.547-.067.99-.376 1.251-.872.062-.118.642-2.31 1.288-4.87l1.158 4.667c.115.462.27.784.487.996.285.279.604.43 1.005.475.19.021.54.01.71-.021.551-.101.965-.42 1.215-.948.097-.206 2.78-11.278 2.78-11.527 0-.426-.218-.903-.563-1.237-.342-.332-.736-.499-1.19-.499-.438 0-.735.09-1.014.307zm11.34-.078c-.38.122-.73.41-.91.75-.103.193-.117.299-.12.916l-.003.7-.786.014c-.725.012-.8.021-.982.118-.548.293-.8.985-.579 1.591.164.447.568.742 1.07.783l.277.022v2.617c0 2.89.008 2.985.188 3.555.38 1.21 1.232 2.014 2.5 2.363.469.128 1.537.155 2.068.052.76-.146 1.353-.507 1.694-.1.463.576.77 1.215.863.163.047-.249-.018-.553-.217-.953-.26-.527-.714-.793-1.373-.814-.443-.014-.606-.052-.81-.188-.416-.277-.46-.5-.476-2.384l-.014-1.62.91-.014c.964-.014 1.053-.032 1.276-.263.24-.248.307-.473.277-.932-.032-.5-.25-.832-.67-.1-.137-.067-.282-.08-.82-.08h-.974v-1.37c0-.78-.02-1.437-.046-1.516-.097-.285-.367-.528-.702-.634-.267-.084-.755-.076-1.02.013z"/>
                  </svg>
                ),
              },
              {
                name: "Custom HTML",
                svg: (
                  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
                    <path d="M14.6 16.6l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4zm-5.2 0L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4z"/>
                  </svg>
                ),
              },
            ].map(({ name, svg }) => (
              <div
                key={name}
                className="group flex flex-col items-center gap-2 opacity-50 transition-all duration-200 hover:opacity-100"
              >
                <div className="text-gray-500 transition-transform duration-200 group-hover:scale-110">
                  {svg}
                </div>
                <span className="text-xs font-medium text-gray-500">{name}</span>
              </div>
            ))}
          </div>
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

      {/* ── How it works ── */}
      <section className="bg-gray-950 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-3 text-center text-3xl font-bold text-white">
            How it works
          </h2>
          <p className="mb-16 text-center text-base text-gray-400">
            From zero to a live AI chatbot in under 5 minutes.
          </p>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: 1,
                title: "Create your chatbot",
                description: "Sign up, give your bot a name, tone, and system prompt. Takes 60 seconds.",
                icon: (
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                ),
              },
              {
                step: 2,
                title: "Train on your website",
                description: "Paste your URL and click Train. The bot crawls every page and indexes your content with vector embeddings.",
                icon: (
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253" />
                  </svg>
                ),
              },
              {
                step: 3,
                title: "Customize the widget",
                description: "Set your brand color, avatar, chat title, welcome message, and dark/light theme.",
                icon: (
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                  </svg>
                ),
              },
              {
                step: 4,
                title: "Embed anywhere",
                description: "Copy one <script> tag and paste it into any page. Works on WordPress, Shopify, Webflow, or plain HTML.",
                icon: (
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                  </svg>
                ),
              },
            ].map(({ step, title, description, icon }, i, arr) => (
              <div key={step} className="relative flex flex-col items-center text-center">
                {/* Arrow connector — hidden on last item and on small screens */}
                {i < arr.length - 1 && (
                  <div className="absolute right-0 top-8 hidden -translate-y-1/2 translate-x-1/2 text-gray-600 lg:block">
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {/* Step circle */}
                <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/30">
                  {icon}
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
                    {step}
                  </span>
                </div>
                <h3 className="mb-2 text-sm font-semibold text-white">{title}</h3>
                <p className="text-xs leading-relaxed text-gray-400">{description}</p>
              </div>
            ))}
          </div>
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
