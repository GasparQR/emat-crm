import type * as React from "react";
import type * as TabsPrimitive from "@radix-ui/react-tabs";

export const Tabs: typeof TabsPrimitive.Root;
export const TabsList: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> &
    React.RefAttributes<React.ElementRef<typeof TabsPrimitive.List>>
>;
export const TabsTrigger: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> &
    React.RefAttributes<React.ElementRef<typeof TabsPrimitive.Trigger>>
>;
export const TabsContent: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> &
    React.RefAttributes<React.ElementRef<typeof TabsPrimitive.Content>>
>;
