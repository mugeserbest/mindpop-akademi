type ProgressBarProps = {
  currentXp: number;
  xpGoal: number;
};

export default function ProgressBar({ currentXp, xpGoal }: ProgressBarProps) {
  const progress = xpGoal === 0 ? 0 : Math.min((currentXp / xpGoal) * 100, 100);

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between text-xs font-bold text-grey">
        <span>İlerleme</span>

        <span>
          {currentXp} / {xpGoal} XP
        </span>
      </div>

      <div
        className="h-3 overflow-hidden rounded-full bg-cream border-card"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={xpGoal}
        aria-valuenow={currentXp}
      >
        <div
          className="h-full rounded-full bg-light-green transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
