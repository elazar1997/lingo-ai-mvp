"use client";

import type { EmailOtpType } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/browser";

const TYPES: EmailOtpType[] = ["invite", "magiclink", "email", "signup"];

// Landing page for links in Supabase's default email templates. Invites arrive with
// tokens in the URL fragment (never sent to the server), magic links with ?code= (PKCE),
// and custom templates with ?token_hash=. All three end in a session cookie.
export default function AuthCallback() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const supabase = supabaseBrowser();
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    // Drop tokens from the address bar and history right away.
    window.history.replaceState(null, "", window.location.pathname);

    async function finish() {
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const code = query.get("code");
      const tokenHash = query.get("token_hash");
      const type = query.get("type") as EmailOtpType | null;

      let error: unknown = true;
      if (accessToken && refreshToken) {
        ({ error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }));
      } else if (code) {
        ({ error } = await supabase.auth.exchangeCodeForSession(code));
      } else if (tokenHash && type && TYPES.includes(type)) {
        ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
      }

      if (error) setFailed(true);
      else router.replace("/app");
    }
    finish();
  }, [router]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <Logo />
      {failed ? (
        <>
          <p>הקישור לא תקין או שפג תוקפו.</p>
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
