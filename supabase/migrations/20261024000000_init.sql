-- Lingo AI MVP: core schema, row level security, quota/budget functions, retention.
-- All writes except profile edits go through the server (service_role).

create extension if not exists pg_cron;

-- ---------------------------------------------------------------- tables

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 40),
  birth_year int not null check (birth_year between 1900 and extract(year from now())::int - 18),
  spanish_level text not null default 'beginner'
    check (spanish_level in ('beginner', 'elementary', 'intermediate', 'advanced')),
  goal text check (goal in ('travel', 'work', 'fun', 'other')),
  preferred_persona text check (preferred_persona in ('lucia', 'vale')),
  created_at timestamptz not null default now()
);

-- Invite codes are stored hashed (sha256 hex); the plain code is shown once to the admin.
create table public.invites (
  code_hash text primary key,
  email text,
  note text,
  expires_at timestamptz not null default now() + interval '30 days',
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  persona_id text not null check (persona_id in ('lucia', 'vale')),
  status text not null default 'active' check (status in ('active', 'ended')),
  max_seconds int not null,
  billed_seconds int,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index sessions_user_started on public.sessions (user_id, started_at desc);

-- Transcripts are encrypted by the app (AES-256-GCM) before they reach the database.
create table public.transcripts (
  session_id uuid primary key references public.sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  ciphertext text not null,
  created_at timestamptz not null default now()
);
create index transcripts_created on public.transcripts (created_at);

create table public.feedback (
  session_id uuid primary key references public.sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  xp int not null check (xp between 0 and 100),
  created_at timestamptz not null default now()
);

create table public.progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  xp_total int not null default 0,
  streak_days int not null default 0,
  last_active_date date,
  streak_freezes int not null default 1,
  badges text[] not null default '{}'
);

-- Spend ledger for the monthly API budget. Rows outlive the user (user_id set null)
-- so the month's total stays correct after an account is deleted.
create table public.spend_ledger (
  id bigint generated always as identity primary key,
  session_id uuid references public.sessions (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('reserve', 'reconcile', 'text')),
  usd numeric(10, 4) not null,
  created_at timestamptz not null default now()
);
create index spend_ledger_created on public.spend_ledger (created_at);

-- ---------------------------------------------------------------- RLS

alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.sessions enable row level security;
alter table public.transcripts enable row level security;
alter table public.feedback enable row level security;
alter table public.progress enable row level security;
alter table public.spend_ledger enable row level security;

create policy "own profile read" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "own profile update" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "own sessions read" on public.sessions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own feedback read" on public.feedback
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own progress read" on public.progress
  for select to authenticated using ((select auth.uid()) = user_id);
-- transcripts, invites, spend_ledger: no client policies (server only).

-- Users may only edit harmless profile fields.
revoke update on public.profiles from authenticated;
grant update (display_name, spanish_level, goal, preferred_persona) on public.profiles to authenticated;

-- ---------------------------------------------------------------- functions

create or replace function public.month_spend_usd()
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(sum(usd), 0) from public.spend_ledger
  where created_at >= date_trunc('month', now());
$$;

-- Atomically checks the daily quota and monthly budget, then opens a session and
-- reserves its worst-case cost. Raises a coded error when a limit is hit.
create or replace function public.start_session(
  p_user uuid,
  p_persona text,
  p_daily_seconds int,
  p_max_session_seconds int,
  p_budget_block_usd numeric,
  p_reserve_usd_per_minute numeric
) returns table (session_id uuid, allowed_seconds int)
language plpgsql security definer set search_path = '' as $$
declare
  v_used int;
  v_allowed int;
  v_reserve numeric;
  v_id uuid;
