import { redirect } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import MobileNavigation from "../../components/MobileNavigation";
import { createClient } from "../../lib/supabase/server";
import { createAdminClient } from "../../lib/supabase/admin";

const worldImages: Record<string, string> = {
  forest: "/images/worlds/orman.png",
  village: "/images/worlds/koy.png",
  ocean: "/images/worlds/okyanus.png",
  volcano: "/images/worlds/volkan.png",
  kingdom: "/images/worlds/krallik.png",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Giriş yapan öğrenciyi bulur.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Öğrenci giriş yapmamışsa ana sayfaya gönderir.
  if (!user) {
    redirect("/");
  }

  // Kullanıcı uygulama alanına girdiğinde, bugün için tek giriş günü kaydı oluşturur.
  const adminSupabase = createAdminClient();

  const { error: loginDayError } = await adminSupabase.rpc(
    "record_user_login",
    {
      p_user_id: user.id,
    },
  );

  if (loginDayError) {
    // Giriş kaydı sorunu uygulamanın açılmasını engellemez.
    console.error("Giriş günü kaydedilemedi:", loginDayError.message);
  }

  // Aktif dünyadaki günlük ve haftalık görev döngülerini yeniler.
  const { error: taskCycleError } = await adminSupabase.rpc(
    "refresh_active_world_task_cycles",
    {
      p_user_id: user.id,
    },
  );

  if (taskCycleError) {
    // Görev yenileme sorunu uygulamanın açılmasını engellemez.
    console.warn("Görev döngüsü yenilenemedi:", taskCycleError.message);
  }

  // Giriş serisine bağlı rozetleri kontrol eder.
  const { error: streakBadgeError } = await adminSupabase.rpc(
    "evaluate_streak_badges",
    {
      p_user_id: user.id,
    },
  );

  if (streakBadgeError) {
    // Rozet kontrolü uygulamanın açılmasını engellemez.
    console.error(
      "Giriş serisi rozetleri kontrol edilemedi:",
      streakBadgeError.message,
    );
  }

  // Öğrencinin devam eden yolculuğunu bulur.
  const { data: journey, error: journeyError } = await supabase
    .from("learning_journeys")
    .select("id")
    .eq("user_id", user.id)
    .in("status", ["draft", "generating", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (journeyError) {
    throw new Error(`Yolculuk okunamadı: ${journeyError.message}`);
  }

  // Devam eden yolculuğun aktif dünyasını bulur.
  const { data: currentWorld, error: worldError } = await supabase
    .from("journey_worlds")
    .select("world_number, name, theme, xp_earned, xp_required")
    .eq("journey_id", journey?.id ?? -1)
    .eq("status", "active")
    .maybeSingle();

  if (worldError) {
    throw new Error(`Aktif dünya okunamadı: ${worldError.message}`);
  }

  const worldTheme = currentWorld?.theme ?? "forest";

  return (
    <div className="flex min-h-screen">
      <Sidebar
        level={Number(currentWorld?.world_number ?? 1)}
        currentXp={Number(currentWorld?.xp_earned ?? 0)}
        xpGoal={Number(currentWorld?.xp_required ?? 0)}
        world={{
          name: currentWorld?.name ?? "Yolculuk hazırlanıyor",
          image: worldImages[worldTheme] ?? worldImages.forest,
        }}
      />

      <MobileNavigation />

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
