import { apiError, apiOk } from "@/lib/api";
import { requireUser, supabaseAdmin, supabaseUser } from "@/lib/supabase/server";

// Deletes the auth user. Every table keyed to the user cascades, so profile,
// sessions, transcripts, feedback and progress go with it.
export async function POST() {
  const user = await requireUser();
  if (!user) return apiError("UNAUTHENTICATED");

  const { error } = await supabaseAdmin().auth.admin.deleteUser(user.id);
  if (error) return apiError("INTERNAL");

  await (await supabaseUser()).auth.signOut();
  return apiOk({ ok: true });
}
