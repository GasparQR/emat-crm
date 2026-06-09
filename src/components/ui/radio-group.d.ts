import type * as React from "react";
import type * as RadioGroupPrimitive from "@radix-ui/react-radio-group";

export const RadioGroup: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> &
    React.RefAttributes<React.ElementRef<typeof RadioGroupPrimitive.Root>>
>;
export const RadioGroupItem: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> &
    React.RefAttributes<React.ElementRef<typeof RadioGroupPrimitive.Item>>
>;
