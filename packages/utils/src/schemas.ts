import { z } from "zod";

// ─── Chatbot ──────────────────────────────────────────────────────────────────

export const CreateChatbotSchema = z.object({
  name: z.string().min(1).max(100),
  systemPrompt: z.string().min(1).max(4000),
  tone: z.enum(["professional", "friendly", "casual", "formal"]).default("professional"),
  leadCapture: z.boolean().default(false),
});

export const UpdateChatbotSchema = CreateChatbotSchema.partial();

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
