import type * as React from "react";

type DivRef = React.ForwardRefExoticComponent<
  React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>
>;

export const Card: DivRef;
export const CardHeader: DivRef;
export const CardFooter: DivRef;
export const CardTitle: DivRef;
export const CardDescription: DivRef;
export const CardContent: DivRef;
