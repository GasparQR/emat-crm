import type * as React from "react";

export const Badge: React.FC<
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "secondary" | "destructive" | "outline";
  }
>;
export const badgeVariants: (...args: unknown[]) => string;
