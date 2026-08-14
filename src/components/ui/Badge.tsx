import type { HTMLAttributes } from "react";

type NbColor = "mustard" | "teal" | "pink" | "purple" | "green" | "red" | "white";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: NbColor;
}

export function Badge({ color = "white", className = "", ...props }: BadgeProps) {
  const cls = ["nb-badge", `nb-${color}`, className].filter(Boolean).join(" ");
  return <span className={cls} {...props} />;
}
