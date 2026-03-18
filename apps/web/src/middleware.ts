import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiter — only created when Upstash env vars are present so the app
 * still works in development without an Upstash account.
 */
const ratelimit =
  process.env["UPSTASH_REDIS_REST_URL"] && process.env["UPSTASH_REDIS_REST_TOKEN"]
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(20, "1 m"), // 20 req/min per IP
        analytics: false,
      })
    : null;

const PROTECTED_API_PATHS = ["/api/chatbots", "/api/tenants"];
const PROTECTED_PAGE_PATHS = ["/dashboard"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Rate limit POST /api/chat (public endpoint) ───────────────────────────
  if (pathname === "/api/chat") {
    if (ratelimit) {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
      const { success, limit, remaining, reset } = await ratelimit.limit(ip);

      if (!success) {
        return new NextResponse(
          JSON.stringify({ success: false, error: "Too many requests — slow down." }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "X-RateLimit-Limit": String(limit),
              "X-RateLimit-Remaining": String(remaining),
              "X-RateLimit-Reset": String(reset),
            },
          }
        );
      }
    }
    return NextResponse.next();
  }

  // ── Auth guard for protected routes ──────────────────────────────────────
  const isProtectedApi = PROTECTED_API_PATHS.some((p) => pathname.startsWith(p));
  const isProtectedPage = PROTECTED_PAGE_PATHS.some((p) => pathname.startsWith(p));

  if (isProtectedApi || isProtectedPage) {
    const token = await getToken({
      req,
      secret: process.env["NEXTAUTH_SECRET"],
    });

    if (!token) {
      if (isProtectedApi) {
        return new NextResponse(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/chat",
    "/api/chatbots/:path*",
    "/api/tenants/:path*",
    "/dashboard/:path*",
  ],
};