begin
  -- One lock for the budget (global) and one per user (quota).
  perform pg_advisory_xact_lock(hashtext('lingo_budget'));
  perform pg_advisory_xact_lock(hashtext(p_user::text));

  -- Close sessions the client never ended: they count as their full length.
  update public.sessions s
     set status = 'ended', ended_at = s.started_at + make_interval(secs => s.max_seconds),
         billed_seconds = s.max_seconds
   where s.user_id = p_user and s.status = 'active'
     and s.started_at + make_interval(secs => s.max_seconds + 60) < now();

  if exists (select 1 from public.sessions s where s.user_id = p_user and s.status = 'active') then
    raise exception 'SESSION_ACTIVE';
  end if;

  select coalesce(sum(coalesce(s.billed_seconds, s.max_seconds)), 0) into v_used
    from public.sessions s
   where s.user_id = p_user
     and s.started_at >= date_trunc('day', now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem';

  v_allowed := least(p_max_session_seconds, p_daily_seconds - v_used);
  if v_allowed < 30 then
    raise exception 'DAILY_LIMIT';
  end if;

  v_reserve := round(v_allowed / 60.0 * p_reserve_usd_per_minute, 4);
  if public.month_spend_usd() + v_reserve > p_budget_block_usd then
    raise exception 'BUDGET_LIMIT';
  end if;

  insert into public.sessions (user_id, persona_id, max_seconds)
  values (p_user, p_persona, v_allowed) returning id into v_id;

  insert into public.spend_ledger (session_id, user_id, kind, usd)
  values (v_id, p_user, 'reserve', v_reserve);

  return query select v_id, v_allowed;
end $$;

-- Ends a session and books its cost. The billed time is capped by the server clock,
-- and the booked cost never goes below the per-minute estimate, so a client that
-- under-reports usage cannot stretch the monthly budget.
create or replace function public.end_session(
  p_user uuid,
  p_session uuid,
  p_seconds int,
  p_reported_usd numeric,
  p_usd_per_minute numeric
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_max int;
  v_started timestamptz;
  v_billed int;
  v_reserved numeric;
  v_cost numeric;
begin
  select s.max_seconds, s.started_at into v_max, v_started from public.sessions s
   where s.id = p_session and s.user_id = p_user and s.status = 'active'
   for update;
  if not found then
    raise exception 'SESSION_NOT_ACTIVE';
  end if;

  v_billed := greatest(0, least(p_seconds, v_max, ceil(extract(epoch from now() - v_started))::int));

  update public.sessions
     set status = 'ended', ended_at = now(), billed_seconds = v_billed
   where id = p_session;

  select coalesce(sum(usd), 0) into v_reserved from public.spend_ledger
   where session_id = p_session;

  v_cost := greatest(coalesce(p_reported_usd, 0), round(v_billed / 60.0 * p_usd_per_minute, 4));

  insert into public.spend_ledger (session_id, user_id, kind, usd)
  values (p_session, p_user, 'reconcile', v_cost - v_reserved);
end $$;

-- Marks an invite as used. Returns false if it is missing, used, expired, or bound to another email.
create or replace function public.claim_invite(p_code_hash text, p_email text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.invites
     set used_at = now()
   where code_hash = p_code_hash and used_at is null and expires_at > now()
     and (email is null or lower(email) = lower(p_email));
  return found;
end $$;

revoke execute on function public.month_spend_usd() from public, anon, authenticated;
revoke execute on function public.start_session(uuid, text, int, int, numeric, numeric) from public, anon, authenticated;
revoke execute on function public.end_session(uuid, uuid, int, numeric, numeric) from public, anon, authenticated;
revoke execute on function public.claim_invite(text, text) from public, anon, authenticated;
grant execute on function public.month_spend_usd() to service_role;
grant execute on function public.start_session(uuid, text, int, int, numeric, numeric) to service_role;
grant execute on function public.end_session(uuid, uuid, int, numeric, numeric) to service_role;
grant execute on function public.claim_invite(text, text) to service_role;

-- ---------------------------------------------------------------- retention

-- Transcripts and feedback are deleted after 30 days. Runs daily at 03:00 UTC.
select cron.schedule(
  'lingo-retention',
  '0 3 * * *',
  $$
    delete from public.transcripts where created_at < now() - interval '30 days';
    delete from public.feedback where created_at < now() - interval '30 days';
    delete from public.invites where used_at is null and expires_at < now() - interval '30 days';
  $$
);
