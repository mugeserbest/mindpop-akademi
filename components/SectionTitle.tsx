import type { ReactNode } from "react";
import BodyText from "./BodyText";

type SectionTitleProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  titleClassName?: string;
  uppercase?: boolean;
  stackOnMobile?: boolean;
  as?: "h2" | "h3";
};

export default function SectionTitle({
  title,
  description,
  action,
  className = "",
  titleClassName = "",
  uppercase = true,
  stackOnMobile = true,
  as = "h2",
}: SectionTitleProps) {
  const Heading = as;
  const headingStyles =
    as === "h3"
      ? `font-heading text-base font-bold tracking-wide text-grey ${
          uppercase ? "uppercase" : ""
        }`
      : `font-heading text-2xl leading-tight text-black font-semibold md:text-3xl ${
          uppercase ? "uppercase" : ""
        }`;
  return (
    <div
      className={`flex gap-2 ${
        stackOnMobile
          ? "flex-col sm:flex-row sm:items-end sm:justify-between"
          : "flex-row items-center justify-between"
      } ${className}`}
    >
      <div>
        <Heading className={`${headingStyles} ${titleClassName}`}>{title}</Heading>

        {description && (
          <BodyText
            as="p"
            size="sm"
            tone="muted"
            weight="semibold"
            className="mt-1"
          >
            {description}
          </BodyText>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
