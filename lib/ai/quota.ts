import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const AI_DAILY_LIMITS = {
  pop_message: 30,
  onboarding_reply: 15,
  journey_generation: 2,
  world_content_generation: 5,
  main_task_review: 5,
} as const;

type AiQuotaAction = keyof typeof AI_DAILY_LIMITS;

type AiQuotaResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
};

function isAiQuotaResult(value: unknown): value is AiQuotaResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "allowed" in value &&
    "limit" in value &&
    "remaining" in value &&
    typeof value.allowed === "boolean" &&
    typeof value.limit === "number" &&
    typeof value.remaining === "number"
  );
}

export async function consumeAiQuota(
  supabase: SupabaseClient,
  userId: string,
  action: AiQuotaAction,
): Promise<AiQuotaResult> {
  const { data, error } = await supabase.rpc("consume_ai_quota", {
    p_user_id: userId,
    p_action: action,
    p_limit: AI_DAILY_LIMITS[action],
  });

  if (error || !isAiQuotaResult(data)) {
    throw new Error(error?.message ?? "Yapay zekâ kullanım kotası okunamadı.");
  }

  return data;
}
