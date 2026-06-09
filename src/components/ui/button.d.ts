import type * as React from "react";

export const Button: React.ForwardRefExoticComponent<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
    asChild?: boolean;
  } & React.RefAttributes<HTMLButtonElement>
>;
export const buttonVariants: (...args: unknown[]) => string;
