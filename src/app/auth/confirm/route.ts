import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseUser } from "@/lib/supabase/server";

const TYPES: EmailOtpType[] = ["invite", "magiclink", "email", "signup"];

// Landing page for the links in Supabase emails (invite and magic-link login).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const supabase = await supabaseUser();

  let ok = false;
  if (tokenHash && type && TYPES.includes(type)) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }

  const url = request.nextUrl.clone();
  url.search = "";
  url.pathname = ok ? "/app" : "/login";
  if (!ok) url.searchParams.set("error", "link");
  return NextResponse.redirect(url);
}
