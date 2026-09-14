import { NextResponse } from "next/server";
import { openai } from "@/lib/ai/openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { POP_CORE_RULES } from "@/lib/ai/pop-rules";
import { formatPopReply } from "@/lib/ai/format-pop-reply";
import { consumeAiQuota } from "@/lib/ai/quota";

type MessagePayload = {
  message: string;
  conversationId: number;
};

function isValidPayload(payload: unknown): payload is MessagePayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof payload.message === "string" &&
    "conversationId" in payload &&
    typeof payload.conversationId === "number" &&
    Number.isInteger(payload.conversationId) &&
    payload.conversationId > 0
  );
}

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json().catch(() => null);

    if (!isValidPayload(payload)) {
      return NextResponse.json(
        { success: false, error: "Geçersiz mesaj isteği." },
        { status: 400 },
      );
    }

    const message = payload.message.trim();

    if (message.length < 1 || message.length > 600) {
      return NextResponse.json(
        { success: false, error: "Mesaj 1-600 karakter arasında olmalı." },
        { status: 400 },
      );
    }

    // Kullanıcının oturumunu doğrular.
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "POP ile konuşmak için giriş yapmalısın." },
        { status: 401 },
      );
    }

    const adminSupabase = createAdminClient();

    // Tarayıcıdan gelen konuşma kimliğinin gerçekten bu kullanıcıya ait olduğunu doğrular.
    const { data: conversation, error: conversationError } = await adminSupabase
      .from("pop_conversations")
      .select("id")
      .eq("id", payload.conversationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (conversationError || !conversation) {
      return NextResponse.json(
        { success: false, error: "Bu POP konuşmasına erişemezsin." },
        { status: 403 },
      );
    }

    const { data: journey, error: journeyError } = await adminSupabase
      .from("learning_journeys")
      .select("id, goal_name, goal_prompt, current_world_position, total_xp")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (journeyError) {
      console.error("POP için yolculuk bilgisi okunamadı:", journeyError);
    }

    let activeWorld: {
      name: string;
      description: string | null;
      world_number: number;
      xp_earned: number;
      xp_required: number;
    } | null = null;

    if (journey) {
      const { data: world, error: worldError } = await adminSupabase
        .from("journey_worlds")
        .select("name, description, world_number, xp_earned, xp_required")
        .eq("journey_id", journey.id)
        .eq("status", "active")
        .maybeSingle();

      if (worldError) {
        console.error("POP için aktif dünya okunamadı:", worldError);
      } else {
        activeWorld = world;
      }
    }

    const journeyContext = journey
      ? `
Aktif öğrenme hedefi: ${journey.goal_name ?? journey.goal_prompt}
Toplam XP: ${journey.total_xp}
Mevcut dünya: ${
          activeWorld
            ? `${activeWorld.world_number}. dünya — ${activeWorld.name}`
            : "Henüz belirlenmedi"
        }
Dünya açıklaması: ${activeWorld?.description ?? "Yok"}
Dünya XP ilerlemesi: ${
          activeWorld
            ? `${activeWorld.xp_earned} / ${activeWorld.xp_required}`
            : "Yok"
        }
`
      : "Kullanıcının henüz aktif bir öğrenme yolculuğu yok.";

    const outOfScopeReply = journey
      ? `Bu konu mevcut yol haritanla eşleşmiyor. POP olarak yalnızca ${
          journey.goal_name ?? journey.goal_prompt
        } yolculuğundaki öğrenme konularında yardımcı olabilirim.`
      : "Aktif bir yolculuğun olmadığı için yalnızca yeni öğrenme hedefini netleştirmene yardımcı olabilirim.";

    const quota = await consumeAiQuota(
      adminSupabase,
      user.id,
      "pop_message",
    );

    if (!quota.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Bugünkü POP mesajı limitine ulaştın. Yarın tekrar deneyebilirsin.",
        },
        { status: 429 },
      );
    }

    // Kullanıcının mesajını önce kalıcı olarak kaydeder.
    const { error: userMessageError } = await adminSupabase
      .from("pop_messages")
      .insert({
        conversation_id: conversation.id,
        role: "user",
        content: message,
      });

    if (userMessageError) {
      console.error("Kullanıcı mesajı kaydedilemedi:", userMessageError);

      return NextResponse.json(
        { success: false, error: "Mesajın kaydedilemedi. Lütfen tekrar dene." },
        { status: 500 },
      );
    }

    const { data: recentMessages, error: messagesError } = await adminSupabase
      .from("pop_messages")
      .select("role, content, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .limit(8);

    if (messagesError) {
      console.error("POP sohbet geçmişi okunamadı:", messagesError);
    }

    const conversationHistory = [...(recentMessages ?? [])]
      .reverse()
      .map(
        (chatMessage) =>
          `${chatMessage.role === "user" ? "Öğrenci" : "POP"}: ${
            chatMessage.content
          }`,
      )
      .join("\n");

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",
      reasoning: {
        effort: "low",
      },
      max_output_tokens: 350,
      instructions: `
${POP_CORE_RULES}

SANA VERİLEN ÖĞRENCİ BAĞLAMI
- Aşağıdaki yolculuk bilgileri sunucudan gelir ve gerçektir.
- Önerilerini kullanıcının aktif hedefine, mevcut dünyasına ve XP ilerlemesine göre uyarlamalısın.
- Tamamlanmamış bir görevi tamamlanmış gibi söyleme.
- Bu bağlamda olmayan bir hedefi kullanıcının hedefiymiş gibi varsayma.
- Öğrencinin son sorusu yol haritası bağlamıyla eşleşmiyorsa yalnızca aşağıdaki
  cümleyi yaz. Başka hiçbir açıklama, örnek veya öneri ekleme:
  “${outOfScopeReply}”
`,
      input: `
ÖĞRENCİNİN AKTİF YOLCULUK BAĞLAMI:
${journeyContext}

MEVCUT SOHBET:
${conversationHistory}

ÖĞRENCİNİN SON MESAJI:
${message}
`,
    });

    const reply = formatPopReply(response.output_text); 

    if (!reply) {
      return NextResponse.json(
        { success: false, error: "POP şu anda yanıt oluşturamadı." },
        { status: 502 },
      );
    }

    // POP'un yanıtını da kalıcı olarak kaydeder.
    const { error: popMessageError } = await adminSupabase
      .from("pop_messages")
      .insert({
        conversation_id: conversation.id,
        role: "pop",
        content: reply,
        ai_model: "gpt-5.6-luna",
      });

    if (popMessageError) {
      console.error("POP yanıtı kaydedilemedi:", popMessageError);

      return NextResponse.json(
        { success: false, error: "POP yanıtı kaydedilemedi." },
        { status: 500 },
      );
    }

    // Konuşmanın en son ne zaman kullanıldığını günceller.
    await adminSupabase
      .from("pop_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversation.id);

    return NextResponse.json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error("POP yanıtı oluşturulamadı:", error);

    return NextResponse.json(
      {
        success: false,
        error: "POP şu anda yanıt veremiyor. Lütfen tekrar dene.",
      },
      { status: 500 },
    );
  }
}
