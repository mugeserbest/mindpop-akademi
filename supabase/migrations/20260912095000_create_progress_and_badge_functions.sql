create or replace function public.is_username_available(requested_username text)
returns boolean
language sql
stable
set search_path to ''
as $$
  select char_length(btrim(requested_username)) between 3 and 30
    and not exists (select 1 from public.profiles where lower(username) = lower(btrim(requested_username)));
$$;

create or replace function public.start_pop_conversation(p_user_id uuid, p_journey_id bigint)
returns jsonb
language plpgsql
set search_path to ''
as $$
declare v_id bigint;
begin
  if p_journey_id is not null and not exists (select 1 from public.learning_journeys where id = p_journey_id and user_id = p_user_id) then
    raise exception 'Yolculuk kullanıcıya ait değil.' using errcode = '42501';
  end if;
  insert into public.pop_conversations (user_id, journey_id) values (p_user_id, p_journey_id) returning id into v_id;
  return jsonb_build_object('conversation_id', v_id);
end;
$$;

create or replace function public.complete_self_report_task(p_user_id uuid, p_task_id bigint)
returns jsonb
language plpgsql
set search_path to ''
as $$
declare v_task record; v_xp_id bigint; v_world_xp bigint; v_journey_xp bigint;
begin
  select t.*, w.journey_id, w.xp_earned, w.status as world_status, j.user_id, j.status as journey_status, j.total_xp
  into v_task from public.world_tasks t join public.journey_worlds w on w.id = t.world_id join public.learning_journeys j on j.id = w.journey_id
  where t.id = p_task_id for update of t;
  if not found or v_task.user_id <> p_user_id then raise exception 'Göreve erişilemedi.' using errcode = '42501'; end if;
  if v_task.task_type not in ('daily', 'weekly') or v_task.journey_status <> 'active' or v_task.world_status <> 'active' then raise exception 'Görev tamamlanmaya uygun değil.' using errcode = 'P0001'; end if;
  if v_task.status = 'completed' then return jsonb_build_object('success', true, 'already_completed', true, 'task_id', v_task.id, 'xp_awarded', 0, 'world_xp', v_task.xp_earned, 'journey_xp', v_task.total_xp); end if;
  if v_task.status <> 'active' or v_task.available_from > now() or (v_task.expires_at is not null and v_task.expires_at <= now()) then raise exception 'Görevin süresi uygun değil.' using errcode = 'P0001'; end if;
  update public.world_tasks set status = 'completed', completed_at = now() where id = v_task.id;
  insert into public.xp_transactions (user_id, journey_id, world_id, task_id, source_type, amount, event_key, description)
  values (p_user_id, v_task.journey_id, v_task.world_id, v_task.id, 'task_completion', v_task.xp_reward, 'task:' || v_task.id::text, v_task.title || ' görevi tamamlandı.')
  on conflict do nothing returning id into v_xp_id;
  if v_xp_id is null then raise exception 'Bu görev için XP daha önce verildi.' using errcode = 'P0001'; end if;
  update public.journey_worlds set xp_earned = xp_earned + v_task.xp_reward where id = v_task.world_id returning xp_earned into v_world_xp;
  update public.learning_journeys set total_xp = total_xp + v_task.xp_reward where id = v_task.journey_id returning total_xp into v_journey_xp;
  return jsonb_build_object('success', true, 'already_completed', false, 'task_id', v_task.id, 'xp_awarded', v_task.xp_reward, 'world_xp', v_world_xp, 'journey_xp', v_journey_xp);
end;
$$;

