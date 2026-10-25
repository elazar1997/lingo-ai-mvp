"use client";

import { createClient } from "@supabase/supabase-js";
import { useState } from "react";
import { Button, Field, Logo } from "@/components/ui";

// The app's browser client always uses PKCE, whose links only work in the browser that
// asked for them. Login links use the implicit flow instead, so a link requested on a
// computer can be opened on a phone. /auth/callback reads its tokens from the fragment.
function linkSender() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export default function LoginPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email")).trim();
    setError(null);
    setStatus("sending");
    // shouldCreateUser: false keeps login from becoming a back door around invites.
    const { error } = await linkSender().auth.signInWithOtp({
      email,
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

  if (status === "sent") {
    return (
      <div className="flex flex-1 flex-col justify-center gap-4 text-center">
        <Logo />
        <h1 className="text-title font-bold">נשאר רק לבדוק את האימייל</h1>
        <p className="text-muted">אם יש חשבון עם הכתובת הזו, שלחנו אליה קישור כניסה. אפשר לפתוח אותו בכל מכשיר, פעם אחת.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-5">
      <Logo />
      <h1 className="text-title font-bold">התחברות</h1>
      <Field label="אימייל" name="email" type="email" required autoComplete="email" dir="ltr" />
      {error && <p className="text-small text-danger">{error}</p>}
      <Button type="submit" disabled={status === "sending"} className="mt-auto">
        {status === "sending" ? "שולח..." : "שלחו לי קישור כניסה"}
      </Button>
    </form>
  );
}
