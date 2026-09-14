import ProgressBar from "./ProgressBar";
import SectionTitle from "./SectionTitle";

type ProgressCardProps = {
  currentXp: number;
  xpGoal: number;
};

export default function ProgressCard({
  currentXp,
  xpGoal,
}: ProgressCardProps) {
  return (
    <article className="app-card-soft">
      <SectionTitle as="h3" title="İlerleme" />

      <ProgressBar currentXp={currentXp} xpGoal={xpGoal} />
    </article>
  );
}
