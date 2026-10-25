import "server-only";
import { z } from "zod";

// Server-only configuration. Secrets live in Vercel environment variables and
// are never exposed through NEXT_PUBLIC_*.
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().startsWith("sk-"),
  // 32 random bytes, base64. Used for AES-256-GCM encryption of transcripts.
  TRANSCRIPT_ENCRYPTION_KEY: z.string().min(40),
  APP_URL: z.string().url(),

  REALTIME_MODEL: z.string().default("gpt-realtime-2.1-mini"),
  TRANSCRIBE_MODEL: z.string().default("gpt-4o-mini-transcribe"),
  DAILY_LIMIT_MINUTES: z.coerce.number().int().positive().default(15),
  MAX_SESSION_MINUTES: z.coerce.number().int().positive().default(10),
  MONTHLY_BUDGET_USD: z.coerce.number().positive().default(50),
  // New sessions are refused once spend + reservation would pass this share of the budget.
  BUDGET_BLOCK_RATIO: z.coerce.number().min(0.5).max(1).default(0.9),
  // Conservative per-minute reservation, reconciled with real token usage when a session ends.
  RESERVE_USD_PER_MINUTE: z.coerce.number().positive().default(0.1),
  // Comma-separated emails allowed into internal tools such as the voice comparison page.
  ADMIN_EMAILS: z.string().default(""),
  TTS_MODEL: z.string().default("gpt-4o-mini-tts"),
  // Enables /api/admin/persona-test when set (at least 24 characters).
  PERSONA_TEST_KEY: z.string().min(24).optional(),
  PERSONA_TEST_MODEL: z.string().default("gpt-5-mini"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function isAdmin(email: string | undefined): boolean {
  const admins = env()
    .ADMIN_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return !!email && admins.includes(email.toLowerCase());
}

export function env(): Env {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}
