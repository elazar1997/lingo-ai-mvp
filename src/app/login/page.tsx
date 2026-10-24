"use client";

import { useState } from "react";
import { Button, Field, Logo } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email"));
    setStatus("sending");
    // shouldCreateUser: false keeps login from becoming a back door around invites.
    await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    // Same message either way, so the form doesn't reveal who has an account.
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="flex flex-1 flex-col justify-center gap-4 text-center">
        <Logo />
        <h1 className="text-2xl font-bold">בדוק את האימייל שלך</h1>
        <p className="text-muted">אם יש חשבון עם הכתובת הזו, שלחנו אליה קישור כניסה.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-5">
      <Logo />
      <h1 className="text-2xl font-bold">התחברות</h1>
      <Field label="אימייל" name="email" type="email" required autoComplete="email" dir="ltr" />
      <Button type="submit" disabled={status === "sending"} className="mt-auto">
        {status === "sending" ? "שולח..." : "שלחו לי קישור כניסה"}
      </Button>
    </form>
  );
}
