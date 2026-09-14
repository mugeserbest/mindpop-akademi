create table if not exists public.user_badges (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null check (
    char_length(btrim(badge_key)) between 2 and 100
  ),
  earned_at timestamp with time zone not null default now(),
  details jsonb not null default '{}'::jsonb check (
    jsonb_typeof(details) = 'object'
  ),
  unique (user_id, badge_key)
);

alter table public.user_badges enable row level security;

create policy "Kullanıcı kendi rozetlerini görebilir"
on public.user_badges
for select
to authenticated
using ((select auth.uid()) = user_id);
