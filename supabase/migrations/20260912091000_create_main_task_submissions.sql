alter table public.world_tasks
  add column accepted_submission_types text[] not null default array['text']::text[],
  add column submission_instructions text,
  add column evaluation_rubric jsonb not null default '[]'::jsonb;

alter table public.world_tasks
  add constraint world_tasks_submission_types_check
    check (cardinality(accepted_submission_types) between 1 and 3
      and accepted_submission_types <@ array['text', 'code', 'url', 'image', 'audio', 'video', 'file']::text[]),
  add constraint world_tasks_submission_instructions_length
    check (submission_instructions is null or char_length(submission_instructions) <= 2000),
  add constraint world_tasks_evaluation_rubric_array
    check (jsonb_typeof(evaluation_rubric) = 'array');

alter table public.journey_worlds
  add column pop_messages jsonb not null default '{}'::jsonb,
  add constraint journey_worlds_pop_messages_object_check check (jsonb_typeof(pop_messages) = 'object');

create table public.main_task_steps (
  id bigint generated always as identity primary key,
  task_id bigint not null references public.world_tasks(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 2 and 160),
  description text check (description is null or char_length(description) <= 500),
  display_order smallint not null check (display_order > 0),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, display_order),
  check ((completed and completed_at is not null) or (not completed and completed_at is null))
);

create table public.main_task_submissions (
  id bigint generated always as identity primary key,
  task_id bigint not null references public.world_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_number smallint not null check (attempt_number > 0),
  submission_text text,
  attachment_paths text[] not null default array[]::text[],
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_score smallint check (review_score between 0 and 100),
  review_feedback text,
  ai_model text,
  review_details jsonb not null default '{}'::jsonb check (jsonb_typeof(review_details) = 'object'),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, attempt_number),
  check (nullif(btrim(submission_text), '') is not null or cardinality(attachment_paths) > 0),
  check (((status = 'pending') and review_score is null and review_feedback is null and ai_model is null and reviewed_at is null)
    or ((status in ('approved', 'rejected')) and review_score is not null and review_feedback is not null and char_length(btrim(review_feedback)) > 0 and ai_model is not null and reviewed_at is not null))
);

create unique index main_task_submissions_one_pending_idx on public.main_task_submissions (task_id) where status = 'pending';
create index main_task_submissions_user_idx on public.main_task_submissions (user_id, created_at desc);

create table public.main_task_submission_attachments (
  id bigint generated always as identity primary key,
  submission_id bigint not null references public.main_task_submissions(id) on delete cascade,
  attachment_type text not null check (attachment_type in ('image', 'audio', 'video', 'file')),
  storage_path text not null unique check (char_length(btrim(storage_path)) between 3 and 500),
  original_file_name text not null check (char_length(btrim(original_file_name)) between 1 and 255),
  mime_type text not null check (char_length(btrim(mime_type)) between 3 and 255),
  file_size_bytes bigint not null check (file_size_bytes between 1 and 26214400),
  display_order smallint not null check (display_order > 0),
  created_at timestamptz not null default now(),
  unique (submission_id, display_order)
);

alter table public.main_task_steps enable row level security;
alter table public.main_task_submissions enable row level security;
alter table public.main_task_submission_attachments enable row level security;

create policy "Kullanıcı kendi ana görev adımlarını görebilir" on public.main_task_steps for select to authenticated
using (exists (select 1 from public.world_tasks t join public.journey_worlds w on w.id = t.world_id join public.learning_journeys j on j.id = w.journey_id where t.id = main_task_steps.task_id and j.user_id = (select auth.uid())));
create policy "Kullanıcı kendi ana görev teslimlerini görebilir" on public.main_task_submissions for select to authenticated using ((select auth.uid()) = user_id);
create policy "Kullanıcı kendi teslim dosyalarını görebilir" on public.main_task_submission_attachments for select to authenticated
using (exists (select 1 from public.main_task_submissions s where s.id = main_task_submission_attachments.submission_id and s.user_id = (select auth.uid())));

revoke all on public.main_task_steps, public.main_task_submissions, public.main_task_submission_attachments from public, anon, authenticated;
grant select on public.main_task_steps, public.main_task_submissions, public.main_task_submission_attachments to authenticated;
grant all on public.main_task_steps, public.main_task_submissions, public.main_task_submission_attachments to service_role;
