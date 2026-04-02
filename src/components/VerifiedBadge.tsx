import { forwardRef } from "react";
import adminBadge from "@/assets/admin-badge.png";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  xs: "w-4 h-4",
  sm: "w-5 h-5",
  md: "w-7 h-7",
  lg: "w-8 h-8",
};

export const VerifiedBadge = forwardRef<HTMLImageElement, VerifiedBadgeProps>(
  function VerifiedBadge({ size = "sm", className }, ref) {
    return (
      <img 
        ref={ref}
        src={adminBadge} 
        alt="Administrador" 
        className={cn(
          sizeClasses[size], 
          "animate-pulse-soft",
          className
        )}
        title="Administrador verificado"
      />
    );
  }
);
