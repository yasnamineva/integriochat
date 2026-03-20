const mockPrisma = {
  chatbot: { findFirst: jest.fn() },
  demoLink: { create: jest.fn() },
};

jest.mock("@/lib/db", () => ({
  prisma: mockPrisma,
  requireTenantId: jest.fn(),
}));

import { NextRequest } from "next/server";
import { POST } from "./route";
import { requireTenantId } from "@/lib/db";

const mockRequireTenantId = requireTenantId as jest.Mock;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/demo", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const validBody = { chatbotId: "123e4567-e89b-12d3-a456-426614174000", durationDays: 7 };
const mockDemoLink = {
  id: "link-id",
  token: "abc-token",
  chatbotId: validBody.chatbotId,
  expiresAt: new Date("2026-03-25"),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireTenantId.mockResolvedValue("tenant-123");
  mockPrisma.chatbot.findFirst.mockResolvedValue({ id: validBody.chatbotId });
  mockPrisma.demoLink.create.mockResolvedValue(mockDemoLink);
});

describe("POST /api/demo", () => {
  test("creates a demo link and returns 201", async () => {
    const res = await POST(makeRequest(validBody));
    const body = await res.json() as { success: boolean; data: { token: string } };
    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.token).toBe("abc-token");
  });

  test("sets expiresAt based on durationDays", async () => {
    await POST(makeRequest({ chatbotId: validBody.chatbotId, durationDays: 14 }));
    const createCall = mockPrisma.demoLink.create.mock.calls[0][0] as {
      data: { expiresAt: Date };
    };
    const daysDiff = Math.round(
      (createCall.data.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    expect(daysDiff).toBe(14);
  });

  test("uses default durationDays of 7 when omitted", async () => {
    await POST(makeRequest({ chatbotId: validBody.chatbotId }));
    const createCall = mockPrisma.demoLink.create.mock.calls[0][0] as {
      data: { expiresAt: Date };
    };
    const daysDiff = Math.round(
      (createCall.data.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    expect(daysDiff).toBe(7);
  });

  test("scopes create to current tenant", async () => {
    await POST(makeRequest(validBody));
    expect(mockPrisma.demoLink.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: "tenant-123", chatbotId: validBody.chatbotId }),
      })
    );
  });

  test("returns 404 when chatbot does not belong to tenant", async () => {
    mockPrisma.chatbot.findFirst.mockResolvedValue(null);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(404);
  });

  test("returns 401 when not authenticated", async () => {
    mockRequireTenantId.mockRejectedValue(
      new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 })
    );
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
  });

  test("returns 422 for missing chatbotId", async () => {
    const res = await POST(makeRequest({ durationDays: 7 }));
    expect(res.status).toBe(422);
  });

  test("returns 422 for non-UUID chatbotId", async () => {
    const res = await POST(makeRequest({ chatbotId: "not-a-uuid", durationDays: 7 }));
    expect(res.status).toBe(422);
  });

  test("returns 422 when durationDays exceeds 90", async () => {
    const res = await POST(makeRequest({ chatbotId: validBody.chatbotId, durationDays: 91 }));
    expect(res.status).toBe(422);
  });
});
