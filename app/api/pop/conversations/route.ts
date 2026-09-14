import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

  // Kullanıcının son konuşma oturumlarını bulur.
  const { data: conversations, error: conversationsError } = await adminSupabase
    .from("pop_conversations")
    .select("id")
    .eq("user_id", user.id)
    .order("last_message_at", { ascending: false })
    .limit(20);

  if (conversationsError) {
    console.error("POP konuşmaları okunamadı:", conversationsError);

    return NextResponse.json(
      { success: false, error: "POP geçmişi şu anda okunamadı." },
      { status: 500 },
    );
  }

  const conversationIds = (conversations ?? []).map(
    (conversation) => conversation.id,
  );

  if (conversationIds.length === 0) {
    return NextResponse.json({
      success: true,
      messages: [],
    });
  }

  // En son 50 mesajı alır; eski kayıtların sayfayı ağırlaştırmasını önler.
  const { data: messages, error: messagesError } = await adminSupabase
    .from("pop_messages")
    .select("role, content, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false })
    .limit(50);

  if (messagesError) {
    console.error("POP mesajları okunamadı:", messagesError);

    return NextResponse.json(
      { success: false, error: "POP geçmişi şu anda okunamadı." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    // Veritabanından tersten aldık; ekranda eskiden yeniye gösteririz.
    messages: (messages ?? []).reverse(),
  });
}

export async function POST() {
  // Konuşmayı açan kullanıcının oturumunu doğrular.
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

  // Varsa kullanıcının devam eden yolculuğunu konuşmaya bağlar.
  const { data: journey, error: journeyError } = await adminSupabase
    .from("learning_journeys")
    .select("id")
    .eq("user_id", user.id)
    .in("status", ["draft", "generating", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (journeyError) {
    console.error("Yolculuk okunamadı:", journeyError);

    return NextResponse.json(
      { success: false, error: "POP konuşması şu anda açılamadı." },
      { status: 500 },
    );
  }

  const { data, error } = await adminSupabase.rpc("start_pop_conversation", {
    p_user_id: user.id,
    p_journey_id: journey?.id ?? null,
  });

  if (error) {
    console.error("POP konuşması oluşturulamadı:", error);

    return NextResponse.json(
      { success: false, error: "POP konuşması şu anda açılamadı." },
      { status: 500 },
    );
  }

  const conversationId =
    typeof data === "number"
      ? data
      : typeof data === "object" &&
          data !== null &&
          "conversation_id" in data &&
          typeof data.conversation_id === "number"
        ? data.conversation_id
        : null;

  if (!conversationId) {
    console.error("Beklenmeyen POP konuşması yanıtı:", data);

    return NextResponse.json(
      { success: false, error: "POP konuşması doğru oluşturulamadı." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    conversation: {
      id: conversationId,
    },
  });
}
