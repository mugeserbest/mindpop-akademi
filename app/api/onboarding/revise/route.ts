import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function getConversationId(payload: unknown): number | null {
  return typeof payload === "object" &&
    payload !== null &&
    "conversationId" in payload &&
    typeof payload.conversationId === "number" &&
    Number.isInteger(payload.conversationId) &&
    payload.conversationId > 0
    ? payload.conversationId
    : null;
}

export async function POST(request: Request) {
  const payload: unknown = await request.json().catch(() => null);
  const conversationId = getConversationId(payload);

  if (!conversationId) {
    return NextResponse.json(
      { success: false, error: "Geçersiz onboarding konuşması." },
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
      { success: false, error: "Bu işlem için giriş yapmalısın." },
      { status: 401 },
    );
  }

  const adminSupabase = createAdminClient();

  // Yalnızca kullanıcının kendi, onaya hazır oturumu düzenlemeye açılabilir.
  const { data: session, error: sessionError } = await adminSupabase
    .from("onboarding_sessions")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .eq("status", "ready")
    .maybeSingle();

  if (sessionError || !session) {
    return NextResponse.json(
      { success: false, error: "Düzenlenecek onboarding özeti bulunamadı." },
      { status: 403 },
    );
  }

  const reply =
    "Elbette. Yol haritasını hangi yönden değiştirmek istersin? " +
    "Hedefini, ayırabileceğin zamanı veya başlangıç seviyeni yazabilirsin.";

  const { error: updateError } = await adminSupabase
    .from("onboarding_sessions")
    .update({
      status: "collecting",
      roadmap_summary: null,
      updated_at: new Date().toISOString(),
    })
    .eq("conversation_id", session.conversation_id)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("Onboarding düzenleme durumu kaydedilemedi:", updateError);

    return NextResponse.json(
      { success: false, error: "Onboarding düzenlemeye açılamadı." },
      { status: 500 },
    );
  }

  const { error: messageError } = await adminSupabase
    .from("pop_messages")
    .insert({
      conversation_id: session.conversation_id,
      role: "pop",
      content: reply,
      ai_model: "mindpop-onboarding",
    });

  if (messageError) {
    console.error("Onboarding düzenleme mesajı kaydedilemedi:", messageError);

    return NextResponse.json(
      { success: false, error: "POP yanıtı kaydedilemedi." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    reply,
  });
}
