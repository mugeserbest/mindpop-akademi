import BadgesCard from "../BadgesCard";
import JourneyOverviewCard from "../JourneyOverviewCard";
import JourneyStatsCard from "../JourneyStatsCard";
import MotivationCard from "../MotivationCard";
import { badges } from "../../data/Badges";
import ShareProgressCard from "../ShareProgressCard";

type JourneyClientProps = {
  goalDescription: string;
  currentLevel: string;
  levelNumber: number;
  currentXp: number;
  xpGoal: number;
  mainTaskTitle: string;
  completedMainSteps: number;
  totalMainSteps: number;
  worlds: JourneyWorld[];
  stats: {
    label: string;
    value: string;
  }[];
  earnedBadgeKeys: string[];
  popMessages: Record<string, string>;
};
export type JourneyWorld = {
  id: string;
  name: string;
  image: string;
  unlocked: boolean;
  current: boolean;
};

export default function JourneyClient({
  goalDescription,
  currentLevel,
  levelNumber,
  currentXp,
  xpGoal,
  mainTaskTitle,
  completedMainSteps,
  totalMainSteps,
  worlds,
  stats,
  earnedBadgeKeys,
  popMessages,
}: JourneyClientProps) {
  const earnedBadgeKeySet = new Set(earnedBadgeKeys);

  const userBadges = badges.map((badge) => ({
    ...badge,
    unlocked: earnedBadgeKeySet.has(badge.id),
  }));
  const progressPercent =
    xpGoal > 0 ? Math.min(100, Math.round((currentXp / xpGoal) * 100)) : 0;

  const popMessageKey =
    completedMainSteps >= totalMainSteps
      ? "main_task_approved"
      : currentXp >= xpGoal
        ? "xp_ready"
        : progressPercent >= 50
          ? "halfway"
          : "start";

  const savedPopMessage = popMessages[popMessageKey];

  const journeyPopMessage =
    typeof savedPopMessage === "string" && savedPopMessage.trim().length > 0
      ? savedPopMessage
      : "Bu dünyadaki görevlerini tamamladıkça hangi becerileri kazandığını burada göreceksin.";

  return (
    <main className="app-page">
      <div className="mx-auto grid w-full max-w-7xl gap-6">
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
          <JourneyOverviewCard
            goalTitle={goalDescription}
            currentLevel={currentLevel}
            levelNumber={levelNumber}
            currentXp={currentXp}
            xpGoal={xpGoal}
            mainTaskTitle={mainTaskTitle}
            completedSteps={completedMainSteps}
            totalSteps={totalMainSteps}
            worlds={worlds}
          />
          <div className=" grid gap-4 ">
            <JourneyStatsCard stats={stats} />

            <BadgesCard badges={userBadges} />

            <MotivationCard
              title="Ne kadar ilerledim?"
              text={journeyPopMessage}
              image="/images/pop-icon/sevinen-icon.png"
              width="md"
            />
          </div>
        </div>
        <ShareProgressCard
          title="İlerlemeni Paylaş"
          text="Çok iyi iş çıkardın! Başarını arkadaşlarınla paylaş."
          shareTitle="Mindpop Akademi’de öğrenme yolculuğum"
          shareText={`Mindpop Akademi’de “${goalDescription}” hedefim için ${levelNumber}. dünyada ilerliyorum. ${currentXp} / ${xpGoal} XP’ye ulaştım. Sen de öğrenme hedefini maceraya dönüştür!`}
        />
      </div>
    </main>
  );
}
