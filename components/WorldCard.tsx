import Image from "next/image";
import ProgressCircle from "./ProgressCircle";
import BodyText from "./BodyText";

type WorldStatus = "current" | "unlocked" | "locked";
type WorldType = "orman" | "koy" | "okyanus" | "volkan" | "krallik";

type WorldCardProps = {
  level: number;
  name: string;
  image: string;
  status?: WorldStatus;
  type: WorldType;
  currentXp?: number;
  xpGoal?: number;
  quizScore?: number;
  quizPassScore?: number;
  mainTaskApproved?: boolean;
  description?: string;
};

export default function WorldCard({
  level,
  name,
  description,
  image,
  status,
  type,
  currentXp = 0,
  xpGoal = 0,
  quizScore = 0,
  quizPassScore = 0,
  mainTaskApproved = false,
}: WorldCardProps) {
  const isCurrent = status === "current";
  const isLocked = status === "locked";

  const cardStyle =
    type === "orman"
      ? "border-card bg-green text-dark-green"
      : type === "koy"
        ? "border-card bg-brown text-dark-brown"
        : type === "okyanus"
          ? "border-card bg-blue text-dark-blue"
          : type === "volkan"
            ? "border-card bg-red text-dark-red"
            : "border-card bg-purple text-dark-purple";

  return (
    <article className={`rounded-card border p-3 shadow-card ${cardStyle}`}>
      <div className="min-w-0 shrink-0 p-1">
        {isCurrent && (
          <BodyText
            size="xs"
            tone="accent"
            weight="extrabold"
            className="uppercase"
          >
            Şu an buradasın
          </BodyText>
        )}
      </div>

      <div className="mt-1 flex items-center gap-2">
        <div className="relative h-auto w-28 shrink-0 overflow-hidden rounded-md bg-dark-brown">
          <Image
            src={image}
            alt={`${name} dünyası`}
            width={160}
            height={103}
            className={`h-full w-full object-cover ${
              isLocked ? "grayscale opacity-50" : ""
            }`}
          />

          {isLocked && (
            <div className="absolute inset-0 grid place-items-center bg-black/10">
              <Image
                src="/images/icons/kilitli.png"
                alt=""
                width={30}
                height={30}
              />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 m-auto">
          <BodyText size="xs" tone="default" weight="bold">
            SEVİYE {level}
          </BodyText>

          <div className="mt-1 flex gap-3">
            <h3 className="mt-auto min-w-30 font-heading text-xl font-bold uppercase tracking-wide">
              {name}
            </h3>



            {status === "unlocked" && (
              <Image
                src="/images/icons/tamamlandi.png"
                alt=""
                width={30}
                height={30}
                className="mt-auto"
              />
            )}
          </div>            
          {description && (
              <BodyText size="xs" tone="muted" weight="semibold" className="mt-1">
                {description}
              </BodyText>
            )}

          {isLocked && (
            <BodyText size="xs" tone="muted" weight="bold" className="mt-1">
              Seviye {level}’de açılır
            </BodyText>
          )}
        </div>

        {isCurrent && (
          <div className="shrink-0">
            <ProgressCircle
              currentXp={currentXp}
              xpGoal={xpGoal}
              size={65}
              strokeWidth={7}
            />
          </div>
        )}
      </div>

      {isCurrent && (
        <div className="mt-3 rounded-card border border-card bg-white p-3">
          <BodyText
            size="xs"
            tone="default"
            weight="bold"
            className="uppercase"
          >
            Seviye geçişi
          </BodyText>

          <BodyText size="xs" tone="default" weight="normal" className="mt-2">
            XP: {currentXp} / {xpGoal}
          </BodyText>

          <BodyText size="xs" tone="default" weight="normal" className="mt-1">
            Ana Görev: {mainTaskApproved ? "Tamamlandı" : "Bekliyor"}
          </BodyText>

          <BodyText size="xs" tone="default" weight="normal" className="mt-1">
            Quiz Skoru: %{quizScore} · Gerekli: %{quizPassScore}
          </BodyText>

          <BodyText size="xs" tone="default" weight="normal" className="mt-1">
            POP Onayı: {mainTaskApproved ? "Onaylandı" : "Henüz onaylanmadı"}
          </BodyText>
        </div>
      )}
    </article>
  );
}
