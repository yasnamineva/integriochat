const mockPrisma = {
  chatbot: {
    findFirst: jest.fn(),
  },
  message: {
    create: jest.fn(),
  },
};

jest.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

import { NextRequest } from "next/server";
import { POST } from "./route";

function makeRequest(body: unknown, origin = "https://example.com"): NextRequest {
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "origin": origin,
    },
  });
}

const validBody = {
  chatbotId: "123e4567-e89b-12d3-a456-426614174000",
  sessionId: "sess_test123",
  message: "Hello, how can you help me?",
};

const mockChatbot = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "Test Bot",
  tenantId: "tenant-123",
  systemPrompt: "You are helpful.",
  isActive: true,
  tenant: {
    allowedDomains: [],
    subscriptions: [{ status: "ACTIVE", createdAt: new Date() }],
  },
};

// ─── POST /api/chat ───────────────────────────────────────────────────────────

describe("POST /api/chat", () => {
  test("returns stub reply for valid request with active subscription", async () => {
    mockPrisma.chatbot.findFirst.mockResolvedValue(mockChatbot);
    mockPrisma.message.create.mockResolvedValue({});

    const response = await POST(makeRequest(validBody));
    const body = await response.json() as { success: boolean; data: { reply: string } };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(typeof body.data.reply).toBe("string");
  });

  test("also works with TRIALING subscription", async () => {
    mockPrisma.chatbot.findFirst.mockResolvedValue({
      ...mockChatbot,
      tenant: { ...mockChatbot.tenant, subscriptions: [{ status: "TRIALING" }] },
    });
    mockPrisma.message.create.mockResolvedValue({});

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(200);
  });

  test("returns 422 for invalid request body", async () => {
    const response = await POST(makeRequest({ message: "missing chatbotId" }));
    const body = await response.json() as { success: boolean };

    expect(response.status).toBe(422);
    expect(body.success).toBe(false);
  });

  test("returns 422 for non-UUID chatbotId", async () => {
    const response = await POST(makeRequest({ ...validBody, chatbotId: "not-a-uuid" }));
    expect(response.status).toBe(422);
  });

  test("returns 404 when chatbot does not exist", async () => {
    mockPrisma.chatbot.findFirst.mockResolvedValue(null);

    const response = await POST(makeRequest(validBody));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("Chatbot not found");
  });

  test("returns 403 when subscription is PAST_DUE", async () => {
    mockPrisma.chatbot.findFirst.mockResolvedValue({
      ...mockChatbot,
      tenant: { ...mockChatbot.tenant, subscriptions: [{ status: "PAST_DUE" }] },
    });

    const response = await POST(makeRequest(validBody));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("Subscription inactive");
  });

  test("returns 403 when subscription is CANCELED", async () => {
    mockPrisma.chatbot.findFirst.mockResolvedValue({
      ...mockChatbot,
      tenant: { ...mockChatbot.tenant, subscriptions: [{ status: "CANCELED" }] },
    });

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(403);
  });

  test("returns 403 when no subscription exists", async () => {
    mockPrisma.chatbot.findFirst.mockResolvedValue({
      ...mockChatbot,
      tenant: { ...mockChatbot.tenant, subscriptions: [] },
    });

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(403);
  });

  test("returns 403 when Origin is not in allowedDomains", async () => {
    mockPrisma.chatbot.findFirst.mockResolvedValue({
      ...mockChatbot,
      tenant: {
        allowedDomains: ["https://allowed.com"],
        subscriptions: [{ status: "ACTIVE" }],
      },
    });

    const response = await POST(makeRequest(validBody, "https://notallowed.com"));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("Origin not allowed");
  });

  test("allows any origin when allowedDomains is empty", async () => {
    mockPrisma.chatbot.findFirst.mockResolvedValue(mockChatbot); // allowedDomains: []
    mockPrisma.message.create.mockResolvedValue({});

    const response = await POST(makeRequest(validBody, "https://any-domain.com"));
    expect(response.status).toBe(200);
  });

  test("logs user message and assistant reply to database", async () => {
    mockPrisma.chatbot.findFirst.mockResolvedValue(mockChatbot);
    mockPrisma.message.create.mockResolvedValue({});

    await POST(makeRequest(validBody));

    // Two message.create calls: user + assistant
    expect(mockPrisma.message.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: "user" }) })
    );
    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: "assistant" }) })
    );
  });
});
