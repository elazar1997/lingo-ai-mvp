import { redirect } from "next/navigation";
import { CallScreen } from "@/app/app/call/call-screen";
import { isPersonaId, PERSONAS } from "@/lib/personas";

export default async function CallPage({ searchParams }: { searchParams: Promise<{ persona?: string }> }) {
  const { persona } = await searchParams;
  if (!isPersonaId(persona)) redirect("/app");
  return <CallScreen persona={PERSONAS[persona]} />;
}
