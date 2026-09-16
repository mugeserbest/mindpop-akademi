import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Yalnızca bu işlemde yeni kazanılan rozetlerin anahtarlarını döndürür. */
export async function evaluateAndGetNewBadgeKeys(
  adminSupabase: SupabaseClient,
  userId: string,
) {
  const { data: badgesBefore, error: beforeError } = await adminSupabase
    .from("user_badges")
    .select("badge_key")
    .eq("user_id", userId);

  if (beforeError) {
    throw new Error(`Mevcut rozetler okunamadı: ${beforeError.message}`);
  }

  const { error: evaluateError } = await adminSupabase.rpc(
    "evaluate_user_badges",
    { p_user_id: userId },
  );

  if (evaluateError) {
    throw new Error(`Rozetler değerlendirilemedi: ${evaluateError.message}`);
  }

  const { data: badgesAfter, error: afterError } = await adminSupabase
    .from("user_badges")
    .select("badge_key")
    .eq("user_id", userId);

  if (afterError) {
    throw new Error(`Yeni rozetler okunamadı: ${afterError.message}`);
  }

  const previousBadgeKeys = new Set(
    (badgesBefore ?? []).map((badge) => badge.badge_key),
  );

  return (badgesAfter ?? [])
    .map((badge) => badge.badge_key)
    .filter((badgeKey) => !previousBadgeKeys.has(badgeKey));
}
