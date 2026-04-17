import {
  CreateChatbotSchema,
  UpdateChatbotSchema,
  ChatMessageSchema,
  CreateDemoLinkSchema,
  CreateTenantSchema,
  LoginSchema,
} from "./schemas";

// ─── CreateChatbotSchema ──────────────────────────────────────────────────────

describe("CreateChatbotSchema", () => {
  const valid = { name: "My Bot", systemPrompt: "Be helpful.", websiteUrl: "https://example.com" };

  test("accepts valid minimal input", () => {
    expect(CreateChatbotSchema.safeParse(valid).success).toBe(true);
  });

  test("defaults tone to professional", () => {
    const result = CreateChatbotSchema.safeParse(valid);
    expect(result.success && result.data.tone).toBe("professional");
  });

  test("defaults leadCapture to false", () => {
    const result = CreateChatbotSchema.safeParse(valid);
    expect(result.success && result.data.leadCapture).toBe(false);
  });

  test("rejects empty name", () => {
    expect(CreateChatbotSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  test("rejects name over 100 chars", () => {
    expect(CreateChatbotSchema.safeParse({ ...valid, name: "a".repeat(101) }).success).toBe(false);
  });

  test("rejects empty systemPrompt", () => {
    expect(CreateChatbotSchema.safeParse({ ...valid, systemPrompt: "" }).success).toBe(false);
  });

  test("rejects systemPrompt over 4000 chars", () => {
    expect(CreateChatbotSchema.safeParse({ ...valid, systemPrompt: "a".repeat(4001) }).success).toBe(false);
  });

  test("accepts valid tone values", () => {
    for (const tone of ["professional", "friendly", "casual", "formal"] as const) {
      expect(CreateChatbotSchema.safeParse({ ...valid, tone }).success).toBe(true);
    }
  });

  test("rejects invalid tone", () => {
    expect(CreateChatbotSchema.safeParse({ ...valid, tone: "aggressive" }).success).toBe(false);
  });

  test("accepts leadCapture true", () => {
    const result = CreateChatbotSchema.safeParse({ ...valid, leadCapture: true });
    expect(result.success && result.data.leadCapture).toBe(true);
  });
});

// ─── UpdateChatbotSchema ──────────────────────────────────────────────────────

describe("UpdateChatbotSchema", () => {
  test("accepts empty object (all fields optional)", () => {
    expect(UpdateChatbotSchema.safeParse({}).success).toBe(true);
  });

  test("accepts partial update", () => {
    expect(UpdateChatbotSchema.safeParse({ name: "New Name" }).success).toBe(true);
  });

  test("still validates name length when provided", () => {
    expect(UpdateChatbotSchema.safeParse({ name: "" }).success).toBe(false);
  });
});

// ─── ChatMessageSchema ────────────────────────────────────────────────────────

describe("ChatMessageSchema", () => {
  const valid = {
    chatbotId: "123e4567-e89b-12d3-a456-426614174000",
    sessionId: "sess_abc",
    message: "Hello!",
  };

  test("accepts valid input", () => {
    expect(ChatMessageSchema.safeParse(valid).success).toBe(true);
  });

  test("rejects non-UUID chatbotId", () => {
    expect(ChatMessageSchema.safeParse({ ...valid, chatbotId: "not-a-uuid" }).success).toBe(false);
  });

  test("rejects empty sessionId", () => {
    expect(ChatMessageSchema.safeParse({ ...valid, sessionId: "" }).success).toBe(false);
  });

  test("rejects empty message", () => {
    expect(ChatMessageSchema.safeParse({ ...valid, message: "" }).success).toBe(false);
  });

  test("rejects message over 2000 chars", () => {
    expect(ChatMessageSchema.safeParse({ ...valid, message: "a".repeat(2001) }).success).toBe(false);
  });
});

// ─── CreateDemoLinkSchema ─────────────────────────────────────────────────────

describe("CreateDemoLinkSchema", () => {
  const valid = { chatbotId: "123e4567-e89b-12d3-a456-426614174000" };

  test("accepts valid input", () => {
    expect(CreateDemoLinkSchema.safeParse(valid).success).toBe(true);
  });

  test("defaults durationDays to 7", () => {
    const result = CreateDemoLinkSchema.safeParse(valid);
    expect(result.success && result.data.durationDays).toBe(7);
  });

  test("rejects non-UUID chatbotId", () => {
    expect(CreateDemoLinkSchema.safeParse({ chatbotId: "bad" }).success).toBe(false);
  });

  test("rejects durationDays of 0", () => {
    expect(CreateDemoLinkSchema.safeParse({ ...valid, durationDays: 0 }).success).toBe(false);
  });

  test("rejects durationDays over 90", () => {
    expect(CreateDemoLinkSchema.safeParse({ ...valid, durationDays: 91 }).success).toBe(false);
  });

  test("accepts durationDays 1 to 90", () => {
    expect(CreateDemoLinkSchema.safeParse({ ...valid, durationDays: 1 }).success).toBe(true);
    expect(CreateDemoLinkSchema.safeParse({ ...valid, durationDays: 90 }).success).toBe(true);
  });
});

// ─── CreateTenantSchema ───────────────────────────────────────────────────────

describe("CreateTenantSchema", () => {
  const valid = { name: "Acme Corp", slug: "acme-corp" };

  test("accepts valid input", () => {
    expect(CreateTenantSchema.safeParse(valid).success).toBe(true);
  });

  test("defaults allowedDomains to empty array", () => {
    const result = CreateTenantSchema.safeParse(valid);
    expect(result.success && result.data.allowedDomains).toEqual([]);
  });

  test("rejects empty name", () => {
    expect(CreateTenantSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  test("rejects slug with uppercase letters", () => {
    expect(CreateTenantSchema.safeParse({ ...valid, slug: "AcmeCorp" }).success).toBe(false);
  });

  test("rejects slug with spaces", () => {
    expect(CreateTenantSchema.safeParse({ ...valid, slug: "acme corp" }).success).toBe(false);
  });

  test("rejects slug shorter than 2 chars", () => {
    expect(CreateTenantSchema.safeParse({ ...valid, slug: "a" }).success).toBe(false);
  });

  test("accepts valid allowedDomains URLs", () => {
    const result = CreateTenantSchema.safeParse({
      ...valid,
      allowedDomains: ["https://example.com"],
    });
    expect(result.success).toBe(true);
  });

  test("rejects non-URL allowedDomains", () => {
    expect(CreateTenantSchema.safeParse({ ...valid, allowedDomains: ["not-a-url"] }).success).toBe(false);
  });
});

// ─── LoginSchema ──────────────────────────────────────────────────────────────

describe("LoginSchema", () => {
  const valid = { email: "user@example.com", password: "password123" };

  test("accepts valid credentials", () => {
    expect(LoginSchema.safeParse(valid).success).toBe(true);
  });

  test("rejects invalid email", () => {
    expect(LoginSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });

  test("rejects password shorter than 8 chars", () => {
    expect(LoginSchema.safeParse({ ...valid, password: "short" }).success).toBe(false);
  });

  test("accepts password of exactly 8 chars", () => {
    expect(LoginSchema.safeParse({ ...valid, password: "exactly8" }).success).toBe(true);
  });
});
