import type { ReactNode } from "react";

type BodyTextProps = {
  children: ReactNode;
  as?: "p" | "span";
  size?: "xs" | "sm" | "base" | "lg";
  tone?: "default" | "muted" | "accent" | "inverse";
  weight?: "normal" | "semibold" | "bold" | "extrabold";
  className?: string;
};

const sizeStyles = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
};

const toneStyles = {
  default: "text-black",
  muted: "text-grey",
  accent: "text-main-purple",
  inverse: "text-white",
};

const weightStyles = {
  normal: "font-normal",
  semibold: "font-semibold",
  bold: "font-bold",
  extrabold: "font-extrabold",
};

export default function BodyText({
  children,
  as = "p",
  size = "base",
  tone = "default",
  weight = "normal",
  className = "",
}: BodyTextProps) {
  const Element = as;

  return (
    <Element
      className={`font-body ${sizeStyles[size]} ${toneStyles[tone]} ${weightStyles[weight]} ${className}`}
    >
      {children}
    </Element>
  );
}
