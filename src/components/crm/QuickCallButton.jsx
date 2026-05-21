import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTelHref, hasCallablePhone } from "@/lib/phone";

export default function QuickCallButton({
  phone,
  className,
  onClick,
  title = "Llamar",
}) {
  if (!hasCallablePhone(phone)) return null;

  const href = getTelHref(phone);

  return (
    <a
      href={href}
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-md",
        "bg-blue-600 hover:bg-blue-700 text-white",
        "h-7 w-7 min-h-[44px] min-w-[44px] sm:min-h-7 sm:min-w-7 flex-shrink-0",
        className
      )}
    >
      <Phone className="w-3.5 h-3.5" />
    </a>
  );
}
