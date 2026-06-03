import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useAsesores } from "@/components/hooks/useAsesores";

const SIZE_CLASSES = {
  xs: "w-5 h-5 text-[9px]",
  sm: "w-7 h-7 text-[10px]",
  md: "w-9 h-9 text-xs",
};

/**
 * Avatar circular con iniciales del asesor y color del catálogo (o hash).
 */
export default function AsesorAvatar({
  codigo,
  size = "sm",
  className,
  title,
  style,
}) {
  const { data: currentUser } = useCurrentUser();
  const { getAsesorInitials, getAsesorNombre, getAsesorAvatarStyle } =
    useAsesores(currentUser);

  if (!codigo) return null;

  const resolvedTitle = title ?? getAsesorNombre(codigo) ?? codigo;

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold tracking-tight flex-shrink-0",
        SIZE_CLASSES[size] ?? SIZE_CLASSES.sm,
        className
      )}
      style={{ ...getAsesorAvatarStyle(codigo), ...style }}
      title={resolvedTitle}
    >
      {getAsesorInitials(codigo)}
    </div>
  );
}
