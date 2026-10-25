import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { SummaryView } from "./summary-view";

export const dynamic = "force-dynamic";

export default async function SummaryPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const user = await requireUser();
  if (!user) redirect("/login");
  const { sessionId } = await params;
  return <SummaryView sessionId={sessionId} />;
}
