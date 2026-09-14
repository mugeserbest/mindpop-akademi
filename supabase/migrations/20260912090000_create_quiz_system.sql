create table public.world_quizzes (
  id bigint generated always as identity primary key,
  world_id bigint not null references public.journey_worlds(id) on delete cascade,
  version smallint not null default 1 check (version > 0),
  title text not null check (char_length(btrim(title)) between 2 and 160),
  instructions text check (instructions is null or char_length(instructions) <= 2000),
  question_count smallint not null check (question_count between 1 and 100),
  questions_per_attempt smallint not null default 5 check (questions_per_attempt between 1 and 100),
  time_limit_minutes smallint check (time_limit_minutes between 1 and 180),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  ai_model text not null check (char_length(btrim(ai_model)) between 2 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (world_id, version),
  check (questions_per_attempt <= question_count)
);

create unique index world_quizzes_one_active_per_world_idx
  on public.world_quizzes (world_id) where status = 'active';

create table public.quiz_questions (
  id bigint generated always as identity primary key,
  quiz_id bigint not null references public.world_quizzes(id) on delete cascade,
  question_number smallint not null check (question_number > 0),
  question_text text not null check (char_length(btrim(question_text)) between 5 and 1000),
  options jsonb not null,
  points smallint not null default 1 check (points > 0),
  created_at timestamptz not null default now(),
  unique (quiz_id, question_number),
  check (jsonb_typeof(options) = 'array'),
  check (jsonb_array_length(options) = 4)
);

create table public.quiz_answer_keys (
  question_id bigint primary key references public.quiz_questions(id) on delete cascade,
  correct_option smallint not null check (correct_option between 0 and 3),
  explanation text check (explanation is null or char_length(explanation) <= 2000),
  created_at timestamptz not null default now()
);

create table public.quiz_attempts (
  id bigint generated always as identity primary key,
  quiz_id bigint not null references public.world_quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_number smallint not null check (attempt_number > 0),
  question_ids bigint[] not null check (cardinality(question_ids) > 0),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  total_questions smallint not null check (total_questions > 0),
  correct_count smallint check (correct_count between 0 and total_questions),
  score smallint check (score between 0 and 100),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quiz_id, user_id, attempt_number),
  check ((status = 'in_progress' and completed_at is null and score is null and correct_count is null)
    or (status = 'completed' and completed_at is not null and score is not null and correct_count is not null)
    or (status = 'abandoned' and completed_at is null and score is null and correct_count is null))
);

create table public.quiz_attempt_answers (
  id bigint generated always as identity primary key,
  attempt_id bigint not null references public.quiz_attempts(id) on delete cascade,
  question_id bigint not null references public.quiz_questions(id) on delete cascade,
  selected_option smallint not null check (selected_option between 0 and 3),
  is_correct boolean not null,
  answered_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create index quiz_attempts_user_quiz_idx on public.quiz_attempts (user_id, quiz_id, started_at desc);
create index quiz_attempt_answers_attempt_idx on public.quiz_attempt_answers (attempt_id);

alter table public.world_quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_attempt_answers enable row level security;

create policy "Kullanıcı kendi dünya quizlerini görebilir" on public.world_quizzes for select to authenticated
using (exists (select 1 from public.journey_worlds w join public.learning_journeys j on j.id = w.journey_id where w.id = world_quizzes.world_id and j.user_id = (select auth.uid())));
create policy "Kullanıcı kendi quiz denemelerini görebilir" on public.quiz_attempts for select to authenticated using ((select auth.uid()) = user_id);
create policy "Kullanıcı kendi quiz cevaplarını görebilir" on public.quiz_attempt_answers for select to authenticated
using (exists (select 1 from public.quiz_attempts a where a.id = quiz_attempt_answers.attempt_id and a.user_id = (select auth.uid())));

revoke all on public.world_quizzes, public.quiz_questions, public.quiz_answer_keys, public.quiz_attempts, public.quiz_attempt_answers from public, anon, authenticated;
grant select on public.world_quizzes, public.quiz_questions, public.quiz_attempts, public.quiz_attempt_answers to authenticated;
grant all on public.world_quizzes, public.quiz_questions, public.quiz_answer_keys, public.quiz_attempts, public.quiz_attempt_answers to service_role;
