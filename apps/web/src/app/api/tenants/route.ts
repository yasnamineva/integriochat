import { type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.js";
import { prisma } from "@/lib/db.js";
import { ok, err } from "@integriochat/utils";
import { CreateTenantSchema } from "@integriochat/utils";

/** Assert the current session belongs to a platform ADMIN */
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const user = session?.user as Record<string, unknown> | undefined;
  if (!user || user["role"] !== "ADMIN") {
    throw new Response(
      JSON.stringify({ success: false, error: "Forbidden" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
  return user;
}

export async function GET() {
  try {
    await requireAdmin();

    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        allowedDomains: true,
        createdAt: true,
      },
    });

    return ok(tenants);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[GET /api/tenants]", e);
    return err("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body: unknown = await req.json();
    const parsed = CreateTenantSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.message, 422);
    }

    const { name, slug, allowedDomains } = parsed.data;

    const tenant = await prisma.tenant.create({
      data: { name, slug, allowedDomains },
    });

    return ok(tenant, 201);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[POST /api/tenants]", e);
    return err("Internal server error", 500);
  }
}
