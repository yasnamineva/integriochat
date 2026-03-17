const mockPrisma = {
  user: { findUnique: jest.fn() },
  tenant: { findUnique: jest.fn() },
  $transaction: jest.fn(),
};

jest.mock("@integriochat/db", () => ({ prisma: mockPrisma }));
jest.mock("bcryptjs", () => ({ hash: jest.fn().mockResolvedValue("hashed-password") }));

import { NextRequest } from "next/server";
import { POST } from "./route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const validBody = {
  email: "admin@acme.com",
  password: "password123",
  name: "Alice",
  companyName: "Acme Corp",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.user.findUnique.mockResolvedValue(null);
  mockPrisma.tenant.findUnique.mockResolvedValue(null);
  mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
    const tenant = { id: "tenant-uuid", name: "Acme Corp", slug: "acme-corp" };
    const user = { id: "user-uuid", email: "admin@acme.com", name: "Alice", tenantId: "tenant-uuid", role: "ADMIN" };
    const txMock = {
      tenant: { create: jest.fn().mockResolvedValue(tenant) },
      user: { create: jest.fn().mockResolvedValue(user) },
    };
    return fn(txMock as unknown as typeof mockPrisma);
  });
});

describe("POST /api/auth/register", () => {
  test("creates tenant and user, returns 201", async () => {
    const res = await POST(makeRequest(validBody));
    const body = await res.json() as { success: boolean; data: { tenantId: string } };

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.tenantId).toBe("tenant-uuid");
  });

  test("returns 409 when email already exists", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "existing" });

    const res = await POST(makeRequest(validBody));
    const body = await res.json() as { success: boolean; error: string };

    expect(res.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/already in use/i);
  });

  test("returns 422 for missing companyName", async () => {
    const res = await POST(makeRequest({ email: "x@x.com", password: "password123" }));
    expect(res.status).toBe(422);
  });

  test("returns 422 for invalid email", async () => {
    const res = await POST(makeRequest({ ...validBody, email: "not-an-email" }));
    expect(res.status).toBe(422);
  });

  test("returns 422 for short password", async () => {
    const res = await POST(makeRequest({ ...validBody, password: "short" }));
    expect(res.status).toBe(422);
  });

  test("derives slug from company name", async () => {
    let capturedSlug = "";
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const txMock = {
        tenant: {
          create: jest.fn().mockImplementation(({ data }: { data: { slug: string } }) => {
            capturedSlug = data.slug;
            return Promise.resolve({ id: "t1", ...data });
          }),
        },
        user: { create: jest.fn().mockResolvedValue({ id: "u1", email: "x@x.com", name: null, tenantId: "t1", role: "ADMIN" }) },
      };
      return fn(txMock);
    });

    await POST(makeRequest({ ...validBody, companyName: "Hello World Inc!" }));
    expect(capturedSlug).toBe("hello-world-inc");
  });

  test("appends numeric suffix when slug is taken", async () => {
    // First call (base slug) → taken; second call → available
    mockPrisma.tenant.findUnique
      .mockResolvedValueOnce({ id: "existing-tenant" })
      .mockResolvedValue(null);

    let capturedSlug = "";
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const txMock = {
        tenant: {
          create: jest.fn().mockImplementation(({ data }: { data: { slug: string } }) => {
            capturedSlug = data.slug;
            return Promise.resolve({ id: "t1", ...data });
          }),
        },
        user: { create: jest.fn().mockResolvedValue({ id: "u1", email: "admin@acme.com", name: "Alice", tenantId: "t1", role: "ADMIN" }) },
      };
      return fn(txMock);
    });

    await POST(makeRequest(validBody));
    expect(capturedSlug).toBe("acme-corp-1");
  });

  test("works without optional name field", async () => {
    const { name: _n, ...bodyWithoutName } = validBody;
    const res = await POST(makeRequest(bodyWithoutName));
    expect(res.status).toBe(201);
  });
});
