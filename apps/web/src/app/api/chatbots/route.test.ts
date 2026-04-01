jest.mock("@/services/scraper.service", () => ({
  triggerScrapeInBackground: jest.fn(),
}));

const mockChatbots = [
  { id: "bot-1", name: "Bot One", tone: "professional", isActive: true, leadCapture: false, createdAt: new Date("2024-01-01") },
  { id: "bot-2", name: "Bot Two", tone: "friendly", isActive: false, leadCapture: true, createdAt: new Date("2024-01-02") },
];

const mockPrisma = {
  chatbot: {
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
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
import { GET, POST } from "./route";
import { requireTenantId } from "@/lib/db";

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.subscription.findFirst.mockResolvedValue(null); // no subscription → STARTER plan
  mockPrisma.chatbot.count.mockResolvedValue(0);            // 0 bots → under limit
});

// ─── GET /api/chatbots ────────────────────────────────────────────────────────

describe("GET /api/chatbots", () => {
  test("returns chatbot list for authenticated tenant", async () => {
    (requireTenantId as jest.Mock).mockResolvedValue("tenant-123");
    mockPrisma.chatbot.findMany.mockResolvedValue(mockChatbots);

    const response = await GET();
    const body = await response.json() as { success: boolean; data: unknown[] };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
  });

  test("queries only the current tenant's chatbots", async () => {
    (requireTenantId as jest.Mock).mockResolvedValue("tenant-abc");
    mockPrisma.chatbot.findMany.mockResolvedValue([]);

    await GET();

    expect(mockPrisma.chatbot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: "tenant-abc" } })
    );
  });

  test("returns 401 when not authenticated", async () => {
    (requireTenantId as jest.Mock).mockRejectedValue(
      new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 })
    );

    const response = await GET();
    expect(response.status).toBe(401);
  });

  test("returns 500 on unexpected error", async () => {
    (requireTenantId as jest.Mock).mockResolvedValue("tenant-123");
    mockPrisma.chatbot.findMany.mockRejectedValue(new Error("DB down"));

    const response = await GET();
    const body = await response.json() as { success: boolean; error: string };

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
  });

  test("returns empty array when tenant has no chatbots", async () => {
    (requireTenantId as jest.Mock).mockResolvedValue("tenant-123");
    mockPrisma.chatbot.findMany.mockResolvedValue([]);

    const response = await GET();
    const body = await response.json() as { success: boolean; data: unknown[] };

    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });
});

// ─── POST /api/chatbots ───────────────────────────────────────────────────────

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/chatbots", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/chatbots", () => {
  const validBody = {
    name: "My Bot",
    systemPrompt: "You are a helpful assistant.",
    tone: "professional",
    leadCapture: false,
  };

  test("creates a chatbot and returns 201", async () => {
    (requireTenantId as jest.Mock).mockResolvedValue("tenant-123");
    mockPrisma.chatbot.create.mockResolvedValue({ id: "new-bot-id", ...validBody, tenantId: "tenant-123" });

    const response = await POST(makePostRequest(validBody));
    const body = await response.json() as { success: boolean; data: { id: string } };

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("new-bot-id");
  });

  test("injects tenantId into create call", async () => {
    (requireTenantId as jest.Mock).mockResolvedValue("tenant-xyz");
    mockPrisma.chatbot.create.mockResolvedValue({ id: "bot-id", ...validBody });

    await POST(makePostRequest(validBody));

    expect(mockPrisma.chatbot.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tenantId: "tenant-xyz" }) })
    );
  });

  test("returns 422 when body is invalid", async () => {
    (requireTenantId as jest.Mock).mockResolvedValue("tenant-123");

    const response = await POST(makePostRequest({ name: "", systemPrompt: "x" }));
    const body = await response.json() as { success: boolean };

    expect(response.status).toBe(422);
    expect(body.success).toBe(false);
  });

  test("returns 422 for invalid field values", async () => {
    (requireTenantId as jest.Mock).mockResolvedValue("tenant-123");

    // name: "" still fails min(1) even though name is optional when omitted
    const response = await POST(makePostRequest({ name: "" }));
    expect(response.status).toBe(422);
  });

  test("returns 401 when not authenticated", async () => {
    (requireTenantId as jest.Mock).mockRejectedValue(
      new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 })
    );

    const response = await POST(makePostRequest(validBody));
    expect(response.status).toBe(401);
  });

  test("applies defaults for optional fields", async () => {
    (requireTenantId as jest.Mock).mockResolvedValue("tenant-123");
    mockPrisma.chatbot.create.mockResolvedValue({ id: "bot-id" });

    await POST(makePostRequest({ name: "Bot", systemPrompt: "Help users." }));

    expect(mockPrisma.chatbot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tone: "professional", leadCapture: false }),
      })
    );
  });
});
