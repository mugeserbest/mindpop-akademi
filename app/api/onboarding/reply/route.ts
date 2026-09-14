import { NextResponse } from "next/server";
import { generateOnboardingReply } from "@/lib/ai/generate-onboarding-reply";
import { consumeAiQuota } from "@/lib/ai/quota";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ReplyPayload = {
  conversationId: number;
  message: string;
};

function getPayload(payload: unknown): ReplyPayload | null {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("conversationId" in payload) ||
    typeof payload.conversationId !== "number" ||
    !Number.isInteger(payload.conversationId) ||
    payload.conversationId <= 0 ||
    !("message" in payload) ||
    typeof payload.message !== "string"
  ) {
    return null;
  }

  const message = payload.message.trim();

  if (message.length < 1 || message.length > 600) {
    return null;
  }

  return {
    conversationId: payload.conversationId,
    message,
  };
}

export async function POST(request: Request) {
  const rawPayload: unknown = await request.json().catch(() => null);
  const payload = getPayload(rawPayload);

  if (!payload) {
    return NextResponse.json(
      { success: false, error: "Geçersiz onboarding mesajı." },
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

  // Konuşmanın gerçekten bu kullanıcıya ait onboarding oturumu olduğunu doğrular.
  const { data: session, error: sessionError } = await adminSupabase
    .from("onboarding_sessions")
    .select("conversation_id, goal_prompt, status")
    .eq("conversation_id", payload.conversationId)
    .eq("user_id", user.id)
    .in("status", ["collecting", "ready"])
    .maybeSingle();

  if (sessionError || !session) {
    return NextResponse.json(
      { success: false, error: "Bu onboarding konuşmasına erişemezsin." },
      { status: 403 },
    );
  }

  const { error: userMessageError } = await adminSupabase
    .from("pop_messages")
    .insert({
      conversation_id: session.conversation_id,
      role: "user",
      content: payload.message,
    });

  if (userMessageError) {
    console.error(
      "Onboarding kullanıcı mesajı kaydedilemedi:",
      userMessageError,
    );

    return NextResponse.json(
      { success: false, error: "Mesajın kaydedilemedi." },
      { status: 500 },
    );
  }

  // AI'ya en son 16 mesajı verir; görüşme gereksiz büyümez.
  const { data: latestMessages, error: messagesError } = await adminSupabase
    .from("pop_messages")
    .select("role, content")
    .eq("conversation_id", session.conversation_id)
    .order("created_at", { ascending: false })
    .limit(16);

  if (messagesError) {
    console.error("Onboarding mesajları okunamadı:", messagesError);

    return NextResponse.json(
      { success: false, error: "Onboarding geçmişi okunamadı." },
      { status: 500 },
    );
  }

  try {
    const quota = await consumeAiQuota(
      adminSupabase,
      user.id,
      "onboarding_reply",
    );

    if (!quota.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Bugünkü POP onboarding mesajı limitine ulaştın. Yarın tekrar deneyebilirsin.",
        },
        { status: 429 },
      );
    }

    const onboardingReply = await generateOnboardingReply(
      session.goal_prompt,
      (latestMessages ?? []).reverse() as {
        role: "user" | "pop";
        content: string;
      }[],
    );

    const { error: popMessageError } = await adminSupabase
      .from("pop_messages")
      .insert({
        conversation_id: session.conversation_id,
        role: "pop",
        content: onboardingReply.reply,
        ai_model: "gpt-5.6-luna",
      });

    if (popMessageError) {
      throw popMessageError;
    }

    const { error: updateError } = await adminSupabase
      .from("onboarding_sessions")
      .update({
        status: onboardingReply.status,
        roadmap_summary:
          onboardingReply.status === "ready"
            ? onboardingReply.roadmap_summary
            : null,
        updated_at: new Date().toISOString(),
      })
      .eq("conversation_id", session.conversation_id)
      .eq("user_id", user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      reply: onboardingReply.reply,
      status: onboardingReply.status,
      roadmapSummary:
        onboardingReply.status === "ready"
          ? onboardingReply.roadmap_summary
          : null,
    });
  } catch (error) {
    console.error("POP onboarding yanıtı oluşturulamadı:", error);

    return NextResponse.json(
      {
        success: false,
        error: "POP şu anda yanıt veremiyor. Lütfen tekrar dene.",
      },
      { status: 500 },
    );
  }
}
