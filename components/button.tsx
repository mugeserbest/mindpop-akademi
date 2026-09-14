"use client";
import type { ReactNode } from "react";

type ButtonProps = {
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "gold";
  type?: "button" | "submit";
  className?: string;
};

export default function Button({
  children = "Yolculuğu Başlat",
  onClick,
  disabled = false,
  variant = "primary",
  type = "button",
  className = "",
}: ButtonProps) {
  const baseStyles =
    "inline-flex border-card items-center justify-center rounded-button px-5 py-3 font-bold transition focus:outline-none focus:ring-2 focus:ring-main-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  const variantStyles =
    variant === "primary"
      ? "border-card bg-main-purple text-white hover:bg-cream hover:text-main-purple"
      : variant === "gold"
        ? "bg-gold text-black hover:bg-brown"
        : "border-card bg-white text-main-purple hover:bg-cream";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles} ${className}`}
    >
      {children}
    </button>
  );
}
