-- Stage 3C: tutor feedback, XP and streaks.
-- XP is 10 per minute (max call 10 minutes) plus up to 50 bonus, so up to 150.
alter table public.feedback drop constraint if exists feedback_xp_check;
alter table public.feedback add constraint feedback_xp_check check (xp between 0 and 200);

-- Stores a session's feedback once and adds its XP and streak day to the user's progress.
-- Returns false when feedback for the session already exists, so a retry never counts twice.
-- A streak day needs a call of at least 2 minutes; days are Israel days.
create or replace function public.record_feedback(
  p_user uuid,
  p_session uuid,
  p_data jsonb,
  p_xp int
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_billed int;
  v_day date;
  v_last date;
begin
  select coalesce(s.billed_seconds, 0), (s.started_at at time zone 'Asia/Jerusalem')::date
    into v_billed, v_day
    from public.sessions s
   where s.id = p_session and s.user_id = p_user and s.status = 'ended';
  if not found then
    raise exception 'SESSION_NOT_ENDED';
  end if;

  insert into public.feedback (session_id, user_id, data, xp)
  values (p_session, p_user, p_data, p_xp)
  on conflict (session_id) do nothing;
  if not found then
    return false;
  end if;

  insert into public.progress (user_id) values (p_user) on conflict (user_id) do nothing;

  select last_active_date into v_last from public.progress where user_id = p_user for update;

  update public.progress
     set xp_total = xp_total + p_xp,
         streak_days = case
           when v_billed < 120 or v_last >= v_day then streak_days
           when v_last = v_day - 1 then streak_days + 1
           else 1
         end,
         last_active_date = case
           when v_billed < 120 then last_active_date
           else greatest(coalesce(last_active_date, v_day), v_day)
         end
   where user_id = p_user;

  return true;
end $$;

revoke execute on function public.record_feedback(uuid, uuid, jsonb, int) from public, anon, authenticated;
grant execute on function public.record_feedback(uuid, uuid, jsonb, int) to service_role;
