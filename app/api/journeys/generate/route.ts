import { NextResponse } from "next/server";
import { generateRoadmap } from "@/lib/ai/generate-roadmap";
import { consumeAiQuota, refundAiQuota } from "@/lib/ai/quota";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type GenerationPayload = {
  goalPrompt: string;
  onboardingConversationId: number | null;
};

function getPayload(payload: unknown): GenerationPayload | null {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("goalPrompt" in payload) ||
    typeof payload.goalPrompt !== "string"
  ) {
    return null;
  }

  const goalPrompt = payload.goalPrompt.trim();

  if (goalPrompt.length < 3 || goalPrompt.length > 500) {
    return null;
  }

  const onboardingConversationId =
    "onboardingConversationId" in payload
      ? payload.onboardingConversationId
      : null;

  if (
    onboardingConversationId !== null &&
    (!Number.isInteger(onboardingConversationId) ||
      typeof onboardingConversationId !== "number" ||
      onboardingConversationId <= 0)
  ) {
    return null;
  }

  return {
    goalPrompt,
    onboardingConversationId,
  };
}

function getJourneyId(value: unknown): number | null {
  return typeof value === "object" &&
    value !== null &&
    "journey_id" in value &&
    typeof value.journey_id === "number"
    ? value.journey_id
    : null;
}

export async function POST(request: Request) {
  const rawPayload: unknown = await request.json().catch(() => null);
  const payload = getPayload(rawPayload);

  if (!payload) {
    return NextResponse.json(
      {
        success: false,
        error: "Öğrenme hedefi veya onboarding bilgisi geçersiz.",
      },
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
  let shouldRefundQuota = false;

  const staleLockTime = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  await adminSupabase
    .from("ai_generation_locks")
    .delete()
    .eq("user_id", user.id)
    .lt("created_at", staleLockTime);

  const { error: lockError } = await adminSupabase
    .from("ai_generation_locks")
    .insert({ user_id: user.id });

  if (lockError) {
    if (lockError.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          error: "Yol haritan hazırlanıyor. Lütfen biraz bekle.",
        },
        { status: 409 },
      );
    }

    console.error("Yol haritası kilidi oluşturulamadı:", lockError);

    return NextResponse.json(
      { success: false, error: "Yol haritası şu anda başlatılamadı." },
      { status: 500 },
    );
  }

  try {
    const { data: existingJourney, error: journeyError } = await adminSupabase
      .from("learning_journeys")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["draft", "generating", "active"])
      .maybeSingle();

    if (journeyError) {
      throw journeyError;
    }

    if (existingJourney) {
      return NextResponse.json(
        {
          success: false,
          error: "Önce mevcut öğrenme yolculuğunu tamamlamalısın.",
        },
        { status: 409 },
      );
    }

    let roadmapInput = payload.goalPrompt;
    let approvedConversationId: number | null = null;

    // Onboarding ile geldiyse özeti yalnızca sunucudan okur.
    if (payload.onboardingConversationId) {
      const { data: onboardingSession, error: onboardingError } =
        await adminSupabase
          .from("onboarding_sessions")
          .select("conversation_id, roadmap_summary")
          .eq("conversation_id", payload.onboardingConversationId)
          .eq("user_id", user.id)
          .eq("status", "ready")
          .maybeSingle();

      if (onboardingError || !onboardingSession?.roadmap_summary) {
        return NextResponse.json(
          {
            success: false,
            error: "Onboarding özeti onay için henüz hazır değil.",
          },
          { status: 403 },
        );
      }

      approvedConversationId = onboardingSession.conversation_id;
      roadmapInput =
        `${payload.goalPrompt}\n\n` +
        `Kullanıcının POP ile netleştirdiği bilgiler:\n` +
        onboardingSession.roadmap_summary;
    }

    const quota = await consumeAiQuota(
      adminSupabase,
      user.id,
      "journey_generation",
    );

    if (!quota.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Bugünkü yol haritası oluşturma limitine ulaştın. Yarın tekrar deneyebilirsin.",
        },
        { status: 429 },
      );
    }

    shouldRefundQuota = true;

    const roadmap = await generateRoadmap(roadmapInput);

    const { data, error: createError } = await adminSupabase.rpc(
      "create_ai_generated_journey",
      {
        p_user_id: user.id,
        p_goal_prompt: payload.goalPrompt,
        p_roadmap: roadmap,
      },
    );

    if (createError) {
      throw createError;
    }

    const journeyId = getJourneyId(data);

    if (!journeyId) {
      throw new Error("Yolculuk kimliği alınamadı.");
    }

    // Yolculuk kalıcı olarak oluştu; bundan sonraki yardımcı işlemler hata verse
    // bile oluşturma kotası tüketilmiş sayılır.
    shouldRefundQuota = false;

    const { error: badgeError } = await adminSupabase.rpc(
      "evaluate_user_badges",
      {
        p_user_id: user.id,
      },
    );

    if (badgeError) {
      // Rozet hatası yolculuğun oluşmasını geri almaz.
      console.error("Yolculuk rozeti kontrol edilemedi:", badgeError.message);
    }

    if (approvedConversationId) {
      const { error: onboardingUpdateError } = await adminSupabase
        .from("onboarding_sessions")
        .update({
          status: "approved",
          updated_at: new Date().toISOString(),
        })
        .eq("conversation_id", approvedConversationId)
        .eq("user_id", user.id);

      if (onboardingUpdateError) {
        throw onboardingUpdateError;
      }
    }

    // Yeni yolculuk, temiz bir POP sohbetiyle başlar. Konuşma oturumlarını
    // silmeyiz; POP-Dostu rozeti açılan konuşma sayısından hesaplanır.
    const { data: previousConversations, error: conversationsError } =
      await adminSupabase
        .from("pop_conversations")
        .select("id")
        .eq("user_id", user.id);

    if (conversationsError) {
      console.error("Eski POP konuşmaları okunamadı:", conversationsError);
    } else {
      const conversationIds = (previousConversations ?? []).map(
        (conversation) => conversation.id,
      );

      if (conversationIds.length > 0) {
        const { error: clearMessagesError } = await adminSupabase
          .from("pop_messages")
          .delete()
          .in("conversation_id", conversationIds);

        if (clearMessagesError) {
          console.error("Eski POP mesajları temizlenemedi:", clearMessagesError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      journeyId,
    });
  } catch (error) {
    console.error("AI yol haritası oluşturulamadı:", error);

    if (shouldRefundQuota) {
      try {
        await refundAiQuota(adminSupabase, user.id, "journey_generation");
      } catch (refundError) {
        console.error("Yol haritası kotası iade edilemedi:", refundError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "Yol haritası şu anda oluşturulamadı. Lütfen biraz sonra tekrar dene.",
      },
      { status: 500 },
    );
  } finally {
    await adminSupabase
      .from("ai_generation_locks")
      .delete()
      .eq("user_id", user.id);
  }
}
