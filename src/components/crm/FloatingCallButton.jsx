import { Phone } from "lucide-react";
import { useActiveCall } from "@/components/context/ActiveCallContext";
import { getTelHref, hasCallablePhone } from "@/lib/phone";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export default function FloatingCallButton() {
  const { callTarget } = useActiveCall();
  const isMobile = useIsMobile();

  if (!isMobile || !callTarget?.phone || !hasCallablePhone(callTarget.phone)) {
    return null;
  }

  const href = getTelHref(callTarget.phone);
  const label = callTarget.label ? `Llamar a ${callTarget.label}` : "Llamar";

  return (
    <a
      href={href}
      title={label}
      aria-label={label}
      className={cn(
        "fixed z-50 flex items-center justify-center",
        "bottom-6 right-6 sm:bottom-6 sm:right-6",
        "w-14 h-14 min-w-[56px] min-h-[56px] rounded-full",
        "bg-blue-600 hover:bg-blue-700 text-white shadow-lg",
        "transition-transform active:scale-95",
        "safe-area-inset-bottom"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <Phone className="w-6 h-6" />
    </a>
  );
}
