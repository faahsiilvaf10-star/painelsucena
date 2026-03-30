import { useEffect, useState } from "react";

const EGGS = [
  { emoji: "🥚", color: "text-pink-300", delay: 0 },
  { emoji: "🐣", color: "text-yellow-300", delay: 1.2 },
  { emoji: "🥚", color: "text-blue-300", delay: 0.6 },
  { emoji: "🥚", color: "text-green-300", delay: 1.8 },
  { emoji: "🐰", color: "text-pink-200", delay: 0.3 },
  { emoji: "🌸", color: "text-pink-400", delay: 2.1 },
  { emoji: "🥚", color: "text-purple-300", delay: 0.9 },
  { emoji: "🌷", color: "text-red-300", delay: 1.5 },
];

const FloatingEgg = ({ emoji, delay, index }: { emoji: string; delay: number; index: number }) => {
  const positions = [5, 15, 25, 38, 52, 65, 78, 90];
  const left = positions[index % positions.length];

  return (
    <span
      className="fixed pointer-events-none select-none z-[1] opacity-0"
      style={{
        left: `${left}%`,
        top: "-30px",
        fontSize: "1.2rem",
        animation: `easterFloat 18s ease-in-out ${delay}s infinite`,
      }}
    >
      {emoji}
    </span>
  );
};

const CornerBunny = ({ position }: { position: "top-left" | "top-right" | "bottom-left" | "bottom-right" }) => {
  const posClasses = {
    "top-left": "top-12 left-2",
    "top-right": "top-12 right-2",
    "bottom-left": "bottom-16 left-2",
    "bottom-right": "bottom-16 right-2",
  };

  return (
    <span
      className={`fixed ${posClasses[position]} pointer-events-none select-none z-[1] opacity-40 dark:opacity-20`}
      style={{
        fontSize: "1.5rem",
        animation: "easterBounce 3s ease-in-out infinite",
      }}
    >
      🐰
    </span>
  );
};

export const EasterDecorations = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <>
      {/* Floating eggs/flowers falling gently */}
      {EGGS.map((egg, i) => (
        <FloatingEgg key={i} emoji={egg.emoji} delay={egg.delay} index={i} />
      ))}

      {/* Corner bunnies */}
      <CornerBunny position="bottom-left" />
      <CornerBunny position="bottom-right" />

      {/* Top Easter banner ribbon */}
      <div className="fixed top-0 left-0 right-0 z-[2] pointer-events-none flex justify-center">
        <div
          className="flex items-center gap-2 px-4 py-0.5 rounded-b-xl text-xs font-medium opacity-70"
          style={{
            background: "linear-gradient(135deg, hsl(340 55% 70% / 0.3), hsl(280 45% 65% / 0.3), hsl(160 35% 70% / 0.3))",
            backdropFilter: "blur(8px)",
          }}
        >
          <span>🐰</span>
          <span className="text-foreground/70">Feliz Páscoa!</span>
          <span>🥚</span>
        </div>
      </div>
    </>
  );
};
