begin;

alter table public.journey_worlds
  add column if not exists content_status text not null default 'ready';

alter table public.journey_worlds
  drop constraint if exists journey_worlds_content_status_check;

alter table public.journey_worlds
  add constraint journey_worlds_content_status_check
  check (content_status in ('pending', 'generating', 'ready', 'failed'));

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
      available_from, expires_at
    ) values (
      v_world_id, 'daily', btrim(v_task ->> 'title'),
      btrim(v_task ->> 'description'), (v_task ->> 'xp_reward')::bigint,
      v_task_order,
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
      available_from, expires_at
    ) values (
      v_world_id, 'weekly', btrim(v_task ->> 'title'),
      btrim(v_task ->> 'description'), (v_task ->> 'xp_reward')::bigint,
      v_task_order,
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

create or replace function public.create_ai_generated_journey(
  p_user_id uuid,
  p_goal_prompt text,
  p_roadmap jsonb
)
returns jsonb
language plpgsql
set search_path to ''
as $$
declare
  v_journey_id bigint;
  v_first_world_id bigint;
  v_world_id bigint;
  v_world jsonb;
  v_world_order integer;
begin
  if char_length(btrim(p_goal_prompt)) not between 3 and 500
    or jsonb_typeof(p_roadmap) <> 'object'
    or jsonb_array_length(coalesce(p_roadmap -> 'worlds', '[]'::jsonb)) <> 5
    or jsonb_typeof(p_roadmap -> 'first_world_content') <> 'object' then
    raise exception 'Yol haritası geçersiz.' using errcode = '22023';
  end if;

  insert into public.learning_journeys (
    user_id, goal_prompt, goal_name, reward_title, status,
    current_world_position, started_at
  ) values (
    p_user_id, btrim(p_goal_prompt), btrim(p_roadmap ->> 'goal_name'),
    btrim(p_roadmap ->> 'reward_title'), 'active', 1, now()
  ) returning id into v_journey_id;

  for v_world, v_world_order in
    select value, ordinality::integer
    from jsonb_array_elements(p_roadmap -> 'worlds') with ordinality
  loop
    insert into public.journey_worlds (
      journey_id, world_number, name, description, theme, xp_required,
      quiz_pass_score, status, unlocked_at, content_status
    ) values (
      v_journey_id, (v_world ->> 'world_number')::smallint,
      btrim(v_world ->> 'name'), btrim(v_world ->> 'description'),
      v_world ->> 'theme', (v_world ->> 'xp_required')::bigint,
      (v_world ->> 'quiz_pass_score')::smallint,
      case when v_world_order = 1 then 'active' else 'locked' end,
      case when v_world_order = 1 then now() else null end,
      case when v_world_order = 1 then 'generating' else 'pending' end
    ) returning id into v_world_id;

    if v_world_order = 1 then
      v_first_world_id := v_world_id;
    end if;
  end loop;

  perform public.populate_ai_generated_world_content(
    p_user_id,
    v_first_world_id,
    p_roadmap -> 'first_world_content'
  );

  update public.profiles
  set learning_goal = btrim(p_goal_prompt)
  where id = p_user_id;

  return jsonb_build_object('journey_id', v_journey_id);
end;
$$;

revoke all on function public.populate_ai_generated_world_content(uuid, bigint, jsonb)
  from public, anon, authenticated;

grant execute on function public.populate_ai_generated_world_content(uuid, bigint, jsonb)
  to service_role;

revoke all on function public.create_ai_generated_journey(uuid, text, jsonb)
  from public, anon, authenticated;

grant execute on function public.create_ai_generated_journey(uuid, text, jsonb)
  to service_role;

alter table public.ai_usage_counters
  drop constraint if exists ai_usage_counters_action_check;

alter table public.ai_usage_counters
  add constraint ai_usage_counters_action_check
  check (action in (
    'pop_message',
    'onboarding_reply',
    'journey_generation',
    'world_content_generation',
    'main_task_review'
  ));

create or replace function public.consume_ai_quota(
  p_user_id uuid,
  p_action text,
  p_limit integer
)
returns jsonb
language plpgsql
set search_path to ''
as $$
declare v_count integer;
begin
  if p_limit < 1 or p_action not in (
    'pop_message',
    'onboarding_reply',
    'journey_generation',
    'world_content_generation',
    'main_task_review'
  ) then
    raise exception 'Geçersiz yapay zekâ kotası.' using errcode = '22023';
  end if;

  insert into public.ai_usage_counters (user_id, action, usage_date, request_count)
  values (p_user_id, p_action, (timezone('Europe/Istanbul', now()))::date, 1)
  on conflict (user_id, action, usage_date) do update
    set request_count = public.ai_usage_counters.request_count + 1,
        updated_at = now()
    where public.ai_usage_counters.request_count < p_limit
  returning request_count into v_count;

  if v_count is null then
    return jsonb_build_object('allowed', false, 'limit', p_limit, 'remaining', 0);
  end if;

  return jsonb_build_object(
    'allowed', true,
    'limit', p_limit,
    'remaining', greatest(p_limit - v_count, 0)
  );
end;
$$;

revoke all on function public.consume_ai_quota(uuid, text, integer)
  from public, anon, authenticated;

grant execute on function public.consume_ai_quota(uuid, text, integer)
  to service_role;

commit;
