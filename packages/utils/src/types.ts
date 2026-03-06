// ─── Standard API response wrapper ───────────────────────────────────────────

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Session / Auth ───────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "CLIENT";
  tenantId: string;
}

// ─── Chatbot ──────────────────────────────────────────────────────────────────

export interface ChatbotSummary {
  id: string;
  name: string;
  tone: string;
  isActive: boolean;
  leadCapture: boolean;
  createdAt: string;
}

export interface ChatbotDetail extends ChatbotSummary {
  systemPrompt: string;
  tenantId: string;
  updatedAt: string;
}

// ─── Demo Link ────────────────────────────────────────────────────────────────

export interface DemoLinkDetail {
  id: string;
  token: string;
  chatbotId: string;
  expiresAt: string;
  createdAt: string;
}

// ─── Tenant ───────────────────────────────────────────────────────────────────

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  allowedDomains: string[];
  createdAt: string;
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";

export interface SubscriptionDetail {
  id: string;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
