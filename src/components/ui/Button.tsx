"use client";

import type { ButtonHTMLAttributes } from "react";

type NbColor =
  | "mustard"
  | "teal"
  | "pink"
  | "purple"
  | "green"
  | "red"
  | "white";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  color?: NbColor;
  size?: "md" | "lg";
}

export function Button({
  color = "white",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  const cls = [
    "nb-btn",
    `nb-${color}`,
    size === "lg" ? "nb-btn-lg" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <button className={cls} {...props} />;
}
