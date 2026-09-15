-- Günlük ve haftalık görevler, veritabanı kuralının gerektirdiği döngü
-- anahtarlarıyla oluşturulur. Her üç görev bir gün/hafta döngüsünü temsil eder.
alter table public.world_tasks
  add column if not exists cycle_key text;

alter table public.world_tasks
  drop constraint if exists world_tasks_recurring_cycle_key_check;

alter table public.world_tasks
  add constraint world_tasks_recurring_cycle_key_check
  check (
    task_type not in ('daily', 'weekly')
    or (
      cycle_key is not null
      and char_length(btrim(cycle_key)) between 8 and 50
    )
  );

create or replace function public.populate_ai_generated_world_content(
  p_user_id uuid,
  p_world_id bigint,
  p_content jsonb
)
returns void
language plpgsql
set search_path to ''
as $$
declare
  v_world_id bigint;
  v_task_id bigint;
  v_quiz_id bigint;
  v_question_id bigint;
  v_task jsonb;
  v_step jsonb;
  v_question jsonb;
  v_task_order integer;
  v_step_order integer;
  v_question_order integer;
begin
  if jsonb_typeof(p_content) <> 'object'
    or jsonb_array_length(coalesce(p_content -> 'daily_tasks', '[]'::jsonb)) <> 9
    or jsonb_array_length(coalesce(p_content -> 'weekly_tasks', '[]'::jsonb)) <> 9
    or jsonb_array_length(coalesce(p_content #> '{quiz,questions}', '[]'::jsonb)) <> 15 then
    raise exception 'Dünya içeriği geçersiz.' using errcode = '22023';
  end if;

  select w.id
  into v_world_id
  from public.journey_worlds w
  join public.learning_journeys j on j.id = w.journey_id
  where w.id = p_world_id
    and j.user_id = p_user_id
    and j.status = 'active'
  for update of w;

  if not found then
    raise exception 'Dünya bulunamadı veya bu kullanıcıya ait değil.' using errcode = '42501';
  end if;

  if exists (select 1 from public.world_tasks where world_id = v_world_id)
    or exists (select 1 from public.world_quizzes where world_id = v_world_id) then
    raise exception 'Bu dünyanın içeriği zaten oluşturuldu.' using errcode = 'P0001';
  end if;

  for v_task, v_task_order in
    select value, ordinality::integer
    from jsonb_array_elements(p_content -> 'daily_tasks') with ordinality
  loop
    insert into public.world_tasks (
      world_id, task_type, title, description, xp_reward, display_order,
      cycle_key, available_from, expires_at
    ) values (
      v_world_id, 'daily', btrim(v_task ->> 'title'),
      btrim(v_task ->> 'description'), (v_task ->> 'xp_reward')::bigint,
      v_task_order,
      'daily-' || lpad((1 + ((v_task_order - 1) / 3))::text, 2, '0'),
      now() + (floor((v_task_order - 1) / 3)::text || ' days')::interval,
      now() + (floor((v_task_order - 1) / 3)::text || ' days')::interval + interval '1 day'
    );
  end loop;

  for v_task, v_task_order in
    select value, ordinality::integer
    from jsonb_array_elements(p_content -> 'weekly_tasks') with ordinality
  loop
    insert into public.world_tasks (
      world_id, task_type, title, description, xp_reward, display_order,
      cycle_key, available_from, expires_at
    ) values (
      v_world_id, 'weekly', btrim(v_task ->> 'title'),
      btrim(v_task ->> 'description'), (v_task ->> 'xp_reward')::bigint,
      v_task_order,
      'weekly-' || lpad((1 + ((v_task_order - 1) / 3))::text, 2, '0'),
      now() + (floor((v_task_order - 1) / 3)::text || ' weeks')::interval,
      now() + (floor((v_task_order - 1) / 3)::text || ' weeks')::interval + interval '7 days'
    );
  end loop;

  insert into public.world_tasks (
    world_id, task_type, title, description, xp_reward, display_order,
    accepted_submission_types, submission_instructions, evaluation_rubric
  ) values (
    v_world_id, 'main', btrim(p_content #>> '{main_task,title}'),
    btrim(p_content #>> '{main_task,description}'),
    (p_content #>> '{main_task,xp_reward}')::bigint, 1,
    array(select jsonb_array_elements_text(p_content #> '{main_task,accepted_submission_types}')),
    btrim(p_content #>> '{main_task,submission_instructions}'),
    p_content #> '{main_task,evaluation_rubric}'
  ) returning id into v_task_id;

  for v_step, v_step_order in
    select value, ordinality::integer
    from jsonb_array_elements(p_content #> '{main_task,steps}') with ordinality
  loop
    insert into public.main_task_steps (task_id, label, description, display_order)
    values (
      v_task_id, btrim(v_step ->> 'title'), btrim(v_step ->> 'description'),
      v_step_order
    );
  end loop;

  insert into public.world_quizzes (
    world_id, title, instructions, question_count, questions_per_attempt,
    time_limit_minutes, status, ai_model
  ) values (
    v_world_id, btrim(p_content #>> '{quiz,title}'),
    btrim(p_content #>> '{quiz,instructions}'),
    jsonb_array_length(p_content #> '{quiz,questions}'), 5,
    (p_content #>> '{quiz,time_limit_minutes}')::smallint, 'active', 'gpt-5.6-luna'
  ) returning id into v_quiz_id;

  for v_question, v_question_order in
    select value, ordinality::integer
    from jsonb_array_elements(p_content #> '{quiz,questions}') with ordinality
  loop
    insert into public.quiz_questions (quiz_id, question_number, question_text, options)
    values (
      v_quiz_id, v_question_order, btrim(v_question ->> 'question_text'),
      v_question -> 'options'
    ) returning id into v_question_id;

    insert into public.quiz_answer_keys (question_id, correct_option, explanation)
    values (
      v_question_id, (v_question ->> 'correct_option')::smallint,
      btrim(v_question ->> 'explanation')
    );
  end loop;

  update public.journey_worlds
  set
    pop_messages = p_content -> 'pop_messages',
    content_status = 'ready',
    updated_at = now()
  where id = v_world_id;
end;
$$;

revoke all on function public.populate_ai_generated_world_content(uuid, bigint, jsonb)
  from public, anon, authenticated;

grant execute on function public.populate_ai_generated_world_content(uuid, bigint, jsonb)
  to service_role;

-- Teknik bir hata yüzünden tamamlanamayan AI isteğinin kullanıcı kotasını
-- tüketmemesi için yalnızca service_role tarafından çağrılabilir iade işlemi.
create or replace function public.refund_ai_quota(
  p_user_id uuid,
  p_action text
)
returns void
language sql
set search_path to ''
as $$
  update public.ai_usage_counters
  set
    request_count = greatest(request_count - 1, 0),
    updated_at = now()
  where user_id = p_user_id
    and action = p_action
    and usage_date = (timezone('Europe/Istanbul', now()))::date
    and request_count > 0;
$$;

revoke all on function public.refund_ai_quota(uuid, text)
  from public, anon, authenticated;

grant execute on function public.refund_ai_quota(uuid, text)
  to service_role;
