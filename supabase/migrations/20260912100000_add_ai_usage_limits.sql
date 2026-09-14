create table public.ai_usage_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('pop_message', 'onboarding_reply', 'journey_generation', 'main_task_review')),
  usage_date date not null default (timezone('Europe/Istanbul', now()))::date,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, action, usage_date)
);

alter table public.ai_usage_counters enable row level security;
revoke all on public.ai_usage_counters from public, anon, authenticated;
grant all on public.ai_usage_counters to service_role;

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
  if p_limit < 1 or p_action not in ('pop_message', 'onboarding_reply', 'journey_generation', 'main_task_review') then
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

  return jsonb_build_object('allowed', true, 'limit', p_limit, 'remaining', greatest(p_limit - v_count, 0));
end;
$$;

revoke all on function public.consume_ai_quota(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid, text, integer) to service_role;
