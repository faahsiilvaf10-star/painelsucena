import { forwardRef } from "react";
import { ShieldHalf } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModeratorBadgeProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

export const ModeratorBadge = forwardRef<SVGSVGElement, ModeratorBadgeProps>(
  function ModeratorBadge({ size = "sm", className }, ref) {
    return (
      <ShieldHalf
        ref={ref}
        className={cn(
          sizeClasses[size],
          "text-amber-500 animate-pulse-soft",
          className
        )}
        title="Moderador"
      />
    );
  }
);
