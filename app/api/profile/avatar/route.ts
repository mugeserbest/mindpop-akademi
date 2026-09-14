import { NextResponse } from "next/server";
import { avatars } from "@/data/Avatars";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  // Tarayıcının gönderdiği avatar kimliğini alır.
  const payload: unknown = await request.json().catch(() => null);

  const avatarId =
    typeof payload === "object" &&
    payload !== null &&
    "avatarId" in payload &&
    typeof payload.avatarId === "string"
      ? payload.avatarId
      : null;

  if (!avatarId) {
    return NextResponse.json(
      { success: false, error: "Geçersiz avatar seçimi." },
      { status: 400 },
    );
  }

  // İsteği yapan kişinin gerçekten giriş yapmış olup olmadığını kontrol eder.
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

  // Gönderilen kimlik gerçekten uygulamadaki bir avatar mı?
  const avatar = avatars.find((item) => item.id === avatarId);

  if (!avatar) {
    return NextResponse.json(
      { success: false, error: "Bu avatar bulunamadı." },
      { status: 400 },
    );
  }

  const adminSupabase = createAdminClient();

  // Kullanıcının bütün yolculuklarını bulur.
  const { data: journeys, error: journeysError } = await adminSupabase
    .from("learning_journeys")
    .select("id")
    .eq("user_id", user.id);

  if (journeysError) {
    console.error("Yolculuklar okunamadı:", journeysError);

    return NextResponse.json(
      { success: false, error: "Avatar şu anda doğrulanamadı." },
      { status: 500 },
    );
  }

  const journeyIds = (journeys ?? []).map((journey) => journey.id);
  let openedThemes: string[] = [];

  // Varsayılan avatarların dünyaya ihtiyacı yoktur.
  // Dünya avatarıysa kullanıcının ilgili dünyayı açmış olması gerekir.
  if (avatar.unlockTheme && journeyIds.length > 0) {
    const { data: worlds, error: worldsError } = await adminSupabase
      .from("journey_worlds")
      .select("theme")
      .in("journey_id", journeyIds)
      .in("status", ["active", "completed"]);

    if (worldsError) {
      console.error("Dünyalar okunamadı:", worldsError);

      return NextResponse.json(
        { success: false, error: "Avatar şu anda doğrulanamadı." },
        { status: 500 },
      );
    }

    openedThemes = (worlds ?? []).map((world) => world.theme);
  }

  if (avatar.unlockTheme && !openedThemes.includes(avatar.unlockTheme)) {
    return NextResponse.json(
      { success: false, error: "Bu avatar henüz açılmadı." },
      { status: 403 },
    );
  }

  // Kullanıcı kimliğini tarayıcıdan almıyoruz; giriş oturumundan aldık.
  const { error: updateError } = await adminSupabase
    .from("profiles")
    .update({ avatar_id: avatar.id })
    .eq("id", user.id);

  if (updateError) {
    console.error("Avatar kaydedilemedi:", updateError);

    return NextResponse.json(
      { success: false, error: "Avatar kaydedilemedi." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    avatarId: avatar.id,
  });
}
