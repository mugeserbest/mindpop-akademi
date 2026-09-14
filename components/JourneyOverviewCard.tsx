import BodyText from "./BodyText";
import ProgressCircle from "./ProgressCircle";
import SectionTitle from "./SectionTitle";
import Image from "next/image";

type JourneyWorld = {
  id: string;
  name: string;
  image: string;
  unlocked: boolean;
  current?: boolean;
};

type JourneyOverviewCardProps = {
  goalTitle: string;
  currentLevel: string;
  levelNumber: number;
  currentXp: number;
  xpGoal: number;
  mainTaskTitle: string;
  completedSteps: number;
  totalSteps: number;
  worlds: JourneyWorld[];
};

export default function JourneyOverviewCard({
  goalTitle,
  currentLevel,
  levelNumber,
  currentXp,
  xpGoal,
  mainTaskTitle,
  completedSteps,
  totalSteps,
  worlds,
}: JourneyOverviewCardProps) {
  const taskProgress =
    totalSteps === 0 ? 0 : (completedSteps / totalSteps) * 100;

  return (
    <section className="app-card app-card-feature w-full">
      <div>
        <SectionTitle as="h3" title="Hedef" />

        <BodyText size="lg" tone="accent" weight="bold" className="mt-2">
          {goalTitle}
        </BodyText>
      </div>

      <div className="mt-8 flex items-center justify-between gap-6">
        <div>
          <SectionTitle as="h3" title="Mevcut seviye" />

          <BodyText size="lg" tone="accent" weight="bold" className="mt-2">
            {currentLevel}
          </BodyText>

          <BodyText size="sm" tone="muted" weight="semibold" className="mt-1">
            Seviye {levelNumber}
          </BodyText>
        </div>

        <div className="shrink-0 text-center">
          <ProgressCircle
            currentXp={currentXp}
            xpGoal={xpGoal}
            size={132}
            strokeWidth={15}
          />

          <BodyText size="xs" tone="accent" weight="semibold" className="mt-2">
            {currentXp} / {xpGoal} XP
          </BodyText>
        </div>
      </div>
      <div className="mt-8">
        <SectionTitle as="h3" title="Dünya Yolculuğum" />

        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {worlds.map((world) => (
            <div key={world.id} className="text-center">
              <div
                className={`overflow-hidden rounded-card border-card p-1 ${
                  world.current
                    ? "bg-light-green"
                    : world.unlocked
                      ? "bg-cream"
                      : "bg-beige opacity-60"
                }`}
              >
                <Image
                  src={world.image}
                  alt={`${world.name} dünyası`}
                  width={120}
                  height={90}
                  className={`h-auto w-full object-contain ${
                    world.unlocked ? "" : "grayscale"
                  }`}
                />
              </div>

              <BodyText
                as="p"
                size="xs"
                tone={world.current ? "accent" : "muted"}
                weight={world.current ? "bold" : "semibold"}
                className="mt-2"
              >
                {world.name}
              </BodyText>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-8">
        <SectionTitle
          as="h3"
          title="Seviye Atlama Görevi"
          action={
            <BodyText as="span" size="xs" tone="muted" weight="normal">
              {completedSteps} / {totalSteps} tamamlandı
            </BodyText>
          }
        />

        <BodyText size="base" tone="accent" weight="bold" className="mt-3">
          {mainTaskTitle}
        </BodyText>

        <div className="mt-4 h-4 overflow-hidden rounded-full bg-cream">
          <div
            className="h-full rounded-full bg-light-green transition-all"
            style={{ width: `${taskProgress}%` }}
          />
        </div>
      </div>
    </section>
  );
}
