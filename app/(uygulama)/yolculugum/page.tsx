import { redirect } from "next/navigation";
import JourneyClient, {
  type JourneyWorld,
} from "../../../components/journey/JourneyClient";
import { createClient } from "../../../lib/supabase/server";

import { getAcademyData } from "../../../lib/data/academy";
const worldImages: Record<string, string> = {
  forest: "/images/worlds/orman.png",
  village: "/images/worlds/koy.png",
  ocean: "/images/worlds/okyanus.png",
  volcano: "/images/worlds/volkan.png",
  kingdom: "/images/worlds/krallik.png",
};

export default async function YolculugumPage() {
  const data = await getAcademyData();
  // Kullanıcı giriş yapmamışsa ana sayfaya gönderir.
  if (!data) {
    redirect("/");
  }

  const supabase = await createClient();

  const { count: completedQuizCount, error: completedQuizError } =
    await supabase
      .from("quiz_attempts")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed");

  if (completedQuizError) {
    throw new Error(
      `Quiz istatistiği okunamadı: ${completedQuizError.message}`,
    );
  }

  const worlds: JourneyWorld[] = data.worlds.map((world) => ({
    id: String(world.world_number),
    name: world.name,
    image: worldImages[world.theme] ?? "/images/worlds/orman.png",
    unlocked: world.status !== "locked",
    current: world.status === "active",
  }));

  const completedWorldCount = data.worlds.filter(
    (world) => world.status === "completed",
  ).length;

  const journeyStats = [
    {
      label: "Toplam XP",
      value: `${Number(data.journey?.total_xp ?? 0)} XP`,
    },
    {
      label: "Tamamlanan Dünya",
      value: `${completedWorldCount} dünya`,
    },
    {
      label: "Çözülen Quiz",
      value: `${completedQuizCount ?? 0} quiz`,
    },
    {
      label: "Kazanılan Unvan",
      value: `${data.titles.length} unvan`,
    },
  ];

  const earnedBadgeKeys = data.badges.map((badge) => badge.badge_key);

  const mainTask = data.tasks.find((task) => task.task_type === "main");

  return (
    <JourneyClient
      goalDescription={
        data.journey?.goal_name ??
        data.profile?.learning_goal ??
        "Öğrenme hedefin hazırlanıyor."
      }
      currentLevel={data.currentWorld?.name ?? "Yolculuk hazırlanıyor"}
      levelNumber={Number(data.currentWorld?.world_number ?? 1)}
      currentXp={Number(data.currentWorld?.xp_earned ?? 0)}
      xpGoal={Number(data.currentWorld?.xp_required ?? 0)}
      earnedBadgeKeys={earnedBadgeKeys}
      mainTaskTitle={mainTask?.title ?? "Ana görev henüz oluşturulmadı."}
      completedMainSteps={data.currentWorld?.main_task_approved ? 1 : 0}
      totalMainSteps={1}
      worlds={worlds}
      stats={journeyStats}
      popMessages={data.currentWorld?.pop_messages ?? {}}
    />
  );
}
