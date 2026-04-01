const mockStripeCancel = jest.fn();

jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    subscriptions: { cancel: mockStripeCancel },
  }));
});

const mockPrisma = {
  subscription: { findFirst: jest.fn() },
  tenant: { delete: jest.fn() },
};

jest.mock("@/lib/db", () => ({
  prisma: mockPrisma,
  requireTenantId: jest.fn(),
}));

import { DELETE } from "./route";
import { requireTenantId } from "@/lib/db";

beforeEach(() => {
  jest.clearAllMocks();
  (requireTenantId as jest.Mock).mockResolvedValue("tenant-123");
});

describe("DELETE /api/tenants/me", () => {
  test("returns 401 when unauthenticated", async () => {
    (requireTenantId as jest.Mock).mockRejectedValue(
      new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 })
    );

    const res = await DELETE();
    expect(res.status).toBe(401);
  });

  test("deletes tenant with no Stripe subscription", async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue(null);
    mockPrisma.tenant.delete.mockResolvedValue({ id: "tenant-123" });

    const res = await DELETE();
    const body = await res.json() as { success: boolean; data: { deleted: boolean } };

    expect(res.status).toBe(200);
    expect(body.data.deleted).toBe(true);
    expect(mockStripeCancel).not.toHaveBeenCalled();
    expect(mockPrisma.tenant.delete).toHaveBeenCalledWith({ where: { id: "tenant-123" } });
  });

  test("cancels active Stripe subscription before deleting tenant", async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      stripeSubscriptionId: "sub_abc123",
    });
    mockStripeCancel.mockResolvedValue({ id: "sub_abc123", status: "canceled" });
    mockPrisma.tenant.delete.mockResolvedValue({ id: "tenant-123" });

    const res = await DELETE();
    const body = await res.json() as { success: boolean; data: { deleted: boolean } };

    expect(res.status).toBe(200);
    expect(body.data.deleted).toBe(true);
    expect(mockStripeCancel).toHaveBeenCalledWith("sub_abc123");
    expect(mockPrisma.tenant.delete).toHaveBeenCalledWith({ where: { id: "tenant-123" } });
  });

  test("returns 500 on unexpected DB error", async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue(null);
    mockPrisma.tenant.delete.mockRejectedValue(new Error("DB connection lost"));

    const res = await DELETE();
    expect(res.status).toBe(500);
  });
});
