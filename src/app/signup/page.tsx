"use client";

import { useState } from "react";
import { Button, Field, Logo } from "@/components/ui";
import { errorHe } from "@/lib/messages";

const maxYear = new Date().getFullYear() - 18;

export default function SignupPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("sending");
    setError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inviteCode: form.get("inviteCode"),
        email: form.get("email"),
        displayName: form.get("displayName") || undefined,
        birthYear: Number(form.get("birthYear")),
        ageConfirmed: form.get("ageConfirmed") === "on",
      }),
    });
    if (res.ok) return setStatus("sent");
    setError(errorHe((await res.json().catch(() => ({}))).error));
    setStatus("idle");
  }

  if (status === "sent") {
    return (
      <div className="flex flex-1 flex-col justify-center gap-4 text-center">
        <Logo />
        <h1 className="text-2xl font-bold">בדוק את האימייל שלך</h1>
        <p className="text-muted">אם הכל תקין, שלחנו לך קישור כניסה. הקישור פותח את החשבון ישר באפליקציה.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-5">
      <Logo />
      <h1 className="text-2xl font-bold">הצטרפות לבטא</h1>
      <Field label="קוד הזמנה" name="inviteCode" required autoComplete="off" dir="ltr" />
      <Field label="אימייל" name="email" type="email" required autoComplete="email" dir="ltr" />
      <Field label="איך לקרוא לך? (לא חובה)" name="displayName" maxLength={40} />
      <Field label="שנת לידה" name="birthYear" type="number" required min={1900} max={maxYear} inputMode="numeric" dir="ltr" />
      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="ageConfirmed" required className="mt-1 size-5 accent-neon-purple" />
        אני בן או בת 18 ומעלה, ומאשר/ת שהקול שלי מעובד על ידי OpenAI לצורך השיחה, ושהתמלולים נשמרים מוצפנים ל-30 יום.
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" tone="green" disabled={status === "sending"} className="mt-auto">
        {status === "sending" ? "שולח..." : "שלחו לי קישור כניסה"}
      </Button>
    </form>
  );
}
