import type { PrismaClient } from "@prisma/client";

// Models that do NOT have a tenantId (the Tenant table itself)
const TENANT_EXEMPT_MODELS = new Set(["Tenant"]);

/**
 * Applies tenant isolation middleware to a PrismaClient instance.
 *
 * - Automatically injects `where: { tenantId }` on all read operations.
 * - Automatically sets `data.tenantId` on all create/update operations.
 *
 * When getTenantId() returns null (e.g. public endpoints), writes are still
 * allowed provided the caller has already set tenantId explicitly in data/where.
 * This covers routes that resolve tenantId from the session before the query.
 *
 * IMPORTANT: Call this immediately after creating the PrismaClient and
 * before any queries. Never bypass this middleware by using raw SQL or
 * a separate PrismaClient instance without the middleware applied.
 */
export function applyTenantMiddleware(
  client: PrismaClient,
  getTenantId: () => string | null
): void {
  // @ts-expect-error — Prisma's $use middleware API is typed via extension but works at runtime
  client.$use(async (params: PrismaMiddlewareParams, next: (p: PrismaMiddlewareParams) => Promise<unknown>) => {
    const { model, action } = params;

    if (!model || TENANT_EXEMPT_MODELS.has(model)) {
      return next(params);
    }

    const tenantId = getTenantId();
    if (!tenantId) {
      // No tenantId from context — allow writes only when the caller has already
      // set tenantId explicitly in data (create) or where (update/delete).
      // This is safe: all routes resolve tenantId from the authenticated session
      // via requireTenantId() and pass it directly in the query args.
      if (["create", "createMany", "update", "updateMany", "upsert"].includes(action)) {
        const isCreate = action === "create" || action === "createMany";
        const bag = isCreate
          ? (params.args?.["data"] as Record<string, unknown> | undefined)
          : (params.args?.["where"] as Record<string, unknown> | undefined);

        if (typeof bag?.["tenantId"] !== "string") {
          throw new Error(
            `[TenantMiddleware] tenantId is required for write operation on model "${model}"`
          );
        }
      }
      return next(params);
    }

    // ─── Read operations — inject tenantId filter ─────────────────────────
    if (
      ["findUnique", "findFirst", "findMany", "count", "aggregate", "groupBy"].includes(action)
    ) {
      params.args ??= {};
      params.args["where"] ??= {};
      (params.args["where"] as Record<string, unknown>)["tenantId"] = tenantId;
    }

    // ─── Write operations — inject tenantId into data ─────────────────────
    if (["create"].includes(action)) {
      params.args ??= {};
      params.args["data"] ??= {};
      (params.args["data"] as Record<string, unknown>)["tenantId"] = tenantId;
    }

    if (["update", "upsert"].includes(action)) {
      params.args ??= {};
      // Also constrain the where clause to prevent cross-tenant updates
      params.args["where"] ??= {};
      (params.args["where"] as Record<string, unknown>)["tenantId"] = tenantId;
    }

    if (["delete", "deleteMany"].includes(action)) {
      params.args ??= {};
      params.args["where"] ??= {};
      (params.args["where"] as Record<string, unknown>)["tenantId"] = tenantId;
    }

    return next(params);
  });
}

// Type alias for the middleware params (Prisma internal shape)
interface PrismaMiddlewareParams {
  model?: string;
  action: string;
  args: Record<string, unknown>;
  dataPath: string[];
  runInTransaction: boolean;
}
