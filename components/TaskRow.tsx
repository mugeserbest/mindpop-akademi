"use client";
import BodyText from "./BodyText";

type TaskRowProps = {
  title: string;
  description?: string;
  xp: number;
  completed: boolean;
  onComplete: () => void;
};

export default function TaskRow({
  title,
  xp,
  completed,
  onComplete,
  description,
}: TaskRowProps) {
  return (
    <div className="flex items-center gap-1 py-1 px-2  ">
      <div className="flex min-w-0 flex-1 gap-2">
        <button
          type="button"
          onClick={onComplete}
          disabled={completed}
          aria-label={completed ? "Görev tamamlandı" : "Görevi tamamla"}
          aria-pressed={completed}
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full font-bold transition ${
            completed
              ? "bg-light-green text-black"
              : "bg-main-purple text-black hover:border-light-green hover:border-2 hover:text-white"
          }`}
        >
          {completed ? "✓" : ""}
        </button>
        <div className="min-w-0 flex-1">
          <BodyText
            as="p"
            size="base"
            tone={completed ? "muted" : "default"}
            weight="semibold"
            className={completed ? "line-through" : ""}
          >
            {title}
          </BodyText>

          {description && (
            <BodyText
              as="p"
              size="xs"
              tone="muted"
              weight="normal"
              className="mt-1 leading-relaxed"
            >
              {description}
            </BodyText>
          )}
        </div>
      </div>
      <span
        className={`shrink-0 rounded-full px-4 py-2 ${
          completed ? "bg-light-green" : "bg-main-purple "
        }`}
      >
        <BodyText
          as="span"
          size="xs"
          tone={completed ? "default" : "inverse"}
          weight="bold"
        >
          +{xp} XP
        </BodyText>
      </span>
    </div>
  );
}
