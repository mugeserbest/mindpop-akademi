import BodyText from "./BodyText";
import SectionTitle from "./SectionTitle";

type JourneyStat = {
  label: string;
  value: string;
};

type JourneyStatsCardProps = {
  stats: JourneyStat[];
};

export default function JourneyStatsCard({ stats }: JourneyStatsCardProps) {
  return (
    <section className="app-card app-card-feature w-full">
      <SectionTitle as="h3" title="İstatistiklerim" />

      <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-8">
        {stats.map((stat) => (
          <div key={stat.label}>
            <BodyText size="sm" tone="default" weight="semibold">
              {stat.label}
            </BodyText>

            <BodyText size="lg" tone="accent" weight="bold" className="mt-2">
              {stat.value}
            </BodyText>
          </div>
        ))}
      </div>
    </section>
  );
}
