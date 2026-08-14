import type { HTMLAttributes } from "react";

type NbColor =
  | "white"
  | "mustard"
  | "teal"
  | "pink"
  | "purple"
  | "green"
  | "red";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  color?: NbColor;
}

export function Card({ color = "white", className = "", ...props }: CardProps) {
  const cls = ["nb-card", `nb-${color}`, className].filter(Boolean).join(" ");
  return <div className={cls} {...props} />;
}
