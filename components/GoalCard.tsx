import BodyText from "./BodyText";
import SectionTitle from "./SectionTitle";

type GoalCardProps = {
  description: string;
};

export default function GoalCard({ description }: GoalCardProps) {
  return (
    <article className="app-card-soft">
      <SectionTitle as="h3" title="Hedef" />

      <BodyText as="p" size="lg" tone="accent" weight="bold" className="mt-2">
        {description}
      </BodyText>
    </article>
  );
}
