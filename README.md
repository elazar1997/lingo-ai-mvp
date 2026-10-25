# Lingo AI (MVP)

Spanish conversation practice for Hebrew speakers, with two virtual teachers (Lucía and Vale) and real-time voice.
Invite-only beta, 18+.

Stack: Next.js 16 on Vercel, Supabase (Auth + Postgres), OpenAI Realtime API over WebRTC.

## How a conversation is secured

1. The browser asks `/api/realtime/session` to start a call (Supabase session cookie).
2. The server checks the daily quota and the monthly budget in one Postgres transaction (`start_session`), and reserves the worst-case cost.
3. The server asks OpenAI for a client secret that lives 60 seconds, with the persona prompt and voice locked in. The browser gets only that secret, never the API key.
4. The browser connects to OpenAI directly over WebRTC.
5. On hang-up, `/api/realtime/end` bills the real time (capped by the server clock), books the cost, and stores the transcript encrypted with AES-256-GCM.

## Limits

| Limit | Default | Where |
| --- | --- | --- |
| Talk time per user per day (Israel time) | 15 min | `DAILY_LIMIT_MINUTES` |
| Longest single call | 10 min | `MAX_SESSION_MINUTES` |
| Monthly API budget | $50 | `MONTHLY_BUDGET_USD` |
| New calls blocked at | 90% of budget ($45) | `BUDGET_BLOCK_RATIO` |
| Cost booked per minute (at least) | $0.10 | `RESERVE_USD_PER_MINUTE` |
| Transcript retention | 30 days | `pg_cron` job in the migration |

The booked cost per call is the larger of the client-reported token cost and the per-minute estimate, so the cap holds even if a client lies. As a second safety net, set a budget limit on the OpenAI project that owns the key.

## Setup

1. **Supabase**: create a project, then run the migration in `supabase/migrations` (SQL editor, or `npx supabase db push`).
   - Authentication > Sign In / Providers > Email: turn **off** "Allow new users to sign up". Accounts are created only through invites.
   - Authentication > URL Configuration: Site URL = your app URL; add `<APP_URL>/**` to Redirect URLs.
   - Email templates can stay as they are: `/auth/callback` handles Supabase's default links.
2. **OpenAI**: create a dedicated project, set its monthly budget, and create a key there.
3. **Env vars**: copy `.env.example` to `.env.local` and fill it in. On Vercel, add the same variables and mark secrets as Sensitive.
4. **Invite someone**: `node --env-file=.env.local scripts/create-invite.mjs friend@example.com "beta wave 1"`.
5. **Persona tests** (optional): set `PERSONA_TEST_KEY` (24+ random characters, Sensitive, Preview only), then open `<PREVIEW_URL>/api/admin/persona-test?key=...`. A second model plays a learner through each scenario in `src/lib/persona-test.ts` and the endpoint returns the transcripts. Add `&persona=vale` or `&scenario=injection` to run one.

## Scripts

```bash
npm run dev        # local dev server
npm test           # unit tests (crypto, cost)
npm run lint
npm run typecheck
npm run build
```
