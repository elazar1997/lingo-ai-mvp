-- Learning goals become a multi-select. The single goal column stays for the code on main
-- (the database is shared with production); the app writes goal = goals[1].

alter table public.profiles add column if not exists goals text[] not null default '{}';

update public.profiles set goals = array[goal] where goal is not null and goals = '{}';

alter table public.profiles add constraint profiles_goals_check
  check (goals <@ array['travel', 'business', 'studies', 'hobby', 'relocation', 'other']::text[]);

grant update (goals) on public.profiles to authenticated;
