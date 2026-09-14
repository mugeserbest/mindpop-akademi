import BodyText from "./BodyText";
import Button from "./button";
import SectionTitle from "./SectionTitle";

type QuizCardProps = {
  title: string;
  description: string;
  questionCount: number;
  onStart?: () => void;
};

export default function QuizCard({
  title,
  description,
  questionCount,
  onStart,
}: QuizCardProps) {
  return (
    <article className="app-card-soft">
      <SectionTitle
        as="h3"
        title="Quiz"
        stackOnMobile={false}
        action={
          <BodyText
            as="span"
            size="base"
            tone="muted"
            weight="semibold"
            className="whitespace-nowrap"
          >
            {questionCount} soru
          </BodyText>
        }
      />

      <BodyText as="p" size="lg" tone="accent" weight="bold" className="mt-4 uppercase">
        {title}
      </BodyText>

      <BodyText
        as="p"
        size="base"
        tone="default"
        weight="normal"
        className="mt-2"
      >
        {description}
      </BodyText>

      <div className=" flex items-center justify-between gap-4">

        <Button
          variant="secondary"
          onClick={onStart}
          className="px-4 py-2 text-sm mt-2"
        >
          Quiz’i Başlat
        </Button>
      </div>
    </article>
  );
}
