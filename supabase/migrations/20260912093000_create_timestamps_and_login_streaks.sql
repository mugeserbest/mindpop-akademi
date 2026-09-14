create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.user_login_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  login_date date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (user_id, login_date)
);

alter table public.user_login_days enable row level security;
create policy "Kullanıcı kendi giriş günlerini görebilir" on public.user_login_days for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.user_login_days from public, anon, authenticated;
grant select on public.user_login_days to authenticated;
grant all on public.user_login_days to service_role;

create or replace function public.record_user_login(p_user_id uuid)
returns void
language sql
set search_path to ''
as $$
  insert into public.user_login_days (user_id, login_date)
  values (p_user_id, current_date)
  on conflict (user_id, login_date) do nothing;
$$;

create or replace function public.get_current_login_streak(p_user_id uuid)
returns integer
language sql
stable
set search_path to ''
as $$
  with numbered_days as (
    select login_date, login_date - (row_number() over (order by login_date desc))::integer as streak_group
    from public.user_login_days
    where user_id = p_user_id
  ), latest_streak as (
    select streak_group from numbered_days order by login_date desc limit 1
  )
  select count(*)::integer from numbered_days
  where streak_group = (select streak_group from latest_streak);
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles', 'learning_journeys', 'journey_worlds', 'world_tasks', 'user_titles', 'world_quizzes', 'quiz_attempts', 'main_task_steps', 'main_task_submissions', 'onboarding_sessions']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', table_name || '_set_updated_at', table_name);
  end loop;
end;
$$;

revoke all on function public.record_user_login(uuid), public.get_current_login_streak(uuid) from public, anon, authenticated;
grant execute on function public.record_user_login(uuid), public.get_current_login_streak(uuid) to service_role;
