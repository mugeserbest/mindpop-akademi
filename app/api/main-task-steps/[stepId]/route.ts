import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ stepId: string }>;
  },
) {
  const { stepId } = await params;

  if (!/^\d+$/.test(stepId)) {
    return NextResponse.json(
      {
        success: false,
        error: "Geçersiz adım numarası.",
      },
      { status: 400 },
    );
  }

  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Gönderilen bilgi okunamadı.",
      },
      { status: 400 },
    );
  }

  if (
    typeof requestBody !== "object" ||
    requestBody === null ||
    !("completed" in requestBody) ||
    typeof requestBody.completed !== "boolean"
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Tamamlanma bilgisi geçersiz.",
      },
      { status: 400 },
    );
  }

  const completed = requestBody.completed;

  // İsteği yapan öğrenciyi kontrol eder.
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        success: false,
        error: "Bu işlem için giriş yapmalısın.",
      },
      { status: 401 },
    );
  }

  // RLS sayesinde öğrenci yalnızca kendi adımını görebilir.
  const { data: step, error: stepError } = await supabase
    .from("main_task_steps")
    .select("id, task_id, display_order, completed")
    .eq("id", stepId)
    .maybeSingle();

  if (stepError) {
    console.error("Ana görev adımı kontrol hatası:", stepError);

    return NextResponse.json(
      {
        success: false,
        error: "Ana görev adımı şu anda kontrol edilemedi.",
      },
      { status: 500 },
    );
  }

  if (!step) {
    return NextResponse.json(
      {
        success: false,
        error: "Ana görev adımı bulunamadı.",
      },
      { status: 404 },
    );
  }

  // Kontrol tamamlandıktan sonra yönetim anahtarı kaydı günceller.
  const adminSupabase = createAdminClient();

  if (completed && !step.completed) {
    const { data: incompletePreviousStep, error: previousStepError } =
      await adminSupabase
        .from("main_task_steps")
        .select("id")
        .eq("task_id", step.task_id)
        .lt("display_order", step.display_order)
        .eq("completed", false)
        .limit(1)
        .maybeSingle();

    if (previousStepError) {
      console.error("Önceki ana görev adımı kontrol hatası:", previousStepError);

      return NextResponse.json(
        {
          success: false,
          error: "Ana görev adımlarının sırası şu anda kontrol edilemedi.",
        },
        { status: 500 },
      );
    }

    if (incompletePreviousStep) {
      return NextResponse.json(
        {
          success: false,
          error: "Önce önceki ana görev adımını tamamlamalısın.",
        },
        { status: 409 },
      );
    }
  }

  if (!completed && step.completed) {
    const { data: completedNextStep, error: nextStepError } =
      await adminSupabase
        .from("main_task_steps")
        .select("id")
        .eq("task_id", step.task_id)
        .gt("display_order", step.display_order)
        .eq("completed", true)
        .limit(1)
        .maybeSingle();

    if (nextStepError) {
      console.error("Sonraki ana görev adımı kontrol hatası:", nextStepError);

      return NextResponse.json(
        {
          success: false,
          error: "Ana görev adımlarının sırası şu anda kontrol edilemedi.",
        },
        { status: 500 },
      );
    }

    if (completedNextStep) {
      return NextResponse.json(
        {
          success: false,
          error: "Önce sonraki ana görev adımını geri almalısın.",
        },
        { status: 409 },
      );
    }
  }

  const { data: updatedStep, error: updateError } = await adminSupabase
    .from("main_task_steps")
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", stepId)
    .select("id, completed")
    .single();

  if (updateError) {
    console.error("Ana görev adımı güncelleme hatası:", updateError);

    return NextResponse.json(
      {
        success: false,
        error: "Ana görev adımı kaydedilemedi.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    step: updatedStep,
  });
}
