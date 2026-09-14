"use client";

import Image from "next/image";
import Button from "./button";
import SectionTitle from "./SectionTitle";
import BodyText from "./BodyText";

type MainTaskStep = {
  id: string;
  label: string;
  description?: string;
  completed: boolean;
};

type MainTaskCardProps = {
  title: string;
  description: string;
  steps: MainTaskStep[];
  onToggleStep: (stepId: string) => void;
  completed: boolean;
  onComplete: () => void;
  image?: string;
  category?: string;
  reviewStatus: "pending" | "approved" | "rejected" | null;
  reviewScore: number | null;
  reviewFeedback: string | null;
};

export default function MainTaskCard({
  title,
  description,
  steps,
  completed,
  onComplete,
  onToggleStep,
  image = "/images/pop-icon/heyecanli-icon.png",
  category = "Seviye Atlama Görevi",
  reviewStatus,
  reviewScore,
  reviewFeedback,
}: MainTaskCardProps) {
  const allStepsCompleted =
    steps.length > 0 && steps.every((step) => step.completed);

  const reviewPending = reviewStatus === "pending";
  const reviewApproved = reviewStatus === "approved";
  const reviewRejected = reviewStatus === "rejected";

  return (
    <article className="app-card app-card-feature relative flex min-h-[36rem] w-full overflow-hidden sm:min-h-[38rem]">
      <div className="relative z-10 my-4 flex flex-1 flex-col">
        <BodyText
          as="p"
          size="xs"
          tone="muted"
          weight="bold"
          className="mb-2 uppercase tracking-wide"
        >
          {category}
        </BodyText>
        <SectionTitle title={title} />
        <BodyText
          as="p"
          size="base"
          tone="muted"
          weight="semibold"
          className="mt-2"
        >
          {description}
        </BodyText>

        <ol className={`mt-5 space-y-3 ${allStepsCompleted ? "" : "sm:pr-52"}`}>
          {steps.map((step, index) => {
            const hasIncompletePreviousStep = steps
              .slice(0, index)
              .some((previousStep) => !previousStep.completed);
            const hasCompletedNextStep = steps
              .slice(index + 1)
              .some((nextStep) => nextStep.completed);
            const isLocked =
              (!step.completed && hasIncompletePreviousStep) ||
              (step.completed && hasCompletedNextStep);
            const lockMessage = hasIncompletePreviousStep
              ? "Önce önceki ana görev adımını tamamlamalısın."
              : "Bu adımı geri almadan önce sonraki ana görev adımını geri almalısın.";

            return (
              <li key={step.id} className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => onToggleStep(step.id)}
                  aria-pressed={step.completed}
                  aria-label={isLocked ? lockMessage : undefined}
                  title={isLocked ? lockMessage : undefined}
                  disabled={isLocked}
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-bold transition ${
                    isLocked && !step.completed
                      ? "cursor-not-allowed bg-grey text-white opacity-60"
                      : ""
                  } ${
                    step.completed
                      ? "bg-light-green text-black"
                      : "bg-main-purple text-white"
                  }`}
                >
                  {step.completed ? (
                    "✓"
                  ) : isLocked ? (
                    <Image
                      src="/images/icons/kilitli.png"
                      alt=""
                      width={18}
                      height={20}
                      unoptimized
                      className="h-5 w-auto object-contain"
                    />
                  ) : (
                    index + 1
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <BodyText
                    as="p"
                    size="base"
                    tone="default"
                    weight="semibold"
                    className={step.completed ? "text-grey line-through" : ""}
                  >
                    {step.label}
                  </BodyText>

                  {step.description && (
                    <BodyText
                      as="p"
                      size="xs"
                      tone="muted"
                      weight="normal"
                      className={`mt-1 leading-relaxed ${
                        step.completed ? "text-grey" : ""
                      }`}
                    >
                      {step.description}
                    </BodyText>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {allStepsCompleted && (
          <div className="mt-6 sm:pr-52">
            <Button
              variant="gold"
              onClick={onComplete}
              disabled={completed || reviewPending || reviewApproved}
            >
              {completed
                ? "Tamamlandı!"
                : reviewPending
                  ? "POP İnceliyor..."
                  : reviewApproved
                    ? "POP Onayladı!"
                    : reviewRejected
                      ? "Düzenleyip Tekrar Gönder"
                      : "POP’a Gönder"}
            </Button>

            {reviewPending && (
              <BodyText className="mt-3 text-sm text-muted">
                Çalışman POP’a gönderildi. İnceleme sonucu burada görünecek.
              </BodyText>
            )}

            {reviewApproved && (
              <div className="mt-3 rounded-button border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 md:mr-44">
                POP çalışmanı onayladı
                {reviewScore !== null ? ` · Puan: ${reviewScore}/100` : ""}.
                {reviewFeedback ? ` ${reviewFeedback}` : ""}
              </div>
            )}

            {reviewRejected && (
              <div className="mt-3 rounded-button border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 md:mr-44">
                POP çalışmanda düzenleme istedi.
                {reviewScore !== null && (
                  <span className="block">Puan: {reviewScore}/100</span>
                )}
                {reviewFeedback && (
                  <span className="block mt-1">{reviewFeedback}</span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-auto flex justify-end pt-6 sm:hidden">
          <Image
            src={image}
            alt=""
            width={180}
            height={160}
            unoptimized
            className="h-auto w-28 object-contain"
          />
        </div>
      </div>

      <Image
        src={image}
        alt=""
        width={180}
        height={160}
        unoptimized
        className="pointer-events-none absolute right-4 bottom-4 z-20 hidden h-auto w-44 object-contain sm:block sm: w-90"
      />
    </article>
  );
}
