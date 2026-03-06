jest.mock("@integriochat/db", () => ({
  prisma: {},
  applyTenantMiddleware: jest.fn(),
}));

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("./auth", () => ({
  authOptions: {},
}));

import { getServerSession } from "next-auth";
import { getTenantId, requireTenantId } from "./db";

// ─── getTenantId() ────────────────────────────────────────────────────────────

describe("getTenantId()", () => {
  test("returns tenantId from session", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: "user-1", tenantId: "tenant-abc", role: "CLIENT" },
    });

    const result = await getTenantId();
    expect(result).toBe("tenant-abc");
  });

  test("returns null when there is no session", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const result = await getTenantId();
    expect(result).toBeNull();
  });

  test("returns null when session has no user", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: undefined });

    const result = await getTenantId();
    expect(result).toBeNull();
  });

  test("returns null when tenantId is missing from user", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: "user-1", role: "CLIENT" },
    });

    const result = await getTenantId();
    expect(result).toBeNull();
  });

  test("returns null when tenantId is not a string", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { tenantId: 12345 },
    });

    const result = await getTenantId();
    expect(result).toBeNull();
  });
});

// ─── requireTenantId() ────────────────────────────────────────────────────────

describe("requireTenantId()", () => {
  test("returns tenantId when session is valid", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { tenantId: "tenant-xyz" },
    });

    const result = await requireTenantId();
    expect(result).toBe("tenant-xyz");
  });

  test("throws a Response(401) when not authenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    try {
      await requireTenantId();
      fail("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(Response);
      expect((e as Response).status).toBe(401);
      const body = await (e as Response).json() as { success: boolean; error: string };
      expect(body.success).toBe(false);
      expect(body.error).toBe("Unauthorized");
    }
  });

  test("thrown Response has JSON content-type", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    try {
      await requireTenantId();
    } catch (e) {
      expect((e as Response).headers.get("content-type")).toContain("application/json");
    }
  });
});
