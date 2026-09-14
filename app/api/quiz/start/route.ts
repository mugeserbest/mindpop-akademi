import { NextResponse } from "next/server";
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

  const quizId = (body as Record<string, unknown>).quizId;

  if (!Number.isSafeInteger(quizId) || Number(quizId) <= 0) {
    return NextResponse.json(
      { success: false, error: "Geçersiz quiz numarası." },
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
      { success: false, error: "Quiz çözmek için giriş yapmalısın." },
      { status: 401 },
    );
  }

  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase.rpc("start_quiz_attempt", {
    p_user_id: user.id,
    p_quiz_id: Number(quizId),
  });

  if (error) {
    console.error("Quiz başlatma hatası:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Quiz şu anda başlatılamadı. Lütfen tekrar dene.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    attempt: data,
  });
}