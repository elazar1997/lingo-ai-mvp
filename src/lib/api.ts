import { NextResponse } from "next/server";

// Error codes the client maps to Hebrew messages. Never echo internal errors.
export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "BAD_REQUEST"
  | "INVALID_INVITE"
  | "SESSION_ACTIVE"
  | "SESSION_NOT_ACTIVE"
  | "DAILY_LIMIT"
  | "BUDGET_LIMIT"
  | "PROFILE_MISSING"
  | "UPSTREAM_ERROR"
  | "INTERNAL";

const STATUS: Record<ApiErrorCode, number> = {
  UNAUTHENTICATED: 401,
  BAD_REQUEST: 400,
  INVALID_INVITE: 400,
  SESSION_ACTIVE: 409,
  SESSION_NOT_ACTIVE: 409,
  DAILY_LIMIT: 429,
  BUDGET_LIMIT: 503,
  PROFILE_MISSING: 403,
  UPSTREAM_ERROR: 502,
  INTERNAL: 500,
};

export function apiError(code: ApiErrorCode) {
  return NextResponse.json({ error: code }, { status: STATUS[code], headers: { "Cache-Control": "no-store" } });
}

export function apiOk<T>(body: T) {
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}

// Maps a coded exception raised by a Postgres function (e.g. raise exception 'DAILY_LIMIT').
export function dbErrorCode(message: string | undefined): ApiErrorCode {
  const known: ApiErrorCode[] = ["SESSION_ACTIVE", "SESSION_NOT_ACTIVE", "DAILY_LIMIT", "BUDGET_LIMIT"];
  return known.find((c) => message?.includes(c)) ?? "INTERNAL";
}
