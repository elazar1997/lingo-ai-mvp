import { redirect } from "next/navigation";
import { requireUser, supabaseUser } from "@/lib/supabase/server";
import { Onboarding } from "./onboarding";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const supabase = await supabaseUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, goal, interests, daily_goal_minutes")
    .eq("id", user.id)
    .maybeSingle();
  return (
    <Onboarding
      name={profile?.display_name ?? null}
      initial={{
        goal: profile?.goal ?? null,
        interests: profile?.interests ?? [],
        dailyGoal: profile?.daily_goal_minutes ?? 10,
      }}
    />
  );
}
