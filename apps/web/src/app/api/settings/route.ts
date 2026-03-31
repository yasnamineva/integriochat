import { type NextRequest } from "next/server";
import { prisma, requireTenantId } from "@/lib/db";
import { ok, err } from "@integriochat/utils";

export async function GET() {
  try {
    const tenantId = await requireTenantId();

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true },
    });

    if (!tenant) return err("Tenant not found", 404);
    return ok(tenant);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[GET /api/settings]", e);
    return err("Internal server error", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const tenantId = await requireTenantId();

    const body = await req.json().catch(() => ({})) as { name?: string };

    const updateData: { name?: string } = {};

    if (typeof body.name === "string" && body.name.trim()) {
      updateData.name = body.name.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return err("Nothing to update", 422);
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
      select: { id: true, name: true, slug: true },
    });

    return ok(tenant);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[PATCH /api/settings]", e);
    return err("Internal server error", 500);
  }
}
