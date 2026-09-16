import { NextResponse } from "next/server";
import { generateWorldContent } from "@/lib/ai/generate-world-content";
import { consumeAiQuota, refundAiQuota } from "@/lib/ai/quota";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const GENERATION_LOCK_TIMEOUT_MS = 90 * 1000;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ worldId: string }> },
) {
  const { worldId } = await params;

  if (!/^\d+$/.test(worldId)) {
    return NextResponse.json(
      { success: false, error: "Geçersiz dünya numarası." },
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
  const numericWorldId = Number(worldId);

  const { data: world, error: worldError } = await adminSupabase
    .from("journey_worlds")
    .select(
      "id, journey_id, world_number, name, description, theme, xp_required, quiz_pass_score, status, content_status, updated_at",
    )
    .eq("id", numericWorldId)
    .maybeSingle();

  if (worldError || !world) {
    return NextResponse.json(
      { success: false, error: "Dünya bulunamadı." },
      { status: 404 },
    );
  }

  const { data: journey, error: journeyError } = await adminSupabase
    .from("learning_journeys")
    .select("id, goal_prompt, goal_name, status")
    .eq("id", world.journey_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (journeyError || !journey || world.status !== "active") {
    return NextResponse.json(
      { success: false, error: "Bu dünya henüz içerik üretimine uygun değil." },
      { status: 403 },
    );
  }

  if (world.content_status === "ready") {
    return NextResponse.json({ success: true, alreadyGenerated: true });
  }

  const staleTime = new Date(
    Date.now() - GENERATION_LOCK_TIMEOUT_MS,
  ).toISOString();

  if (world.content_status === "generating") {
    const { data: staleWorld, error: staleWorldError } = await adminSupabase
      .from("journey_worlds")
      .update({ content_status: "pending" })
      .eq("id", numericWorldId)
      .eq("content_status", "generating")
      .lt("updated_at", staleTime)
      .select("id")
      .maybeSingle();

    if (staleWorldError) {
      console.error("Takılan dünya üretimi sıfırlanamadı:", staleWorldError);
    }

    // Süre aşımında çalışan sunucu işlemi catch/finally bloğuna ulaşamaz.
    // Bu durumda bir sonraki güvenli denemede kotayı bir kez geri veririz.
    if (staleWorld) {
      try {
        await refundAiQuota(
          adminSupabase,
          user.id,
          "world_content_generation",
        );
      } catch (refundError) {
        console.error("Takılan dünya üretiminin kotası iade edilemedi:", refundError);
      }
    }
  }

  const { data: reservedWorld, error: reserveError } = await adminSupabase
    .from("journey_worlds")
    .update({ content_status: "generating" })
    .eq("id", numericWorldId)
    .in("content_status", ["pending", "failed"])
    .select("id")
    .maybeSingle();

  if (reserveError || !reservedWorld) {
    return NextResponse.json(
      {
        success: false,
        error: "Bu dünyanın içeriği hazırlanıyor. Lütfen biraz bekle.",
      },
      { status: 409 },
    );
  }

  let shouldRefundQuota = false;

  try {
    const quota = await consumeAiQuota(
      adminSupabase,
      user.id,
      "world_content_generation",
    );

    if (!quota.allowed) {
      await adminSupabase
        .from("journey_worlds")
        .update({ content_status: "failed" })
        .eq("id", numericWorldId);

      return NextResponse.json(
        {
          success: false,
          error: "Bugünkü yapay zekâ kullanım limitine ulaştın. Yarın tekrar deneyebilirsin.",
        },
        { status: 429 },
      );
    }

    shouldRefundQuota = true;

    const content = await generateWorldContent({
      goalPrompt: journey.goal_prompt,
      goalName: journey.goal_name ?? "Öğrenme yolculuğu",
      world: {
        world_number: world.world_number,
        name: world.name,
        description: world.description ?? "",
        theme: world.theme as "forest" | "village" | "ocean" | "volcano" | "kingdom",
        xp_required: Number(world.xp_required),
        quiz_pass_score: world.quiz_pass_score,
      },
    });

    const { error: populateError } = await adminSupabase.rpc(
      "populate_ai_generated_world_content",
      {
        p_user_id: user.id,
        p_world_id: numericWorldId,
        p_content: content,
      },
    );

    if (populateError) {
      throw populateError;
    }

    shouldRefundQuota = false;

    return NextResponse.json({ success: true, alreadyGenerated: false });
  } catch (error) {
    console.error("AI dünya içeriği oluşturulamadı:", error);

    if (shouldRefundQuota) {
      try {
        await refundAiQuota(
          adminSupabase,
          user.id,
          "world_content_generation",
        );
      } catch (refundError) {
        console.error("Dünya içeriği kotası iade edilemedi:", refundError);
      }
    }

    await adminSupabase
      .from("journey_worlds")
      .update({ content_status: "failed" })
      .eq("id", numericWorldId);

    return NextResponse.json(
      {
        success: false,
        error: "Yeni dünyanın görevleri şu anda hazırlanamadı. Lütfen tekrar dene.",
      },
      { status: 500 },
    );
  }
}
