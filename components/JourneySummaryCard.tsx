"use client";

import Image from "next/image";
import MotivationCard from "./MotivationCard";
import ProgressCircle from "./ProgressCircle";
import SectionTitle from "./SectionTitle";
import BodyText from "./BodyText";

type JourneySummaryCardProps = {
  avatar: string;
  goalTitle: string;
  goalDescription: string;
  currentLevel: string;
  levelNumber: number;
  currentXp: number;
  xpGoal: number;
  mainTaskTitle: string;
  completedMainSteps: number;
  mainTaskStatus: string;
  totalMainSteps: number;
  onGoToAcademy: () => void;
  mainTaskApproved: boolean;
};

export default function JourneySummaryCard({
  avatar,
  goalTitle,
  goalDescription,
  currentLevel,
  levelNumber,
  currentXp,
  xpGoal,
  mainTaskTitle,
  completedMainSteps,
  totalMainSteps,
  mainTaskStatus,
  mainTaskApproved,
  onGoToAcademy,
}: JourneySummaryCardProps) {
  const progressPercent =
    xpGoal > 0 ? Math.min(100, Math.round((currentXp / xpGoal) * 100)) : 0;

  const popMessage = mainTaskApproved
    ? {
        text: "Ana görevin POP tarafından onaylandı! Quiz hedefini de tamamlayınca yeni dünyaya geçebilirsin.",
        image: "/images/pop-icon/kutlayan-icon.png",
      }
    : currentXp >= xpGoal
      ? {
          text: "XP hedefini tamamladın! Şimdi ana görevini POP'a gönder ve quiz hedefini tamamla.",
          image: "/images/pop-icon/onaylayan-icon.png",
        }
      : progressPercent >= 50
        ? {
            text: `Harika gidiyorsun! ${currentLevel} dünyasındaki XP hedefinin yarısını geçtin.`,
            image: "/images/pop-icon/sevinen-icon.png",
          }
        : {
            text: `Bugün küçük bir adım atarak ${currentLevel} dünyasında ilerlemeye devam edebilirsin.`,
            image: "/images/pop-icon/dans-eden-icon.png",
          };

  return (
    <section className="app-card app-card-feature w-full overflow-hidden">
      <SectionTitle title="Yolculuk Özeti" />

      <div className="mt-6 grid lg:grid-cols-[32rem_minmax(0,1fr)] lg:items-center">
        <div className="flex items-center gap-7 p-3">
          <div className="flex justify-center">
            <Image
              src={avatar}
              alt="Kullanıcı avatarı"
              width={96}
              height={96}
              className="h-24 w-24 object-contain"
            />
          </div>

          <div>
            <BodyText size="lg" tone="accent" weight="bold">
              {goalTitle}
            </BodyText>

            <SectionTitle as="h3" title="Hedef" className="mt-4" />

            <BodyText size="base" tone="muted" weight="normal" className="mt-1">
              {goalDescription}
            </BodyText>
          </div>
        </div>

        <div className="flex items-center p-3 justify-between">
          <div>
            <SectionTitle as="h3" title="Mevcut seviye" />

            <BodyText size="lg" tone="accent" weight="bold" className="mt-1">
              {currentLevel}
            </BodyText>
            <BodyText size="xs" tone="muted" weight="normal" className="mt-4">
              Seviye {levelNumber}
            </BodyText>
            <BodyText size="xs" tone="muted" weight="normal" className="mt-1">
              {currentXp} / {xpGoal} XP
            </BodyText>
          </div>

          <ProgressCircle
            currentXp={currentXp}
            xpGoal={xpGoal}
            size={130}
            strokeWidth={15}
          />
        </div>
      </div>

      <div className="mt-6 grid  lg:grid-cols-[32rem_minmax(0,1fr)]">
        <MotivationCard
          title="Pop'tan bir mesaj"
          text={popMessage.text}
          image={popMessage.image}
          actionLabel="Akademiye Git"
          onAction={onGoToAcademy}
          width="md"
        />
        <div className=" p-5">
          <SectionTitle
            as="h3"
            title="Seviye Atlama Görevi"
            action={
              <BodyText as="span" size="xs" tone="muted" weight="normal">
                {completedMainSteps} / {totalMainSteps} tamamlandı
              </BodyText>
            }
          />

          <BodyText size="lg" tone="accent" weight="semibold" className="mt-4">
            {mainTaskTitle}
          </BodyText>
          <div className="mt-6 rounded-button bg-cream px-4 py-3">
            <BodyText as="p" size="xs" tone="muted" weight="bold">
              Şu anki aşama
            </BodyText>

            <BodyText
              as="p"
              size="base"
              tone="accent"
              weight="bold"
              className="mt-1"
            >
              {mainTaskStatus}
            </BodyText>
          </div>
        </div>
      </div>
    </section>
  );
}
