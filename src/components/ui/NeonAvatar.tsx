import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NeonAvatarProps {
  src?: string | null;
  name: string;
  frameColor?: string | null;
  neonColor?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeConfig = {
  sm: {
    outer: 40,
    inner: 34,
    border: 3,
    glow: 8,
    text: "text-xs",
  },
  md: {
    outer: 56,
    inner: 48,
    border: 4,
    glow: 12,
    text: "text-sm",
  },
  lg: {
    outer: 112,
    inner: 100,
    border: 6,
    glow: 20,
    text: "text-xl",
  },
};

const getInitials = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const isGradient = (color: string) => color.startsWith("linear-gradient") || color.startsWith("conic-gradient");

export const NeonAvatar = ({
  src,
  name,
  frameColor,
  neonColor,
  size = "sm",
  className = "",
}: NeonAvatarProps) => {
  const config = sizeConfig[size];
  const hasFrame = !!frameColor;
  const hasNeon = !!neonColor;

  if (!hasFrame && !hasNeon) {
    return (
      <Avatar
        className={className}
        style={{ width: config.outer, height: config.outer }}
      >
        <AvatarImage src={src || undefined} alt={name} className="object-cover" />
        <AvatarFallback className={`bg-primary text-primary-foreground font-bold ${config.text}`}>
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
    );
  }

  const neonIsGradient = hasNeon && isGradient(neonColor!);
  // For neon glow, extract a representative color for box-shadow when it's a gradient
  const neonShadowColor = hasNeon
    ? neonIsGradient
      ? "rgba(255,255,255,0.5)"
      : neonColor!
    : "transparent";

  return (
    <div
      className={`relative flex items-center justify-center flex-shrink-0 ${className}`}
      style={{
        width: config.outer,
        height: config.outer,
      }}
    >
      {/* Neon glow aura */}
      {hasNeon && (
        <div
          className="absolute rounded-full animate-pulse"
          style={{
            inset: -config.glow / 2,
            background: isGradient(neonColor!) ? neonColor! : undefined,
            backgroundColor: !isGradient(neonColor!) ? neonColor! : undefined,
            opacity: 0.45,
            filter: `blur(${config.glow}px)`,
            animationDuration: "2s",
          }}
        />
      )}

      {/* Frame border — flush against the avatar */}
      {hasFrame && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: isGradient(frameColor!) ? frameColor! : frameColor!,
            boxShadow: hasNeon
              ? `0 0 ${config.glow / 2}px ${neonShadowColor}`
              : undefined,
          }}
        />
      )}

      {/* Avatar — flush against frame, no gap */}
      <Avatar
        className="relative z-10"
        style={{
          width: config.inner,
          height: config.inner,
        }}
      >
        <AvatarImage src={src || undefined} alt={name} className="object-cover" />
        <AvatarFallback className={`bg-primary text-primary-foreground font-bold ${config.text}`}>
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
    </div>
  );
};
