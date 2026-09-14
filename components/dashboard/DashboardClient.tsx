"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TaskListCard from "../TaskListCard";
import MotivationCard from "../MotivationCard";
import BadgesCard from "../BadgesCard";
import JourneySummaryCard from "../JourneySummaryCard";
import PopChatModal from "../PopChatModal";
import { badges } from "../../data/Badges";

export type DashboardTask = {
  id: string;
  description?: string;
  title: string;
  xp: number;
  completed: boolean;
};

type DashboardClientProps = {
  avatarImage: string;
  goalTitle: string;
  goalDescription: string;
  currentLevel: string;
  levelNumber: number;
  currentXp: number;
  xpGoal: number;
  mainTaskTitle: string;
  mainTaskStatus: string;
  completedMainSteps: number;
  totalMainSteps: number;
  initialDailyTasks: DashboardTask[];
  initialWeeklyTasks: DashboardTask[];
  earnedBadgeKeys: string[];
  mainTaskApproved: boolean;
};

export default function DashboardClient({
  avatarImage,
  goalTitle,
  goalDescription,
  currentLevel,
  levelNumber,
  currentXp,
  xpGoal,
  mainTaskTitle,
  mainTaskStatus,
  completedMainSteps,
  totalMainSteps,
  initialDailyTasks,
  initialWeeklyTasks,
  earnedBadgeKeys,
  mainTaskApproved,
}: DashboardClientProps) {
  const router = useRouter();

  const [isPopChatOpen, setIsPopChatOpen] = useState(false);

  const [popChatMode, setPopChatMode] = useState<"onboarding" | "regular">(
    "regular",
  );

  const [dailyTasks, setDailyTasks] = useState(initialDailyTasks);
  const [weeklyTasks, setWeeklyTasks] = useState(initialWeeklyTasks);

  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("onboarding") !== "true") {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setPopChatMode("onboarding");
      setIsPopChatOpen(true);
      window.history.replaceState(null, "", "/dashboard");
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  async function handleCompleteTask(taskId: string) {
    // Başka bir görev kaydediliyorsa yeni işlem başlatmaz.
    if (completingTaskId !== null) {
      return;
    }

    setCompletingTaskId(taskId);
    setTaskError(null);

    try {
      // Next.js sunucusundaki görev tamamlama adresine istek gönderir.
      const response = await fetch(
        `/api/tasks/${encodeURIComponent(taskId)}/complete`,
        {
          method: "POST",
        },
      );

      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ?? "Görev tamamlanırken bir sorun oluştu.",
        );
      }

      // Supabase işlemi başarılı olduktan sonra görevi ekranda işaretler.
      setDailyTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === taskId ? { ...task, completed: true } : task,
        ),
      );

      setWeeklyTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === taskId ? { ...task, completed: true } : task,
        ),
      );

      // Supabase'deki yeni XP miktarını tekrar getirir.
      router.refresh();
    } catch (error) {
      setTaskError(
        error instanceof Error
          ? error.message
          : "Görev tamamlanırken bir sorun oluştu.",
      );
    } finally {
      setCompletingTaskId(null);
    }
  }

  function handleTasksAction() {
    router.push("/akademi");
  }

  function handleMotivationAction() {
    setPopChatMode("regular");
    setIsPopChatOpen(true);
  }

  const earnedBadgeKeySet = new Set(earnedBadgeKeys);

  const userBadges = badges.map((badge) => ({
    ...badge,
    unlocked: earnedBadgeKeySet.has(badge.id),
  }));

  const completedDailyTaskCount = dailyTasks.filter(
    (task) => task.completed,
  ).length;

  const dashboardPopMessage = mainTaskApproved
    ? {
        text: "Ana görevin onaylandı! Yeni dünyaya geçmek için kalan hedeflerini tamamla.",
        image: "/images/pop-icon/kutlayan-icon.png",
      }
    : dailyTasks.length > 0 && completedDailyTaskCount === dailyTasks.length
      ? {
          text: "Bugünkü tüm görevlerini tamamladın. Harika bir rutin kuruyorsun!",
          image: "/images/pop-icon/sevinen-icon.png",
        }
      : completedDailyTaskCount > 0
        ? {
            text: `Bugün ${completedDailyTaskCount} görev tamamladın. Bir küçük adım daha atabilirsin!`,
            image: "/images/pop-icon/onaylayan-icon.png",
          }
        : {
            text: "Bugün küçük bir görev tamamlayarak yolculuğuna devam et.",
            image: "/images/pop-icon/dans-eden-icon.png",
          };

  return (
    <main className="app-page">
      <div className="mx-auto grid w-full max-w-7xl gap-6">
        <JourneySummaryCard
          avatar={avatarImage}
          goalTitle={goalTitle}
          goalDescription={goalDescription}
          currentLevel={currentLevel}
          levelNumber={levelNumber}
          currentXp={currentXp}
          xpGoal={xpGoal}
          mainTaskTitle={mainTaskTitle}
          mainTaskStatus={mainTaskStatus}
          mainTaskApproved={mainTaskApproved}
          completedMainSteps={completedMainSteps}
          totalMainSteps={totalMainSteps}
          onGoToAcademy={() => router.push("/akademi")}
        />

        {taskError && (
          <p
            role="alert"
            className="rounded-button border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            {taskError}
          </p>
        )}

        <div className="grid w-full gap-6 lg:grid-cols-2">
          <TaskListCard
            title="Günlük Görevler"
            tasks={dailyTasks}
            onToggleTask={handleCompleteTask}
            actionLabel="Tüm Görevleri Gör"
            onAction={handleTasksAction}
          />

          <TaskListCard
            title="Haftalık Görevler"
            tasks={weeklyTasks}
            onToggleTask={handleCompleteTask}
            actionLabel="Tüm Görevleri Gör"
            onAction={handleTasksAction}
          />
        </div>

        <div className="grid w-full items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <BadgesCard badges={userBadges} type="wide" />

          <MotivationCard
            text={dashboardPopMessage.text}
            image={dashboardPopMessage.image}
            actionLabel="POP ile konuş"
            onAction={handleMotivationAction}
            width="sm"
          />
        </div>
      </div>

      <PopChatModal
        open={isPopChatOpen}
        mode={popChatMode}
        onClose={() => setIsPopChatOpen(false)}
      />
    </main>
  );
}
