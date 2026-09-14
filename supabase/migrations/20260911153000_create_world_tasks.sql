begin;

create table public.world_tasks (
  id bigint generated always as identity primary key,

  world_id bigint not null
    references public.journey_worlds(id)
    on delete cascade,

  task_type text not null
    check (
      task_type in (
        'daily',
        'weekly',
        'main'
      )
    ),

  title text not null,
  description text,

  xp_reward bigint not null
    check (xp_reward > 0),

  display_order smallint not null default 1
    check (display_order > 0),

  status text not null default 'active'
    check (
      status in (
        'active',
        'completed',
        'expired'
      )
    ),

  available_from timestamptz not null default now(),
  expires_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint world_tasks_title_length
    check (
      char_length(btrim(title)) between 2 and 160
    ),

  constraint world_tasks_description_length
    check (
      description is null
      or char_length(description) <= 2000
    ),

  constraint world_tasks_period_rules
    check (
      (
        task_type in ('daily', 'weekly')
        and expires_at is not null
        and expires_at > available_from
      )
      or
      (
        task_type = 'main'
        and expires_at is null
      )
    ),

  constraint world_tasks_completion_time
    check (
      (
        status = 'completed'
        and completed_at is not null
      )
      or
      (
        status <> 'completed'
        and completed_at is null
      )
    )
);

create index world_tasks_world_status_idx
  on public.world_tasks (
    world_id,
    task_type,
    status
  );

create unique index world_tasks_one_main_task_idx
  on public.world_tasks (world_id)
  where task_type = 'main';

alter table public.world_tasks
  enable row level security;

create policy "Kullanıcı kendi görevlerini görebilir"
  on public.world_tasks
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.journey_worlds as world
      join public.learning_journeys as journey
        on journey.id = world.journey_id
      where world.id = world_tasks.world_id
        and journey.user_id = (select auth.uid())
    )
  );

revoke all on table public.world_tasks
  from public, anon, authenticated;

grant select on table public.world_tasks
  to authenticated;

revoke all on sequence public.world_tasks_id_seq
  from public, anon, authenticated;

grant all on table public.world_tasks
  to service_role;

grant all on sequence public.world_tasks_id_seq
  to service_role;

commit;
