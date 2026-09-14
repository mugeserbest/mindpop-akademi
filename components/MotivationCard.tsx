import Image from "next/image";
import Button from "./button";
import BodyText from "./BodyText";
import SectionTitle from "./SectionTitle";

type MotivationCardProps = {
  title?: string;
  text: string;
  image: string;
  actionLabel?: string;
  onAction?: () => void;
  width?: "xs" | "sm" | "md";
};

export default function MotivationCard({
  title,
  text,
  image,
  actionLabel,
  onAction,
  width = "md",
}: MotivationCardProps) {
  const widthStyles =
    width === "xs" ? "max-w-xs" : width === "sm" ? "max-w-sm" : "max-w-md";
  return (
    <article className={`app-card-soft ${widthStyles}`}>
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          {title && <SectionTitle as="h3" title={title} />}

          <BodyText
            size="sm"
            tone="default"
            weight="semibold"
            className="mt-2 leading-relaxed "
          >
            {text}
          </BodyText>
        </div>

        <Image
          src={image}
          alt=""
          width={112}
          height={92}
          unoptimized
          className="h-auto w-28 shrink-0 object-contain"
        />
      </div>

      {actionLabel && onAction && (
        <div className="mt-1 ">
          <Button variant="gold" onClick={onAction} className="px-4 text-xs">
            {actionLabel}
          </Button>
        </div>
      )}
    </article>
  );
}
