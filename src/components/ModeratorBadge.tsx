import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import moderatorIcon from "@/assets/moderator-badge.png";

interface ModeratorBadgeProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  xs: "w-4 h-4",
  sm: "w-5 h-5",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export const ModeratorBadge = forwardRef<HTMLSpanElement, ModeratorBadgeProps>(
  function ModeratorBadge({ size = "sm", className }, ref) {
    return (
      <span ref={ref} className={cn("inline-flex", className)}>
        <img
          src={moderatorIcon}
          alt="Moderador"
          className={cn(sizeClasses[size], "object-contain")}
        />
      </span>
    );
  }
);
