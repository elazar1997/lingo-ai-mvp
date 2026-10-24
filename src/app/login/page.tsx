"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Logo } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Status = "idle" | "sending" | "sent" | "verifying";

export default function LoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function sendLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("email")).trim();
    setEmail(value);
    setError(null);
    setStatus("sending");
    // shouldCreateUser: false keeps login from becoming a back door around invites.
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email: value,
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    // Rate limits are worth reporting; anything else gets the same message, so the form
    // doesn't reveal who has an account.
    if (error?.status === 429) {
      setError("נשלחו יותר מדי מיילים בזמן קצר. נסו שוב בעוד כמה דקות.");
      setStatus("idle");
      return;
    }
    setStatus("sent");
  }

  // The code in the email works on any device, unlike the link, which only works once
  // and only in the browser that asked for it.
  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = String(new FormData(event.currentTarget).get("code")).replace(/\D/g, "");
    setError(null);
    setStatus("verifying");
    const { error } = await supabaseBrowser().auth.verifyOtp({ email, token, type: "email" });
    if (error) {
      setError("הקוד לא נכון או שפג תוקפו.");
      setStatus("sent");
      return;
    }
    router.replace("/app");
  }

  if (status === "sent" || status === "verifying") {
    return (
      <form onSubmit={verifyCode} className="flex flex-1 flex-col gap-5">
        <Logo />
        <h1 className="text-2xl font-bold">בדוק את האימייל שלך</h1>
        <p className="text-muted">אם יש חשבון עם הכתובת הזו, שלחנו אליה קישור כניסה וקוד. אפשר ללחוץ על הקישור או להקליד כאן את הקוד.</p>
        <Field
          label="קוד מהמייל"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,10}"
          required
          dir="ltr"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={status === "verifying"} className="mt-auto">
          {status === "verifying" ? "בודק..." : "כניסה"}
        </Button>
        <button type="button" onClick={() => setStatus("idle")} className="text-sm text-muted underline">
          לשלוח שוב / כתובת אחרת
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendLink} className="flex flex-1 flex-col gap-5">
      <Logo />
      <h1 className="text-2xl font-bold">התחברות</h1>
      <Field label="אימייל" name="email" type="email" required autoComplete="email" dir="ltr" defaultValue={email} />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={status === "sending"} className="mt-auto">
        {status === "sending" ? "שולח..." : "שלחו לי קישור כניסה"}
      </Button>
    </form>
  );
}
