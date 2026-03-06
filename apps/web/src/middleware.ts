import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * NextAuth middleware — protects /dashboard/* routes.
 *
 * TODO: Add Upstash rate limiting for /api/chat before the auth check.
 */
export default withAuth(
  function middleware(_req) {
    // Placeholder for rate limiting, logging, etc.
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token }) {
        return token !== null;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/chatbots/:path*",
    "/api/tenants/:path*",
  ],
};
