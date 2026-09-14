import { redirect } from "next/navigation";
import DashboardClient from "../../../components/dashboard/DashboardClient";
import { avatars } from "../../../data/Avatars";
import { getAcademyData } from "../../../lib/data/academy";

export default async function DashboardPage() {
  const data = await getAcademyData();

  // Kullanıcı giriş yapmamışsa ana sayfaya gönderir.
  if (!data) {
    redirect("/");
  }

  // Kullanıcının seçtiği avatarı bulur.
  const selectedAvatar =
    avatars.find((avatar) => avatar.id === data.profile?.avatar_id) ??
    avatars[0];

  const earnedBadgeKeys = data.badges.map((badge) => badge.badge_key);

  // Aktif dünyanın ana görevini bulur.
  const mainTask = data.tasks.find((task) => task.task_type === "main");

  // Günlük görevleri ekranın anlayacağı şekle dönüştürür.
  const dailyTasks = data.tasks
    .filter((task) => task.task_type === "daily")
    .map((task) => ({
      id: String(task.id),
      title: task.title,
      description: task.description ?? undefined,
      xp: Number(task.xp_reward),
      completed: task.status === "completed",
    }));

  // Haftalık görevleri ekranın anlayacağı şekle dönüştürür.
  const weeklyTasks = data.tasks
    .filter((task) => task.task_type === "weekly")
    .map((task) => ({
      id: String(task.id),
      title: task.title,
      description: task.description ?? undefined,
      xp: Number(task.xp_reward),
      completed: task.status === "completed",
    }));

  const mainTaskSteps = [...(mainTask?.main_task_steps ?? [])].sort(
    (firstStep, secondStep) =>
      firstStep.display_order - secondStep.display_order,
  );

  const currentMainTaskStep = mainTaskSteps.find((step) => !step.completed);

  const completedMainSteps = mainTaskSteps.filter(
    (step) => step.completed,
  ).length;

  const totalMainSteps = mainTaskSteps.length;

  const mainTaskStatus = data.currentWorld?.main_task_approved
    ? "POP tarafından onaylandı."
    : currentMainTaskStep
      ? `${currentMainTaskStep.label}${
          currentMainTaskStep.description
            ? ` — ${currentMainTaskStep.description}`
            : ""
        }`
      : mainTask
        ? "Tüm adımları tamamladın. Çalışmanı POP’a gönderebilirsin."
        : "Ana görev hazırlanıyor.";

  return (
    <DashboardClient
      avatarImage={selectedAvatar.largeImage}
      goalTitle={data.journey?.reward_title ?? "Yeni bir unvan seni bekliyor"}
      goalDescription={
        data.journey?.goal_name ??
        data.profile?.learning_goal ??
        "Öğrenme yolculuğun hazırlanıyor."
      }
      currentLevel={data.currentWorld?.name ?? "Yolculuk hazırlanıyor"}
      levelNumber={Number(data.currentWorld?.world_number ?? 1)}
      currentXp={Number(data.currentWorld?.xp_earned ?? 0)}
      xpGoal={Number(data.currentWorld?.xp_required ?? 0)}
      mainTaskTitle={mainTask?.title ?? "Ana görev henüz oluşturulmadı."}
      mainTaskStatus={mainTaskStatus}
      mainTaskApproved={Boolean(data.currentWorld?.main_task_approved)}
      completedMainSteps={completedMainSteps}
      totalMainSteps={totalMainSteps}
      initialDailyTasks={dailyTasks}
      initialWeeklyTasks={weeklyTasks}
      earnedBadgeKeys={earnedBadgeKeys}
    />
  );
}
