import verifiedBadge from "@/assets/verified-badge.png";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

export const VerifiedBadge = ({ size = "sm", className }: VerifiedBadgeProps) => {
  return (
    <img 
      src={verifiedBadge} 
      alt="Verificado" 
      className={cn(sizeClasses[size], className)}
      title="Administrador verificado"
    />
  );
};
