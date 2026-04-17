import { forwardRef } from "react";
import adminBadge from "@/assets/admin-badge-gold.png";
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

const glowSizeClasses = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
};

export const VerifiedBadge = forwardRef<HTMLDivElement, VerifiedBadgeProps>(
  function VerifiedBadge({ size = "sm", className }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center flex-shrink-0",
          sizeClasses[size],
          className
        )}
        title="Administrador verificado"
      >
        {/* Animated gold glow behind the badge */}
        <span
          aria-hidden
          className={cn(
            "absolute rounded-full pointer-events-none animate-admin-glow",
            glowSizeClasses[size]
          )}
          style={{
            background:
              "radial-gradient(circle, rgba(255,215,0,0.85) 0%, rgba(255,180,0,0.45) 40%, rgba(255,180,0,0) 70%)",
            filter: "blur(4px)",
          }}
        />
        <span
          aria-hidden
          className={cn(
            "absolute rounded-full pointer-events-none animate-admin-spin",
            glowSizeClasses[size]
          )}
          style={{
            background:
              "conic-gradient(from 0deg, rgba(255,215,0,0) 0%, rgba(255,235,120,0.9) 25%, rgba(255,215,0,0) 50%, rgba(255,235,120,0.9) 75%, rgba(255,215,0,0) 100%)",
            filter: "blur(3px)",
            opacity: 0.7,
          }}
        />
        <img
          src={adminBadge}
          alt="Administrador"
          className={cn(sizeClasses[size], "relative z-10 drop-shadow-[0_0_4px_rgba(255,200,0,0.8)]")}
        />
      </div>
    );
  }
);
