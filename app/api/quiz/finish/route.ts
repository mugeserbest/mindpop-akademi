import { NextResponse } from "next/server";
import { evaluateAndGetNewBadgeKeys } from "@/lib/badges/evaluate-user-badges";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Quiz bilgisi okunamadı." },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { success: false, error: "Geçersiz quiz isteği." },
      { status: 400 },
    );
  }

  const attemptId = (body as Record<string, unknown>).attemptId;

  if (!Number.isSafeInteger(attemptId) || Number(attemptId) <= 0) {
    return NextResponse.json(
      { success: false, error: "Geçersiz quiz denemesi." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { success: false, error: "Quiz’i bitirmek için giriş yapmalısın." },
      { status: 401 },
    );
  }

  const adminSupabase = createAdminClient();

  const { data: result, error: finishError } = await adminSupabase.rpc(
    "finish_quiz_attempt",
    {
      p_user_id: user.id,
      p_attempt_id: Number(attemptId),
    },
  );

  if (finishError) {
    console.error("Quiz bitirme hatası:", finishError);

    return NextResponse.json(
      {
        success: false,
        error: "Quiz sonucu şu anda hesaplanamadı. Lütfen tekrar dene.",
      },
      { status: 400 },
    );
  }

  // Puan kaydedildikten sonra bu denemenin dünyasını bulur.
  const { data: attempt, error: attemptError } = await adminSupabase
    .from("quiz_attempts")
    .select("quiz_id")
    .eq("id", Number(attemptId))
    .maybeSingle();

  if (attemptError || !attempt) {
    console.error("Quiz denemesi dünya bilgisi okunamadı:", attemptError);

    return NextResponse.json({
      success: true,
      result,
      progress: null,
      badges: null,
    });
  }

  const { data: quiz, error: quizError } = await adminSupabase
    .from("world_quizzes")
    .select("world_id")
    .eq("id", attempt.quiz_id)
    .maybeSingle();

  if (quizError || !quiz) {
    console.error("Quiz dünya bilgisi okunamadı:", quizError);

    return NextResponse.json({
      success: true,
      result,
      progress: null,
      badges: null,
    });
  }

  // Quiz puanı yeterliyse diğer dünya geçiş koşullarını kontrol eder.
  const { data: progress, error: progressError } = await adminSupabase.rpc(
    "complete_world_if_eligible",
    {
      p_user_id: user.id,
      p_world_id: quiz.world_id,
    },
  );

  if (progressError) {
    console.error("Dünya geçişi kontrol hatası:", progressError);
  }

  let newBadgeKeys: string[] = [];

  try {
    newBadgeKeys = await evaluateAndGetNewBadgeKeys(adminSupabase, user.id);
  } catch (badgeError) {
    console.error("Quiz sonrası rozet denetim hatası:", badgeError);
  }

  return NextResponse.json({
    success: true,
    result,
    progress: progressError ? null : progress,
    newBadgeKeys,
  });
}
