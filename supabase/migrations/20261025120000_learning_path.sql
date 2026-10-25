-- Stage 4 PR 1: onboarding, learning path progress, lesson and placement sessions.
-- Backward compatible with the code on main (the database is shared with production):
-- new columns have defaults and the old start_session signature stays in place.

-- ---------------------------------------------------------------- profiles

-- Learning goal: new set of values; old ones are mapped.
alter table public.profiles drop constraint if exists profiles_goal_check;
update public.profiles set goal = 'business' where goal = 'work';
update public.profiles set goal = 'hobby' where goal = 'fun';
alter table public.profiles add constraint profiles_goal_check
  check (goal in ('travel', 'business', 'studies', 'hobby', 'relocation', 'other'));

alter table public.profiles
  add column if not exists interests text[] not null default '{}',
  add column if not exists daily_goal_minutes int not null default 10,
  add column if not exists onboarded_at timestamptz;

alter table public.profiles add constraint profiles_interests_check
  check (cardinality(interests) <= 3 and interests <@ array[
    'food', 'music', 'sport', 'movies', 'tech', 'nature', 'art', 'family', 'travel', 'fashion'
  ]::text[]);
alter table public.profiles add constraint profiles_daily_goal_check
  check (daily_goal_minutes in (5, 10, 15));

grant update (interests, daily_goal_minutes, onboarded_at) on public.profiles to authenticated;

-- ---------------------------------------------------------------- sessions

alter table public.sessions
  add column if not exists kind text not null default 'free',
  add column if not exists lesson_id text;
alter table public.sessions add constraint sessions_kind_check
  check (kind in ('free', 'lesson', 'placement'));
alter table public.sessions add constraint sessions_lesson_check
  check ((kind = 'lesson') = (lesson_id is not null));

-- Lesson bonus XP (up to 60) comes on top of the call's XP (up to 150).
alter table public.feedback drop constraint if exists feedback_xp_check;
alter table public.feedback add constraint feedback_xp_check check (xp between 0 and 300);

-- ---------------------------------------------------------------- lesson progress

-- One row per lesson the user has tried. Lesson content lives in the app's code; ids are
-- stable. Whether a lesson is unlocked is computed from the previous lesson, not stored.
create table if not exists public.lesson_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null check (char_length(lesson_id) <= 40),
  stars int not null default 0 check (stars between 0 and 3),
  attempts int not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
alter table public.lesson_progress enable row level security;
create policy "own lesson progress read" on public.lesson_progress
  for select to authenticated using ((select auth.uid()) = user_id);
-- No client writes: only record_lesson (service role) changes progress.

-- ---------------------------------------------------------------- functions

-- start_session with a kind and lesson. The old 6-argument version stays for main.
create or replace function public.start_session(
  p_user uuid,
  p_persona text,
  p_daily_seconds int,
  p_max_session_seconds int,
  p_budget_block_usd numeric,
  p_reserve_usd_per_minute numeric,
  p_kind text,
  p_lesson text
) returns table (session_id uuid, allowed_seconds int)
language plpgsql security definer set search_path = '' as $$
declare
  v_used int;
  v_allowed int;
  v_reserve numeric;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('lingo_budget'));
  perform pg_advisory_xact_lock(hashtext(p_user::text));

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

  insert into public.sessions (user_id, persona_id, max_seconds, kind, lesson_id)
  values (p_user, p_persona, v_allowed, p_kind, p_lesson) returning id into v_id;

  insert into public.spend_ledger (session_id, user_id, kind, usd)
  values (v_id, p_user, 'reserve', v_reserve);

  return query select v_id, v_allowed;
end $$;

-- Records one lesson attempt: keeps the best stars, counts attempts, marks the first pass.
-- A passed lesson also counts as the day's streak, even when the call was under 2 minutes.
-- Called once per session, after record_feedback returned true (which already added XP).
create or replace function public.record_lesson(
  p_user uuid,
  p_session uuid,
  p_stars int
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_lesson text;
  v_day date;
  v_last date;
begin
  select s.lesson_id, (s.started_at at time zone 'Asia/Jerusalem')::date into v_lesson, v_day
    from public.sessions s
   where s.id = p_session and s.user_id = p_user and s.status = 'ended' and s.kind = 'lesson';
  if not found then
    raise exception 'SESSION_NOT_ENDED';
  end if;

  insert into public.lesson_progress as lp (user_id, lesson_id, stars, attempts, completed_at)
  values (p_user, v_lesson, p_stars, 1, case when p_stars > 0 then now() end)
  on conflict (user_id, lesson_id) do update
     set stars = greatest(lp.stars, excluded.stars),
         attempts = lp.attempts + 1,
         completed_at = coalesce(lp.completed_at, excluded.completed_at),
         updated_at = now();

  if p_stars > 0 then
    select last_active_date into v_last from public.progress where user_id = p_user for update;
    update public.progress
       set streak_days = case
             when v_last >= v_day then streak_days
             when v_last = v_day - 1 then streak_days + 1
             else 1
           end,
           last_active_date = greatest(coalesce(last_active_date, v_day), v_day)
     where user_id = p_user;
  end if;
end $$;

revoke execute on function public.start_session(uuid, text, int, int, numeric, numeric, text, text) from public, anon, authenticated;
revoke execute on function public.record_lesson(uuid, uuid, int) from public, anon, authenticated;
grant execute on function public.start_session(uuid, text, int, int, numeric, numeric, text, text) to service_role;
grant execute on function public.record_lesson(uuid, uuid, int) to service_role;
