begin;

create table public.journey_worlds (
  id bigint generated always as identity primary key,

  journey_id bigint not null
    references public.learning_journeys(id)
    on delete cascade,

  world_number smallint not null
    check (world_number between 1 and 5),

  name text not null,
  description text,

  theme text not null
    check (
      theme in (
        'forest',
        'village',
        'ocean',
        'volcano',
        'kingdom'
      )
    ),

  xp_required bigint not null
    check (xp_required > 0),

  xp_earned bigint not null default 0
    check (xp_earned >= 0),

  quiz_pass_score smallint not null
    check (quiz_pass_score between 0 and 100),

  quiz_best_score smallint not null default 0
    check (quiz_best_score between 0 and 100),

  main_task_approved boolean not null default false,

  status text not null default 'locked'
    check (
      status in (
        'locked',
        'active',
        'completed'
      )
    ),

  unlocked_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint journey_worlds_name_length
    check (char_length(name) between 2 and 100),

  constraint journey_worlds_description_length
    check (
      description is null
      or char_length(description) <= 1000
    ),

  constraint journey_worlds_number_unique
    unique (journey_id, world_number)
);

create unique index journey_worlds_one_active_world_idx
  on public.journey_worlds (journey_id)
  where status = 'active';

alter table public.journey_worlds enable row level security;

create policy "Kullanıcı kendi dünyalarını görebilir"
  on public.journey_worlds
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.learning_journeys as journey
      where journey.id = journey_worlds.journey_id
        and journey.user_id = (select auth.uid())
    )
  );

revoke all on table public.journey_worlds
  from public, anon, authenticated;

grant select on table public.journey_worlds
  to authenticated;

revoke all on sequence public.journey_worlds_id_seq
  from public, anon, authenticated;

grant all on table public.journey_worlds
  to service_role;

grant all on sequence public.journey_worlds_id_seq
  to service_role;

commit;
