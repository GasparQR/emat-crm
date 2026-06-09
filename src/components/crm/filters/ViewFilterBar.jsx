import { cn } from "@/lib/utils";

/**
 * Flex wrapper for list view filters; children should be conditionally rendered per admin config.
 * @param {{ children: import('react').ReactNode, className?: string }} props
 */
export default function ViewFilterBar({ children, className }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {children}
    </div>
  );
}
