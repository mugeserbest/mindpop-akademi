create or replace function public.create_ai_generated_journey(p_user_id uuid, p_goal_prompt text, p_roadmap jsonb)
returns jsonb
language plpgsql
set search_path to ''
as $$
declare
  v_journey_id bigint;
  v_world_id bigint;
  v_task_id bigint;
  v_quiz_id bigint;
  v_world jsonb;
  v_task jsonb;
  v_step jsonb;
  v_question jsonb;
  v_world_order integer;
  v_task_order integer;
  v_step_order integer;
  v_question_order integer;
begin
  if char_length(btrim(p_goal_prompt)) not between 3 and 500
    or jsonb_typeof(p_roadmap) <> 'object'
    or jsonb_array_length(coalesce(p_roadmap -> 'worlds', '[]'::jsonb)) <> 5 then
    raise exception 'Yol haritası geçersiz.' using errcode = '22023';
  end if;

  insert into public.learning_journeys (user_id, goal_prompt, goal_name, reward_title, status, current_world_position, started_at)
  values (p_user_id, btrim(p_goal_prompt), btrim(p_roadmap ->> 'goal_name'), btrim(p_roadmap ->> 'reward_title'), 'active', 1, now())
  returning id into v_journey_id;

  for v_world, v_world_order in select value, ordinality::integer from jsonb_array_elements(p_roadmap -> 'worlds') with ordinality
  loop
    insert into public.journey_worlds (
      journey_id, world_number, name, description, theme, xp_required, quiz_pass_score, status, unlocked_at, pop_messages
    ) values (
      v_journey_id,
      (v_world ->> 'world_number')::smallint,
      btrim(v_world ->> 'name'),
      btrim(v_world ->> 'description'),
      v_world ->> 'theme',
      (v_world ->> 'xp_required')::bigint,
      (v_world ->> 'quiz_pass_score')::smallint,
      case when v_world_order = 1 then 'active' else 'locked' end,
      case when v_world_order = 1 then now() else null end,
      v_world -> 'pop_messages'
    ) returning id into v_world_id;

    for v_task, v_task_order in select value, ordinality::integer from jsonb_array_elements(v_world -> 'daily_tasks') with ordinality
    loop
      insert into public.world_tasks (world_id, task_type, title, description, xp_reward, display_order, available_from, expires_at)
      values (v_world_id, 'daily', btrim(v_task ->> 'title'), btrim(v_task ->> 'description'), (v_task ->> 'xp_reward')::bigint, v_task_order,
        now() + (floor((v_task_order - 1) / 3)::text || ' days')::interval,
        now() + (floor((v_task_order - 1) / 3)::text || ' days')::interval + interval '1 day');
    end loop;

    for v_task, v_task_order in select value, ordinality::integer from jsonb_array_elements(v_world -> 'weekly_tasks') with ordinality
    loop
      insert into public.world_tasks (world_id, task_type, title, description, xp_reward, display_order, available_from, expires_at)
      values (v_world_id, 'weekly', btrim(v_task ->> 'title'), btrim(v_task ->> 'description'), (v_task ->> 'xp_reward')::bigint, v_task_order,
        now() + (floor((v_task_order - 1) / 3)::text || ' weeks')::interval,
        now() + (floor((v_task_order - 1) / 3)::text || ' weeks')::interval + interval '7 days');
    end loop;

    insert into public.world_tasks (world_id, task_type, title, description, xp_reward, display_order, accepted_submission_types, submission_instructions, evaluation_rubric)
    values (
      v_world_id, 'main', btrim(v_world #>> '{main_task,title}'), btrim(v_world #>> '{main_task,description}'), (v_world #>> '{main_task,xp_reward}')::bigint, 1,
      array(select jsonb_array_elements_text(v_world #> '{main_task,accepted_submission_types}')),
      btrim(v_world #>> '{main_task,submission_instructions}'), v_world #> '{main_task,evaluation_rubric}'
    ) returning id into v_task_id;

    for v_step, v_step_order in select value, ordinality::integer from jsonb_array_elements(v_world #> '{main_task,steps}') with ordinality
    loop
      insert into public.main_task_steps (task_id, label, description, display_order)
      values (v_task_id, btrim(v_step ->> 'title'), btrim(v_step ->> 'description'), v_step_order);
    end loop;

    insert into public.world_quizzes (world_id, title, instructions, question_count, questions_per_attempt, time_limit_minutes, status, ai_model)
    values (v_world_id, btrim(v_world #>> '{quiz,title}'), btrim(v_world #>> '{quiz,instructions}'), jsonb_array_length(v_world #> '{quiz,questions}'), 5, (v_world #>> '{quiz,time_limit_minutes}')::smallint, 'active', 'gpt-5.6-luna')
    returning id into v_quiz_id;

    for v_question, v_question_order in select value, ordinality::integer from jsonb_array_elements(v_world #> '{quiz,questions}') with ordinality
    loop
      insert into public.quiz_questions (quiz_id, question_number, question_text, options)
      values (v_quiz_id, v_question_order, btrim(v_question ->> 'question_text'), v_question -> 'options')
      returning id into v_task_id;
      insert into public.quiz_answer_keys (question_id, correct_option, explanation)
      values (v_task_id, (v_question ->> 'correct_option')::smallint, btrim(v_question ->> 'explanation'));
    end loop;
  end loop;

  update public.profiles set learning_goal = btrim(p_goal_prompt) where id = p_user_id;
  return jsonb_build_object('journey_id', v_journey_id);
end;
$$;

create or replace function public.refresh_active_world_task_cycles(p_user_id uuid)
returns void
language sql
set search_path to ''
as $$
  update public.world_tasks t
  set status = 'expired'
  from public.journey_worlds w join public.learning_journeys j on j.id = w.journey_id
  where t.world_id = w.id and w.status = 'active' and j.user_id = p_user_id and j.status = 'active'
    and t.task_type in ('daily', 'weekly') and t.status = 'active' and t.expires_at <= now();
$$;

create or replace function public.evaluate_streak_badges(p_user_id uuid)
returns void
language plpgsql
set search_path to ''
as $$
declare v_streak integer;
begin
  v_streak := coalesce(public.get_current_login_streak(p_user_id), 0);
  insert into public.user_badges (user_id, badge_key)
  select p_user_id, badge_key from (values
    ('seri-maceraci', v_streak >= 7),
    ('rutin-yolcusu', v_streak >= 15),
    ('istikrar-efsanesi', v_streak >= 30)
  ) as badge(badge_key, earned)
  where earned on conflict (user_id, badge_key) do nothing;
end;
$$;

create or replace function public.evaluate_user_badges(p_user_id uuid)
returns jsonb
language plpgsql
set search_path to ''
as $$
declare v_open_worlds integer; v_completed_journeys integer; v_quizzes integer; v_conversations integer;
begin
  select count(*) into v_open_worlds from public.journey_worlds w join public.learning_journeys j on j.id = w.journey_id where j.user_id = p_user_id and w.status in ('active', 'completed');
  select count(*) into v_completed_journeys from public.learning_journeys where user_id = p_user_id and status = 'completed';
  select count(*) into v_quizzes from public.quiz_attempts where user_id = p_user_id and status = 'completed';
  select count(*) into v_conversations from public.pop_conversations where user_id = p_user_id;
  insert into public.user_badges (user_id, badge_key)
  select p_user_id, badge_key from (values
    ('macera-adayi', exists (select 1 from public.learning_journeys where user_id = p_user_id)),
    ('orman-bekcisi', v_open_worlds >= 1), ('koy-yolcusu', v_open_worlds >= 2), ('okyanus-ruhu', v_open_worlds >= 3), ('volkan-savasci', v_open_worlds >= 4), ('krallik-muhafizi', v_open_worlds >= 5),
    ('dunya-gezgini', v_open_worlds >= 5), ('harita-uzmani', v_open_worlds >= 10), ('evren-kasifi', v_open_worlds >= 15),
    ('uzmanlik-sahibi', v_completed_journeys >= 1), ('ustalik-uzmani', v_completed_journeys >= 3), ('beceri-profesoru', v_completed_journeys >= 5),
    ('soru-avcisi', v_quizzes >= 10), ('bilgi-sampiyonu', v_quizzes >= 25), ('quiz-efsanesi', v_quizzes >= 50), ('pop-dostu', v_conversations >= 5), ('koleksiyoncu', v_open_worlds >= 5)
  ) as badge(badge_key, earned) where earned on conflict (user_id, badge_key) do nothing;
  perform public.evaluate_streak_badges(p_user_id);
  return jsonb_build_object('success', true);
end;
$$;

insert into storage.buckets (id, name, public)
values ('main-task-submissions', 'main-task-submissions', false)
on conflict (id) do nothing;

revoke all on function public.create_ai_generated_journey(uuid, text, jsonb), public.refresh_active_world_task_cycles(uuid), public.evaluate_streak_badges(uuid), public.evaluate_user_badges(uuid) from public, anon, authenticated;
grant execute on function public.create_ai_generated_journey(uuid, text, jsonb), public.refresh_active_world_task_cycles(uuid), public.evaluate_streak_badges(uuid), public.evaluate_user_badges(uuid) to service_role;