create or replace function public.approve_main_task_submission(p_user_id uuid, p_submission_id bigint, p_review_score smallint, p_review_feedback text, p_ai_model text, p_review_details jsonb)
returns jsonb
language plpgsql
set search_path to ''
as $$
declare v_submission record; v_xp_id bigint; v_world_xp bigint; v_journey_xp bigint;
begin
  select s.*, t.title, t.xp_reward, t.world_id, w.journey_id, j.user_id into v_submission
  from public.main_task_submissions s join public.world_tasks t on t.id = s.task_id join public.journey_worlds w on w.id = t.world_id join public.learning_journeys j on j.id = w.journey_id
  where s.id = p_submission_id for update of s;
  if not found or v_submission.user_id <> p_user_id or v_submission.status <> 'pending' then raise exception 'Teslim incelemeye uygun değil.' using errcode = '42501'; end if;
  update public.main_task_submissions set status = 'approved', review_score = p_review_score, review_feedback = p_review_feedback, ai_model = p_ai_model, review_details = p_review_details, reviewed_at = now() where id = p_submission_id;
  update public.world_tasks set status = 'completed', completed_at = now() where id = v_submission.task_id;
  update public.journey_worlds set main_task_approved = true where id = v_submission.world_id;
  insert into public.xp_transactions (user_id, journey_id, world_id, task_id, source_type, amount, event_key, description)
  values (p_user_id, v_submission.journey_id, v_submission.world_id, v_submission.task_id, 'task_completion', v_submission.xp_reward, 'task:' || v_submission.task_id::text, v_submission.title || ' ana görevi onaylandı.')
  on conflict do nothing returning id into v_xp_id;
  if v_xp_id is null then raise exception 'Ana görev XP’si daha önce verildi.' using errcode = 'P0001'; end if;
  update public.journey_worlds set xp_earned = xp_earned + v_submission.xp_reward where id = v_submission.world_id returning xp_earned into v_world_xp;
  update public.learning_journeys set total_xp = total_xp + v_submission.xp_reward where id = v_submission.journey_id returning total_xp into v_journey_xp;
  return jsonb_build_object('success', true, 'already_completed', false, 'xp_awarded', v_submission.xp_reward, 'world_xp', v_world_xp, 'journey_xp', v_journey_xp);
end;
$$;

create or replace function public.reject_main_task_submission(p_user_id uuid, p_submission_id bigint, p_review_score smallint, p_review_feedback text, p_ai_model text, p_review_details jsonb)
returns jsonb
language plpgsql
set search_path to ''
as $$
begin
  update public.main_task_submissions s set status = 'rejected', review_score = p_review_score, review_feedback = p_review_feedback, ai_model = p_ai_model, review_details = p_review_details, reviewed_at = now()
  where s.id = p_submission_id and s.user_id = p_user_id and s.status = 'pending';
  if not found then raise exception 'Teslim incelemeye uygun değil.' using errcode = '42501'; end if;
  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.complete_world_if_eligible(p_user_id uuid, p_world_id bigint)
returns jsonb
language plpgsql
set search_path to ''
as $$
declare v_world record; v_next_world_id bigint;
begin
  select w.*, j.user_id, j.id as journey_id, j.reward_title into v_world from public.journey_worlds w join public.learning_journeys j on j.id = w.journey_id where w.id = p_world_id for update of w;
  if not found or v_world.user_id <> p_user_id then raise exception 'Dünyaya erişilemedi.' using errcode = '42501'; end if;
  if v_world.status = 'completed' then return jsonb_build_object('success', true, 'already_completed', true); end if;
  if v_world.status <> 'active' or v_world.xp_earned < v_world.xp_required or not v_world.main_task_approved or v_world.quiz_best_score < v_world.quiz_pass_score then
    return jsonb_build_object('success', false, 'eligible', false, 'xp_ready', v_world.xp_earned >= v_world.xp_required, 'main_task_ready', v_world.main_task_approved, 'quiz_ready', v_world.quiz_best_score >= v_world.quiz_pass_score);
  end if;
  update public.journey_worlds set status = 'completed', completed_at = now() where id = p_world_id;
  if v_world.world_number = 5 then
    update public.learning_journeys set status = 'completed', completed_at = now(), current_world_position = 5 where id = v_world.journey_id;
    insert into public.user_titles (user_id, journey_id, title_name, is_selected) values (p_user_id, v_world.journey_id, v_world.reward_title, true) on conflict (user_id, journey_id) do nothing;
    return jsonb_build_object('success', true, 'eligible', true, 'journey_completed', true);
  end if;
  update public.journey_worlds set status = 'active', unlocked_at = now() where journey_id = v_world.journey_id and world_number = v_world.world_number + 1 returning id into v_next_world_id;
  update public.learning_journeys set current_world_position = v_world.world_number + 1 where id = v_world.journey_id;
  return jsonb_build_object('success', true, 'eligible', true, 'journey_completed', false, 'next_world_id', v_next_world_id);
end;
$$;

revoke all on function public.is_username_available(text), public.start_pop_conversation(uuid, bigint), public.complete_self_report_task(uuid, bigint), public.approve_main_task_submission(uuid, bigint, smallint, text, text, jsonb), public.reject_main_task_submission(uuid, bigint, smallint, text, text, jsonb), public.complete_world_if_eligible(uuid, bigint) from public, anon, authenticated;
grant execute on function public.is_username_available(text), public.start_pop_conversation(uuid, bigint), public.complete_self_report_task(uuid, bigint), public.approve_main_task_submission(uuid, bigint, smallint, text, text, jsonb), public.reject_main_task_submission(uuid, bigint, smallint, text, text, jsonb), public.complete_world_if_eligible(uuid, bigint) to service_role;
