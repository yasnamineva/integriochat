import { z } from "zod";

// ─── Chatbot ──────────────────────────────────────────────────────────────────

export const AI_MODELS = ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"] as const;
export type AiModel = (typeof AI_MODELS)[number];

export const CreateChatbotSchema = z.object({
  name: z.string().min(1).max(100).default("My Chatbot"),
  systemPrompt: z.string().min(1).max(4000).default("You are a helpful assistant."),
  tone: z.enum(["professional", "friendly", "casual", "formal"]).default("professional"),
  leadCapture: z.boolean().default(false),
  websiteUrl: z.string().url().optional().nullable(),
  // AI settings
  aiModel: z.enum(AI_MODELS).default("gpt-4o-mini"),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().min(100).max(4000).default(500),
  fallbackMsg: z.string().max(500).optional(),
  // White label / appearance
  chatTitle: z.string().max(100).optional().nullable(),
  chatAvatar: z.string().url().optional().nullable(),
  themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1"),
  widgetPosition: z.enum(["bottom-right", "bottom-left"]).default("bottom-right"),
  widgetTheme: z.enum(["light", "dark"]).default("light"),
  initialMessage: z.string().max(500).optional(),
  suggestedQs: z.array(z.string().max(200)).max(4).default([]),
  // Training
  autoRetrain: z.boolean().default(false),
  // Per-chatbot spending caps (USAGE plan only)
  monthlyMessageLimit: z.number().int().min(1).nullable().optional(),
  monthlySpendLimitCents: z.number().int().min(1).nullable().optional(),
});

export const UpdateChatbotSchema = CreateChatbotSchema.partial();

export const CreateCustomQASchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(4000),
});

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const ChatMessageSchema = z.object({
  chatbotId: z.string().uuid(),
  sessionId: z.string().min(1),
  message: z.string().min(1).max(2000),
});

// ─── Demo Link ────────────────────────────────────────────────────────────────

export const CreateDemoLinkSchema = z.object({
  chatbotId: z.string().uuid(),
  /** Duration in days (default 7) */
  durationDays: z.number().int().min(1).max(90).default(7),
});

// ─── Tenant ───────────────────────────────────────────────────────────────────

export const CreateTenantSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  allowedDomains: z.array(z.string().url()).default([]),
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100).optional(),
  companyName: z.string().min(1).max(100),
});

// ─── Stripe Webhook ───────────────────────────────────────────────────────────

/** Raw body is a Buffer; signature verified before parsing. */
export const StripeWebhookSchema = z.object({
  type: z.string(),
  data: z.object({
    object: z.record(z.unknown()),
  }),
});

export type CreateChatbot = z.infer<typeof CreateChatbotSchema>;
export type UpdateChatbot = z.infer<typeof UpdateChatbotSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type CreateDemoLink = z.infer<typeof CreateDemoLinkSchema>;
export type CreateTenant = z.infer<typeof CreateTenantSchema>;
export type Login = z.infer<typeof LoginSchema>;
export type Register = z.infer<typeof RegisterSchema>;
export type CreateCustomQA = z.infer<typeof CreateCustomQASchema>;
