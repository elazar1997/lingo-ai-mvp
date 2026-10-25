import { z } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { requireUser, supabaseUser } from "@/lib/supabase/server";

// Feedback for one of the user's calls, or { status: "pending" } while the tutor works.
export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const user = await requireUser();
  if (!user) return apiError("UNAUTHENTICATED");
  const { sessionId } = await params;
  if (!z.string().uuid().safeParse(sessionId).success) return apiError("BAD_REQUEST");

  // RLS limits both reads to the user's own rows.
  const supabase = await supabaseUser();
  const [{ data: feedback }, { data: progress }] = await Promise.all([
    supabase.from("feedback").select("data, xp").eq("session_id", sessionId).maybeSingle(),
    supabase.from("progress").select("xp_total, streak_days").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!feedback) return apiOk({ status: "pending" });
  return apiOk({ status: "ready", feedback: feedback.data, progress });
}
