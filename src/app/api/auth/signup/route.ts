import { z } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { normalizeInviteCode, sha256Hex } from "@/lib/crypto";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/server";

const currentYear = new Date().getUTCFullYear();

const Body = z.object({
  inviteCode: z.string().min(6).max(32),
  email: z.string().email().max(254),
  displayName: z.string().max(40).optional(),
  // Ages are checked by birth year; the year someone turns 18 is allowed.
  birthYear: z.number().int().min(1900).max(currentYear - 18),
  ageConfirmed: z.literal(true),
});

// Invite-only sign-up: public sign-ups are disabled in Supabase, so this route is
// the only way an account is created. It claims the invite, then sends an email invite.
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("BAD_REQUEST");
  const { inviteCode, email, displayName, birthYear } = parsed.data;

  const admin = supabaseAdmin();
  const codeHash = sha256Hex(normalizeInviteCode(inviteCode));

  const { data: claimed, error: claimError } = await admin.rpc("claim_invite", {
    p_code_hash: codeHash,
    p_email: email,
  });
  if (claimError) return apiError("INTERNAL");
  if (!claimed) return apiError("INVALID_INVITE");

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${env().APP_URL}/auth/callback`,
  });
  if (inviteError || !invited.user) {
    // Give the code back so a typo in the email doesn't burn the invite.
    await admin.from("invites").update({ used_at: null }).eq("code_hash", codeHash);
    // Same answer whether or not the email already has an account.
    return apiOk({ ok: true });
  }

  const userId = invited.user.id;
  await admin.from("invites").update({ used_by: userId }).eq("code_hash", codeHash);
  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: userId, birth_year: birthYear, display_name: displayName || null });
  await admin.from("progress").insert({ user_id: userId });
  if (profileError) return apiError("INTERNAL");

  return apiOk({ ok: true });
}
