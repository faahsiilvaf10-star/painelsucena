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
    container: "w-10 h-10",
    avatar: "w-8 h-8",
    text: "text-xs",
    border: 2,
    glow: 6,
  },
  md: {
    container: "w-14 h-14",
    avatar: "w-11 h-11",
    text: "text-sm",
    border: 3,
    glow: 10,
  },
  lg: {
    container: "w-28 h-28",
    avatar: "w-24 h-24",
    text: "text-xl",
    border: 4,
    glow: 16,
  },
};

const getInitials = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

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
    // No customization — render plain avatar
    return (
      <Avatar className={`${config.container} ${className}`}>
        <AvatarImage src={src || undefined} alt={name} className="object-cover" />
        <AvatarFallback className="bg-primary text-primary-foreground font-bold">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <div
      className={`relative ${config.container} flex items-center justify-center flex-shrink-0 ${className}`}
      style={{
        ...(hasNeon && {
          filter: `drop-shadow(0 0 ${config.glow}px ${neonColor})`,
        }),
      }}
    >
      {/* Neon pulse glow */}
      {hasNeon && (
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            boxShadow: `0 0 ${config.glow}px ${config.glow / 2}px ${neonColor}, inset 0 0 ${config.glow / 2}px ${neonColor}`,
            animationDuration: "2s",
          }}
        />
      )}

      {/* Frame ring */}
      {hasFrame && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: `${config.border}px solid ${frameColor}`,
            ...(hasNeon && {
              boxShadow: `0 0 ${config.glow / 2}px ${neonColor}`,
            }),
          }}
        />
      )}

      {/* Avatar */}
      <Avatar className={`${config.avatar} relative z-10`}>
        <AvatarImage src={src || undefined} alt={name} className="object-cover" />
        <AvatarFallback className={`bg-primary text-primary-foreground font-bold ${config.text}`}>
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
    </div>
  );
};
