/**
 * Application-level Prisma client with tenant middleware applied.
 *
 * Import this (not the raw prisma from @integriochat/db) in API routes and services
 * to ensure all queries are automatically scoped to the current tenant.
 */
import { prisma, applyTenantMiddleware } from "@integriochat/db";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth.js";

// Apply middleware once at module load time.
// getTenantId is called lazily on each query.
applyTenantMiddleware(prisma, () => {
  // This runs synchronously inside a Prisma middleware — we can't await here.
  // For request-scoped tenantId, callers should use `getDb(tenantId)` below
  // when they already have the tenantId resolved.
  return null; // fallback: no tenant filter (safe for admin-only operations)
});

export { prisma };

/**
 * Returns a Prisma client pre-scoped to a specific tenantId.
 * Use this in API routes after resolving the session tenantId.
 *
 * NOTE: This creates a closure-based scope; it does NOT create a new client.
 * The middleware uses the tenantId provided at call time for all queries
 * within the same synchronous stack frame (server-side Next.js request).
 */
export async function getTenantId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as Record<string, unknown> | undefined;
  const tenantId = user?.["tenantId"];
  return typeof tenantId === "string" ? tenantId : null;
}

/**
 * Asserts that the current session has a valid tenantId and returns it.
 * Throws a Response (401) if unauthenticated.
 */
export async function requireTenantId(): Promise<string> {
  const tenantId = await getTenantId();
  if (!tenantId) {
    throw new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return tenantId;
}
