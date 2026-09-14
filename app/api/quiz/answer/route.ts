import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Quiz cevabı okunamadı." },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { success: false, error: "Geçersiz quiz cevabı." },
      { status: 400 },
    );
  }

  const payload = body as Record<string, unknown>;

  const attemptId = payload.attemptId;
  const questionId = payload.questionId;
  const selectedOption = payload.selectedOption;

  if (
    !Number.isSafeInteger(attemptId) ||
    Number(attemptId) <= 0 ||
    !Number.isSafeInteger(questionId) ||
    Number(questionId) <= 0 ||
    !Number.isSafeInteger(selectedOption) ||
    Number(selectedOption) < 0 ||
    Number(selectedOption) > 5
  ) {
    return NextResponse.json(
      { success: false, error: "Geçersiz quiz cevabı." },
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
      { success: false, error: "Cevaplamak için giriş yapmalısın." },
      { status: 401 },
    );
  }

  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase.rpc(
    "answer_quiz_attempt_question",
    {
      p_user_id: user.id,
      p_attempt_id: Number(attemptId),
      p_question_id: Number(questionId),
      p_selected_option: Number(selectedOption),
    },
  );

  if (error) {
    console.error("Quiz cevap değerlendirme hatası:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Cevap şu anda değerlendirilemedi. Lütfen tekrar dene.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    feedback: data,
  });
}
