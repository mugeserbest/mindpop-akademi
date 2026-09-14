begin;

create table public.learning_journeys (
  id bigint generated always as identity primary key,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  goal_prompt text not null,

  goal_name text,

  reward_title text,

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'generating',
        'active',
        'completed',
        'cancelled'
      )
    ),

  current_world_position smallint
    check (
      current_world_position between 1 and 5
    ),

  total_xp bigint not null default 0
    check (
      total_xp >= 0
    ),

  started_at timestamptz,

  completed_at timestamptz,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint learning_journeys_goal_prompt_length_check
    check (
      char_length(btrim(goal_prompt)) between 3 and 500
    ),

  constraint learning_journeys_goal_name_length_check
    check (
      goal_name is null
      or char_length(btrim(goal_name)) between 3 and 200
    ),

  constraint learning_journeys_reward_title_length_check
    check (
      reward_title is null
      or char_length(btrim(reward_title)) between 2 and 100
    )
);

create index learning_journeys_user_id_idx
  on public.learning_journeys(user_id);

create unique index learning_journeys_one_open_per_user_idx
  on public.learning_journeys(user_id)
  where status in ('draft', 'generating', 'active');

alter table public.learning_journeys
  enable row level security;

create policy "Kullanıcı kendi yolculuklarını görebilir"
  on public.learning_journeys
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
  );

create policy "Kullanıcı kendi yolculuğunu oluşturabilir"
  on public.learning_journeys
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
  );

revoke all
  on public.learning_journeys
  from public, anon, authenticated;

grant select
  on public.learning_journeys
  to authenticated;

grant insert (user_id, goal_prompt)
  on public.learning_journeys
  to authenticated;

revoke all
  on sequence public.learning_journeys_id_seq
  from public, anon, authenticated;

grant usage, select
  on sequence public.learning_journeys_id_seq
  to authenticated;

grant all
  on public.learning_journeys
  to service_role;

grant all
  on sequence public.learning_journeys_id_seq
  to service_role;

commit;
