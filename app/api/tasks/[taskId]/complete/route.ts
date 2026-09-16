import { NextResponse } from "next/server";
import { evaluateAndGetNewBadgeKeys } from "../../../../../lib/badges/evaluate-user-badges";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { createClient } from "../../../../../lib/supabase/server";

export async function POST(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ taskId: string }>;
  },
) {
  // Adresteki görev numarasını alır.
  const { taskId } = await params;

  // Görev numarasının gerçekten geçerli bir sayı olduğunu kontrol eder.
  if (!/^\d+$/.test(taskId)) {
    return NextResponse.json(
      {
        success: false,
        error: "Geçersiz görev numarası.",
      },
      { status: 400 },
    );
  }

  // İsteği yapan öğrencinin giriş bilgilerini kontrol eder.
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

  // Gizli yönetim anahtarıyla veritabanı görevlisini çağırır.
  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase.rpc(
    "complete_self_report_task",
    {
      p_user_id: user.id,
      p_task_id: taskId,
    },
  );

  if (error) {
    console.error("Görev tamamlama hatası:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Görev şu anda tamamlanamadı. Lütfen tekrar dene.",
      },
      { status: 400 },
    );
  }

  // RPC kullanıcının bu görevi sahiplenebildiğini doğruladıktan sonra, dünya
  // geçişi kontrolü için dünya kimliğini okuruz.
  const { data: task, error: taskError } = await adminSupabase
    .from("world_tasks")
    .select("world_id")
    .eq("id", Number(taskId))
    .maybeSingle();

  if (taskError || !task) {
    console.error("Görevin dünya bilgisi okunamadı:", taskError);

    return NextResponse.json(
      {
        success: false,
        error: "Görev bilgisi şu anda okunamadı. Lütfen tekrar dene.",
      },
      { status: 400 },
    );
  }

  // XP son eksik koşulsa, görev biter bitmez dünya geçişi tetiklenmelidir.
  const { data: progress, error: progressError } = await adminSupabase.rpc(
    "complete_world_if_eligible",
    {
      p_user_id: user.id,
      p_world_id: task.world_id,
    },
  );

  if (progressError) {
    console.error("Görev sonrası dünya geçişi kontrol hatası:", progressError);
  }

  let newBadgeKeys: string[] = [];

  try {
    newBadgeKeys = await evaluateAndGetNewBadgeKeys(adminSupabase, user.id);
  } catch (badgeError) {
    console.error("Görev sonrası rozet kontrol hatası:", badgeError);
  }

  return NextResponse.json({
    ...(typeof data === "object" && data !== null ? data : {}),
    success: true,
    progress: progressError ? null : progress,
    newBadgeKeys,
  });
}
