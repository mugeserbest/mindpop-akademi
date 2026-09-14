create table public.pop_conversations (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  journey_id bigint references public.learning_journeys(id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index pop_conversations_user_last_message_idx on public.pop_conversations (user_id, last_message_at desc);

create table public.pop_messages (
  id bigint generated always as identity primary key,
  conversation_id bigint not null references public.pop_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'pop')),
  content text not null check (char_length(btrim(content)) between 1 and 4000),
  ai_model text,
  created_at timestamptz not null default now(),
  check ((role = 'user' and ai_model is null) or (role = 'pop'))
);

create index pop_messages_conversation_created_idx on public.pop_messages (conversation_id, created_at);

create table public.onboarding_sessions (
  conversation_id bigint primary key references public.pop_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_prompt text not null check (char_length(btrim(goal_prompt)) between 3 and 500),
  status text not null default 'collecting' check (status in ('collecting', 'ready', 'approved', 'cancelled')),
  roadmap_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index onboarding_sessions_one_open_per_user_idx on public.onboarding_sessions (user_id) where status in ('collecting', 'ready');

create table public.ai_generation_locks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.pop_conversations enable row level security;
alter table public.pop_messages enable row level security;
alter table public.onboarding_sessions enable row level security;
alter table public.ai_generation_locks enable row level security;

create policy "Kullanıcı kendi POP konuşmalarını görebilir" on public.pop_conversations for select to authenticated using ((select auth.uid()) = user_id);
create policy "Kullanıcı kendi POP mesajlarını görebilir" on public.pop_messages for select to authenticated
using (exists (select 1 from public.pop_conversations c where c.id = pop_messages.conversation_id and c.user_id = (select auth.uid())));
create policy "Kullanıcı kendi onboarding oturumunu görebilir" on public.onboarding_sessions for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.pop_conversations, public.pop_messages, public.onboarding_sessions, public.ai_generation_locks from public, anon, authenticated;
grant select on public.pop_conversations, public.pop_messages, public.onboarding_sessions to authenticated;
grant all on public.pop_conversations, public.pop_messages, public.onboarding_sessions, public.ai_generation_locks to service_role;
