import { redirect } from "next/navigation";
import { CallScreen } from "@/app/app/call/call-screen";
import { findLesson } from "@/content/path-es";
import { isPersonaId, PERSONAS } from "@/lib/personas";

// /app/call?persona=vale (free talk), ?lesson=<id> (a path lesson; the lesson picks the
// persona) or ?placement=1 (the voice level test with Lucía).
export default async function CallPage({
  searchParams,
}: {
  searchParams: Promise<{ persona?: string; lesson?: string; placement?: string }>;
}) {
  const { persona, lesson: lessonId, placement } = await searchParams;
  const lesson = findLesson(lessonId);
  if (lesson) return <CallScreen persona={PERSONAS[lesson.persona]} lesson={lesson} />;
  if (placement === "1") return <CallScreen persona={PERSONAS.lucia} placement />;
  if (!isPersonaId(persona)) redirect("/app");
  return <CallScreen persona={PERSONAS[persona]} />;
}
