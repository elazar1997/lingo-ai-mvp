import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/env";
import { requireUser } from "@/lib/supabase/server";
import { VoicePicker } from "@/app/app/voices/voice-picker";

export const dynamic = "force-dynamic";

export default async function VoicesPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) notFound();
  return <VoicePicker />;
}
