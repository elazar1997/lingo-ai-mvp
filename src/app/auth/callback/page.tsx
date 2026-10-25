"use client";

import type { EmailOtpType } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Logo } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/browser";

const TYPES: EmailOtpType[] = ["invite", "magiclink", "email", "signup"];

// Landing page for email links. Invites and /login's links in Supabase's default
// templates (implicit flow) carry tokens in the URL fragment, PKCE links carry ?code=.
// Our custom templates link here with ?token_hash=, which is only redeemed when the
// person presses the button: mail scanners and link previews open links on their own,
// and would otherwise use up the one-time token before the person gets there.
export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<"working" | "confirm" | "failed">("working");
  const pending = useRef<{ tokenHash: string; type: EmailOtpType } | null>(null);

  // A failed link is fine if this browser is already signed in, e.g. the link was opened twice.
  const done = useCallback(
    async (error: unknown) => {
      if (!error || (await supabaseBrowser().auth.getUser()).data.user) router.replace("/app");
      else setStatus("failed");
    },
    [router],
  );

  useEffect(() => {
    const supabase = supabaseBrowser();
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    // Drop tokens from the address bar and history right away.
    window.history.replaceState(null, "", window.location.pathname);

    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    const code = query.get("code");
    const tokenHash = query.get("token_hash");
    const type = query.get("type") as EmailOtpType | null;

    if (tokenHash && type && TYPES.includes(type)) {
      pending.current = { tokenHash, type };
      // The URL is only readable after mount, so the button appears on the next tick.
      void Promise.resolve().then(() => setStatus("confirm"));
    } else if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => done(error));
    } else if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => done(error));
    } else {
      void Promise.resolve(true).then(done);
    }
  }, [done]);

  async function confirm() {
    const p = pending.current;
    if (!p) return;
    setStatus("working");
    const { error } = await supabaseBrowser().auth.verifyOtp({ token_hash: p.tokenHash, type: p.type });
    await done(error);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <Logo />
      {status === "confirm" ? (
        <Button onClick={confirm} className="mt-4">
          כניסה ל-Lingo AI
        </Button>
      ) : status === "failed" ? (
        <>
          <p>הקישור לא תקין או שכבר השתמשו בו. כל קישור עובד פעם אחת בלבד, אז צריך לבקש קישור חדש.</p>
          <a href="/login" className="text-neon-green underline">
            לשלוח קישור חדש
          </a>
        </>
      ) : (
        <p className="text-muted">מתחברים...</p>
      )}
    </div>
  );
}
