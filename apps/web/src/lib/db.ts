/**
 * Application-level Prisma client with tenant middleware applied.
 *
 * Import this (not the raw prisma from @integriochat/db) in API routes and services
 * to ensure all queries are automatically scoped to the current tenant.
 *
 * The middleware's getTenantId getter returns null because Prisma's $use callbacks
 * run inside their own async resource scope and do not inherit AsyncLocalStorage
 * values set on the calling context. Routes therefore pass tenantId explicitly in
 * all query args; the middleware enforces this and still injects it when available.
 */
import { prisma, applyTenantMiddleware } from "@integriochat/db";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

applyTenantMiddleware(prisma, () => null);

export { prisma };

/**
 * Returns the tenantId from the current session, or null if unauthenticated.
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
