export async function register() {
  if (!process.env["SENTRY_DSN"]) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { init } = await import("@sentry/nextjs");
    init({
      dsn: process.env["SENTRY_DSN"],
      environment: process.env["NODE_ENV"] ?? "development",
      tracesSampleRate: 0.1,
      // Don't log Sentry debug output in production
      debug: false,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    const { init } = await import("@sentry/nextjs");
    init({
      dsn: process.env["SENTRY_DSN"],
      environment: process.env["NODE_ENV"] ?? "development",
      tracesSampleRate: 0.1,
      debug: false,
    });
  }
}
