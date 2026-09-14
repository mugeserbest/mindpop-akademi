import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function getConversationId(value: unknown): number | null {
  return (
    typeof value === "object" &&
    value !== null &&
    "conversation_id" in value &&
    typeof value.conversation_id === "number"
      ? value.conversation_id
      : null
  );
}

export async function POST() {
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

  const goalPrompt = user.user_metadata.learning_goal;

  if (typeof goalPrompt !== "string" || goalPrompt.trim().length < 3) {
    return NextResponse.json(
      { success: false, error: "Öğrenme hedefin bulunamadı." },
      { status: 400 },
    );
  }

  const adminSupabase = createAdminClient();

  // Kullanıcının yarım kalmış onboarding oturumu varsa ona döner.
  const { data: existingSession, error: existingSessionError } =
    await adminSupabase
      .from("onboarding_sessions")
      .select("conversation_id, status, roadmap_summary")
      .eq("user_id", user.id)
      .in("status", ["collecting", "ready"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (existingSessionError) {
    console.error("Onboarding oturumu okunamadı:", existingSessionError);

    return NextResponse.json(
      { success: false, error: "Onboarding şu anda açılamadı." },
      { status: 500 },
    );
  }

  if (existingSession) {
    const { data: messages, error: messagesError } = await adminSupabase
      .from("pop_messages")
      .select("role, content")
      .eq("conversation_id", existingSession.conversation_id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Onboarding mesajları okunamadı:", messagesError);

      return NextResponse.json(
        { success: false, error: "Onboarding geçmişi okunamadı." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      onboarding: {
        conversationId: existingSession.conversation_id,
        status: existingSession.status,
        roadmapSummary: existingSession.roadmap_summary,
      },
      messages: messages ?? [],
    });
  }

  // Yeni onboarding için bir POP konuşması açar.
  const { data: conversationData, error: conversationError } =
    await adminSupabase.rpc("start_pop_conversation", {
      p_user_id: user.id,
      p_journey_id: null,
    });

  if (conversationError) {
    console.error("Onboarding konuşması oluşturulamadı:", conversationError);

    return NextResponse.json(
      { success: false, error: "Onboarding konuşması açılamadı." },
      { status: 500 },
    );
  }

  const conversationId = getConversationId(conversationData);

  if (!conversationId) {
    console.error(
      "Onboarding konuşmasından geçersiz yanıt döndü:",
      conversationData,
    );

    return NextResponse.json(
      { success: false, error: "Onboarding konuşması oluşturulamadı." },
      { status: 500 },
    );
  }

  const initialMessage =
    `Mindpop Akademi’ye hoş geldin! ${goalPrompt.trim()} öğrenmek ` +
    "istediğini görüyorum. Sana uygun bir yol haritası hazırlamam için " +
    "biraz bilgi verir misin? Bu konuda daha önce deneyimin var mı, " +
    "hangi imkanlara sahipsin ve hedefin hobi mi yoksa daha ileri bir " +
    "seviyeye ulaşmak mı?";

  const { error: sessionError } = await adminSupabase
    .from("onboarding_sessions")
    .insert({
      conversation_id: conversationId,
      user_id: user.id,
      goal_prompt: goalPrompt.trim(),
      status: "collecting",
    });

  if (sessionError) {
    console.error("Onboarding oturumu kaydedilemedi:", sessionError);

    return NextResponse.json(
      { success: false, error: "Onboarding oturumu oluşturulamadı." },
      { status: 500 },
    );
  }

  const { error: messageError } = await adminSupabase
    .from("pop_messages")
    .insert({
      conversation_id: conversationId,
      role: "pop",
      content: initialMessage,
      ai_model: "mindpop-onboarding",
    });

  if (messageError) {
    console.error("Onboarding ilk mesajı kaydedilemedi:", messageError);

    return NextResponse.json(
      { success: false, error: "POP'un ilk mesajı kaydedilemedi." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    onboarding: {
      conversationId,
      status: "collecting",
      roadmapSummary: null,
    },
    messages: [
      {
        role: "pop",
        content: initialMessage,
      },
    ],
  });
}