import BodyText from "./BodyText";

type ProgressCircleProps = {
  currentXp: number;
  xpGoal: number;
  size?: number;
  strokeWidth?: number;
};

export default function ProgressCircle({
  currentXp,
  xpGoal,
  size = 120,
  strokeWidth = 12,
}: ProgressCircleProps) {
  const progress =
    xpGoal === 0 ? 0 : Math.min((currentXp / xpGoal) * 100, 100);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div
      className="relative inline-grid place-items-center "
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={xpGoal}
      aria-valuenow={currentXp}
      aria-label="İlerleme durumu"
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-cream"
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-light-green transition-all duration-300"
        />
      </svg>

      <div className="absolute text-center">
        <BodyText size="base" weight="bold" tone="default" className="tracking-wide">
          %{Math.round(progress)}
        </BodyText>
      </div>
    </div>
  );
}