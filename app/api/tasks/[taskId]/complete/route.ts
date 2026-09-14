import { NextResponse } from "next/server";
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

  return NextResponse.json(data);
}