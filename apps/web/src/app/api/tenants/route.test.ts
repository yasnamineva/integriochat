const mockPrisma = {
  tenant: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { getServerSession } from "next-auth";

const adminSession = {
  user: { id: "admin-1", role: "ADMIN", tenantId: "system" },
};

const clientSession = {
  user: { id: "client-1", role: "CLIENT", tenantId: "tenant-123" },
};

const mockTenants = [
  { id: "t-1", name: "Acme", slug: "acme", allowedDomains: [], createdAt: new Date() },
  { id: "t-2", name: "Globex", slug: "globex", allowedDomains: [], createdAt: new Date() },
];

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/tenants", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

// ─── GET /api/tenants ─────────────────────────────────────────────────────────

describe("GET /api/tenants", () => {
  test("returns tenant list for admin users", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    mockPrisma.tenant.findMany.mockResolvedValue(mockTenants);

    const response = await GET();
    const body = await response.json() as { success: boolean; data: unknown[] };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
  });

  test("returns 403 for non-admin users", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(clientSession);

    const response = await GET();
    const body = await response.json() as { success: boolean; error: string };

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Forbidden");
  });

  test("returns 403 when unauthenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(403);
  });
});

// ─── POST /api/tenants ────────────────────────────────────────────────────────

describe("POST /api/tenants", () => {
  const validBody = { name: "New Corp", slug: "new-corp" };

  test("creates tenant and returns 201 for admin", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    mockPrisma.tenant.create.mockResolvedValue({ id: "t-new", ...validBody, allowedDomains: [] });

    const response = await POST(makePostRequest(validBody));
    const body = await response.json() as { success: boolean; data: { id: string } };

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("t-new");
  });

  test("returns 403 for non-admin users", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(clientSession);

    const response = await POST(makePostRequest(validBody));
    expect(response.status).toBe(403);
  });

  test("returns 422 for invalid slug (uppercase)", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);

    const response = await POST(makePostRequest({ name: "Corp", slug: "MySlug" }));
    expect(response.status).toBe(422);
  });

  test("returns 422 for missing fields", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);

    const response = await POST(makePostRequest({}));
    expect(response.status).toBe(422);
  });

  test("accepts optional allowedDomains", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    mockPrisma.tenant.create.mockResolvedValue({ id: "t-new", ...validBody, allowedDomains: ["https://example.com"] });

    const response = await POST(
      makePostRequest({ ...validBody, allowedDomains: ["https://example.com"] })
    );
    expect(response.status).toBe(201);
  });
});
