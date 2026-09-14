begin;

-- 1. XP banka hareketleri
create table public.xp_transactions (
  id bigint generated always as identity primary key,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  journey_id bigint not null
    references public.learning_journeys(id)
    on delete cascade,

  world_id bigint
    references public.journey_worlds(id)
    on delete cascade,

  task_id bigint
    references public.world_tasks(id)
    on delete cascade,

  source_type text not null
    check (
      source_type in (
        'task_completion',
        'world_bonus',
        'journey_bonus'
      )
    ),

  amount bigint not null
    check (amount > 0),

  event_key text not null,

  description text,

  details jsonb not null
    default '{}'::jsonb,

  earned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint xp_transactions_event_unique
    unique (user_id, event_key),

  constraint xp_transactions_event_key_length
    check (
      char_length(btrim(event_key)) between 3 and 200
    ),

  constraint xp_transactions_description_length
    check (
      description is null
      or char_length(description) <= 500
    ),

  constraint xp_transactions_details_object
    check (
      jsonb_typeof(details) = 'object'
    ),

  constraint xp_transactions_source_rules
    check (
      (
        source_type = 'task_completion'
        and world_id is not null
        and task_id is not null
      )
      or
      (
        source_type = 'world_bonus'
        and world_id is not null
        and task_id is null
      )
      or
      (
        source_type = 'journey_bonus'
        and world_id is null
        and task_id is null
      )
    )
);

-- 2. Kullanıcının kazandığı unvanlar
create table public.user_titles (
  id bigint generated always as identity primary key,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  journey_id bigint not null
    references public.learning_journeys(id)
    on delete cascade,

  title_name text not null,
  title_description text,

  is_selected boolean not null default false,

  earned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint user_titles_journey_unique
    unique (user_id, journey_id),

  constraint user_titles_name_length
    check (
      char_length(btrim(title_name)) between 2 and 100
    ),

  constraint user_titles_description_length
    check (
      title_description is null
      or char_length(title_description) <= 500
    )
);

-- Aynı görevin XP'si yalnızca bir defa verilebilir
create unique index xp_transactions_task_once_idx
  on public.xp_transactions (task_id)
  where source_type = 'task_completion';

-- Her dünya bonusu yalnızca bir defa verilebilir
create unique index xp_transactions_world_bonus_once_idx
  on public.xp_transactions (world_id)
  where source_type = 'world_bonus';

-- Yolculuk bitirme bonusu yalnızca bir defa verilebilir
create unique index xp_transactions_journey_bonus_once_idx
  on public.xp_transactions (journey_id)
  where source_type = 'journey_bonus';

-- XP geçmişini tarih sırasıyla hızlı gösterir
create index xp_transactions_user_earned_idx
  on public.xp_transactions (
    user_id,
    earned_at desc
  );

create index xp_transactions_journey_idx
  on public.xp_transactions (journey_id);

create index xp_transactions_world_idx
  on public.xp_transactions (world_id)
  where world_id is not null;

-- Kullanıcı aynı anda yalnızca bir unvan seçebilir
create unique index user_titles_one_selected_idx
  on public.user_titles (user_id)
  where is_selected = true;

create index user_titles_user_earned_idx
  on public.user_titles (
    user_id,
    earned_at desc
  );

-- RLS güvenliği
alter table public.xp_transactions
  enable row level security;

alter table public.user_titles
  enable row level security;

create policy "Kullanıcı kendi XP hareketlerini görebilir"
  on public.xp_transactions
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
  );

create policy "Kullanıcı kendi unvanlarını görebilir"
  on public.user_titles
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
  );

-- Tarayıcının bütün yetkilerini önce kapat
revoke all on table
  public.xp_transactions,
  public.user_titles
from public, anon, authenticated;

-- Kullanıcı yalnızca kendi kayıtlarını okuyabilir
grant select on table
  public.xp_transactions,
  public.user_titles
to authenticated;

-- Okul yönetimi kayıt oluşturabilir ve değiştirebilir
grant all on table
  public.xp_transactions,
  public.user_titles
to service_role;

revoke all on sequence
  public.xp_transactions_id_seq,
  public.user_titles_id_seq
from public, anon, authenticated;

grant all on sequence
  public.xp_transactions_id_seq,
  public.user_titles_id_seq
to service_role;

commit;
