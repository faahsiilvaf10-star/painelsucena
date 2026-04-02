import { forwardRef } from "react";
import adminBadge from "@/assets/admin-badge.png";
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

export const VerifiedBadge = forwardRef<HTMLImageElement, VerifiedBadgeProps>(
  function VerifiedBadge({ size = "sm", className }, ref) {
    return (
      <img 
        ref={ref}
        src={adminCrown} 
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
