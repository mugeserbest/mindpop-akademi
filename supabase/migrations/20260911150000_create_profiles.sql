create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  learning_goal text,
  avatar_id text not null default 'bunny',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Kullanıcı kendi profilini görebilir"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Kullanıcı kendi profilini oluşturabilir"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Kullanıcı kendi profilini güncelleyebilir"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
