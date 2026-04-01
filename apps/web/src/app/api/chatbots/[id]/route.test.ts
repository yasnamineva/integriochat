jest.mock("@/services/scraper.service", () => ({
  triggerScrapeInBackground: jest.fn(),
}));

const mockPrisma = {
  chatbot: {
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  subscription: {
    findFirst: jest.fn(),
  },
};

jest.mock("@/lib/db", () => ({
  prisma: mockPrisma,
  requireTenantId: jest.fn(),
}));

import { NextRequest } from "next/server";
import { GET, PATCH, DELETE } from "./route";
import { requireTenantId } from "@/lib/db";

const PARAMS = { params: { id: "bot-uuid-1" } };

const mockChatbot = {
  id: "bot-uuid-1",
  name: "Test Bot",
  systemPrompt: "Be helpful.",
  tone: "professional",
  isActive: true,
  leadCapture: false,
  tenantId: "tenant-123",
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makePatchRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/chatbots/bot-uuid-1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

// ─── GET /api/chatbots/[id] ───────────────────────────────────────────────────

describe("GET /api/chatbots/[id]", () => {
  test("returns the chatbot when found", async () => {
    (requireTenantId as jest.Mock).mockResolvedValue("tenant-123");
    mockPrisma.chatbot.findFirst.mockResolvedValue(mockChatbot);

    const response = await GET(new NextRequest("http://localhost"), PARAMS);
    const body = await response.json() as { success: boolean; data: { id: string } };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("bot-uuid-1");
  });

  test("scopes findFirst to the current tenant", async () => {
    (requireTenantId as jest.Mock).mockResolvedValue("tenant-abc");
    mockPrisma.chatbot.findFirst.mockResolvedValue(mockChatbot);

    await GET(new NextRequest("http://localhost"), PARAMS);

    expect(mockPrisma.chatbot.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "bot-uuid-1", tenantId: "tenant-abc" } })
    );
  });

  test("returns 404 when chatbot is not found", async () => {
    (requireTenantId as jest.Mock).mockResolvedValue("tenant-123");
    mockPrisma.chatbot.findFirst.mockResolvedValue(null);

    const response = await GET(new NextRequest("http://localhost"), PARAMS);
    const body = await response.json() as { success: boolean; error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("Chatbot not found");
  });

  test("returns 404 for cross-tenant access (tenant isolation)", async () => {
    // Simulate: bot belongs to tenant-A, current user is tenant-B
    // findFirst with tenantId: tenant-B returns null → 404
    (requireTenantId as jest.Mock).mockResolvedValue("tenant-B");
    mockPrisma.chatbot.findFirst.mockResolvedValue(null);

    const response = await GET(new NextRequest("http://localhost"), PARAMS);
    expect(response.status).toBe(404);
  });

  test("returns 401 when not authenticated", async () => {
    (requireTenantId as jest.Mock).mockRejectedValue(
      new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 })
    );

    const response = await GET(new NextRequest("http://localhost"), PARAMS);
    expect(response.status).toBe(401);
  });
});

// ─── PATCH /api/chatbots/[id] ─────────────────────────────────────────────────

describe("PATCH /api/chatbots/[id]", () => {
  test("updates and returns the chatbot", async () => {
    (requireTenantId as jest.Mock).mockResolvedValue("tenant-123");
    mockPrisma.chatbot.findFirst.mockResolvedValue({ id: "bot-uuid-1" });
    mockPrisma.chatbot.update.mockResolvedValue({ ...mockChatbot, name: "Updated Bot" });

    const response = await PATCH(makePatchRequest({ name: "Updated Bot" }), PARAMS);
    const body = await response.json() as { success: boolean; data: { name: string } };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  test("verifies ownership before updating", async () => {
    (requireTenantId as jest.Mock).mockResolvedValue("tenant-123");
    mockPrisma.chatbot.findFirst.mockResolvedValue({ id: "bot-uuid-1" });
    mockPrisma.chatbot.update.mockResolvedValue(mockChatbot);

    await PATCH(makePatchRequest({ name: "New Name" }), PARAMS);

    expect(mockPrisma.chatbot.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "bot-uuid-1", tenantId: "tenant-123" } })
    );
  });

  test("returns 404 when bot does not belong to the tenant", async () => {
    (requireTenantId as jest.Mock).mockResolvedValue("tenant-123");
    mockPrisma.chatbot.findFirst.mockResolvedValue(null); // not found for this tenant

    const response = await PATCH(makePatchRequest({ name: "Hacked" }), PARAMS);
    expect(response.status).toBe(404);
  });

  test("returns 422 for invalid update body", async () => {
    (requireTenantId as jest.Mock).mockResolvedValue("tenant-123");

    const response = await PATCH(makePatchRequest({ name: "" }), PARAMS);
    expect(response.status).toBe(422);
  });

  test("accepts partial updates (only some fields)", async () => {
    (requireTenantId as jest.Mock).mockResolvedValue("tenant-123");
    mockPrisma.chatbot.findFirst.mockResolvedValue({ id: "bot-uuid-1" });
    mockPrisma.chatbot.update.mockResolvedValue(mockChatbot);

    const response = await PATCH(makePatchRequest({ leadCapture: true }), PARAMS);
    expect(response.status).toBe(200);
  });

  test("returns 401 when not authenticated", async () => {
    (requireTenantId as jest.Mock).mockRejectedValue(
      new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 })
    );

    const response = await PATCH(makePatchRequest({ name: "x" }), PARAMS);
    expect(response.status).toBe(401);
  });
});

// ─── DELETE /api/chatbots/[id] ────────────────────────────────────────────────

describe("DELETE /api/chatbots/[id]", () => {
  test("deletes the chatbot and returns { deleted: true }", async () => {
    (requireTenantId as jest.Mock).mockResolvedValue("tenant-123");
    mockPrisma.chatbot.findFirst.mockResolvedValue({ id: "bot-uuid-1" });
    mockPrisma.chatbot.delete.mockResolvedValue(mockChatbot);

    const response = await DELETE(new NextRequest("http://localhost"), PARAMS);
    const body = await response.json() as { success: boolean; data: { deleted: boolean } };

    expect(response.status).toBe(200);
    expect(body.data.deleted).toBe(true);
  });

  test("returns 404 when bot does not belong to the tenant", async () => {
    (requireTenantId as jest.Mock).mockResolvedValue("tenant-123");
    mockPrisma.chatbot.findFirst.mockResolvedValue(null);

    const response = await DELETE(new NextRequest("http://localhost"), PARAMS);
    expect(response.status).toBe(404);
  });

  test("does not delete bots belonging to other tenants", async () => {
    (requireTenantId as jest.Mock).mockResolvedValue("tenant-B");
    // Simulates: findFirst with tenantId=tenant-B returns null (bot belongs to tenant-A)
    mockPrisma.chatbot.findFirst.mockResolvedValue(null);

    const response = await DELETE(new NextRequest("http://localhost"), PARAMS);

    expect(response.status).toBe(404);
    expect(mockPrisma.chatbot.delete).not.toHaveBeenCalled();
  });

  test("returns 401 when not authenticated", async () => {
    (requireTenantId as jest.Mock).mockRejectedValue(
      new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 })
    );

    const response = await DELETE(new NextRequest("http://localhost"), PARAMS);
    expect(response.status).toBe(401);
  });
});
