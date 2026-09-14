create or replace function public.start_quiz_attempt(p_user_id uuid, p_quiz_id bigint)
returns jsonb
language plpgsql
set search_path to ''
as $$
declare
  v_quiz record;
  v_question_ids bigint[];
  v_attempt_id bigint;
  v_attempt_number smallint;
begin
  select q.id, q.world_id, q.questions_per_attempt
    into v_quiz
  from public.world_quizzes q
  join public.journey_worlds w on w.id = q.world_id
  join public.learning_journeys j on j.id = w.journey_id
  where q.id = p_quiz_id and q.status = 'active' and w.status = 'active' and j.user_id = p_user_id and j.status = 'active';

  if not found then
    raise exception 'Quiz erişilemedi.' using errcode = '42501';
  end if;

  select array_agg(id order by random()) into v_question_ids
  from (
    select id from public.quiz_questions where quiz_id = v_quiz.id order by random() limit v_quiz.questions_per_attempt
  ) selected_questions;

  if cardinality(v_question_ids) <> v_quiz.questions_per_attempt then
    raise exception 'Quiz soru havuzu eksik.' using errcode = 'P0001';
  end if;

  select coalesce(max(attempt_number), 0) + 1 into v_attempt_number
  from public.quiz_attempts where quiz_id = p_quiz_id and user_id = p_user_id;

  insert into public.quiz_attempts (quiz_id, user_id, attempt_number, question_ids, total_questions)
  values (p_quiz_id, p_user_id, v_attempt_number, v_question_ids, cardinality(v_question_ids))
  returning id into v_attempt_id;

  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object('id', q.id, 'question', q.question_text, 'options', q.options, 'display_order', numbered.display_order) order by numbered.display_order)
      from unnest(v_question_ids) with ordinality numbered(question_id, display_order)
      join public.quiz_questions q on q.id = numbered.question_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.answer_quiz_attempt_question(
  p_user_id uuid,
  p_attempt_id bigint,
  p_question_id bigint,
  p_selected_option smallint
)
returns jsonb
language plpgsql
set search_path to ''
as $$
declare
  v_attempt record;
  v_key record;
  v_is_correct boolean;
  v_answer_count integer;
begin
  select * into v_attempt from public.quiz_attempts
  where id = p_attempt_id and user_id = p_user_id and status = 'in_progress'
  for update;
  if not found or not (p_question_id = any(v_attempt.question_ids)) then
    raise exception 'Quiz sorusuna erişilemedi.' using errcode = '42501';
  end if;

  select k.correct_option, k.explanation, q.options into v_key
  from public.quiz_answer_keys k join public.quiz_questions q on q.id = k.question_id
  where k.question_id = p_question_id;
  if not found then raise exception 'Cevap anahtarı bulunamadı.' using errcode = 'P0001'; end if;

  v_is_correct := p_selected_option = v_key.correct_option;
  insert into public.quiz_attempt_answers (attempt_id, question_id, selected_option, is_correct)
  values (p_attempt_id, p_question_id, p_selected_option, v_is_correct)
  on conflict (attempt_id, question_id) do nothing;

  select count(*) into v_answer_count from public.quiz_attempt_answers where attempt_id = p_attempt_id;
  return jsonb_build_object(
    'is_correct', v_is_correct,
    'correct_option_text', v_key.options ->> v_key.correct_option,
    'explanation', v_key.explanation,
    'is_last_question', v_answer_count >= v_attempt.total_questions
  );
end;
$$;

create or replace function public.finish_quiz_attempt(p_user_id uuid, p_attempt_id bigint)
returns jsonb
language plpgsql
set search_path to ''
as $$
declare
  v_attempt record;
  v_correct_count integer;
  v_score smallint;
  v_world_id bigint;
  v_pass_score smallint;
  v_best_score smallint;
begin
  select a.*, q.world_id, w.quiz_pass_score into v_attempt
  from public.quiz_attempts a
  join public.world_quizzes q on q.id = a.quiz_id
  join public.journey_worlds w on w.id = q.world_id
  where a.id = p_attempt_id and a.user_id = p_user_id
  for update of a;
  if not found then raise exception 'Quiz denemesi bulunamadı.' using errcode = '42501'; end if;

  if v_attempt.status = 'completed' then
    return jsonb_build_object('score', v_attempt.score, 'best_score', (select quiz_best_score from public.journey_worlds where id = v_attempt.world_id), 'correct_count', v_attempt.correct_count, 'total_questions', v_attempt.total_questions, 'passed', v_attempt.score >= v_attempt.quiz_pass_score);
  end if;

  select count(*) filter (where is_correct), count(*) into v_correct_count, v_best_score
  from public.quiz_attempt_answers where attempt_id = p_attempt_id;
  if v_best_score <> v_attempt.total_questions then raise exception 'Tüm sorular cevaplanmalı.' using errcode = 'P0001'; end if;

  v_score := round((v_correct_count::numeric / v_attempt.total_questions) * 100)::smallint;
  update public.quiz_attempts set status = 'completed', correct_count = v_correct_count, score = v_score, completed_at = now()
  where id = p_attempt_id;
  update public.journey_worlds set quiz_best_score = greatest(quiz_best_score, v_score)
  where id = v_attempt.world_id returning quiz_best_score into v_best_score;

  return jsonb_build_object('score', v_score, 'best_score', v_best_score, 'correct_count', v_correct_count, 'total_questions', v_attempt.total_questions, 'passed', v_score >= v_attempt.quiz_pass_score);
end;
$$;

revoke all on function public.start_quiz_attempt(uuid, bigint), public.answer_quiz_attempt_question(uuid, bigint, bigint, smallint), public.finish_quiz_attempt(uuid, bigint) from public, anon, authenticated;
grant execute on function public.start_quiz_attempt(uuid, bigint), public.answer_quiz_attempt_question(uuid, bigint, bigint, smallint), public.finish_quiz_attempt(uuid, bigint) to service_role;
