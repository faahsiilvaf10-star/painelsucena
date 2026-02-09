import React from "react";

export interface AnimatedEmojiDef {
  id: string;
  label: string;
  emoji: string;
  category: string;
}

export const ANIMATED_EMOJIS: AnimatedEmojiDef[] = [
  // Clima
  { id: "rain", label: "Chuva", emoji: "🌧️", category: "Clima" },
  { id: "thunder", label: "Tempestade", emoji: "⛈️", category: "Clima" },
  { id: "snow", label: "Neve", emoji: "❄️", category: "Clima" },
  { id: "sun", label: "Sol", emoji: "☀️", category: "Clima" },
  { id: "rainbow", label: "Arco-íris", emoji: "🌈", category: "Clima" },
  { id: "tornado", label: "Tornado", emoji: "🌪️", category: "Clima" },
  // Fogo & Energia
  { id: "fire", label: "Fogo", emoji: "🔥", category: "Energia" },
  { id: "lightning", label: "Raio", emoji: "⚡", category: "Energia" },
  { id: "explosion", label: "Explosão", emoji: "💥", category: "Energia" },
  { id: "comet", label: "Cometa", emoji: "☄️", category: "Energia" },
  // Sentimentos
  { id: "hearts", label: "Corações", emoji: "💖", category: "Sentimentos" },
  { id: "sparkles", label: "Brilhos", emoji: "✨", category: "Sentimentos" },
  { id: "party", label: "Festa", emoji: "🎉", category: "Sentimentos" },
  { id: "clap", label: "Palmas", emoji: "👏", category: "Sentimentos" },
  { id: "rocket", label: "Foguete", emoji: "🚀", category: "Sentimentos" },
  { id: "100", label: "100", emoji: "💯", category: "Sentimentos" },
  // Natureza
  { id: "leaf", label: "Folha", emoji: "🍃", category: "Natureza" },
  { id: "wave", label: "Onda", emoji: "🌊", category: "Natureza" },
  { id: "star", label: "Estrela", emoji: "⭐", category: "Natureza" },
  { id: "flower", label: "Flor", emoji: "🌸", category: "Natureza" },
];

const ANIMATION_MAP: Record<string, React.CSSProperties> = {
  rain: {
    animation: "ae-rain 1.2s ease-in infinite",
    display: "inline-block",
  },
  thunder: {
    animation: "ae-thunder 2s ease-in-out infinite",
    display: "inline-block",
  },
  snow: {
    animation: "ae-snow 3s linear infinite",
    display: "inline-block",
  },
  sun: {
    animation: "ae-spin-slow 4s linear infinite",
    display: "inline-block",
  },
  rainbow: {
    animation: "ae-wobble 2s ease-in-out infinite",
    display: "inline-block",
  },
  tornado: {
    animation: "ae-spin-fast 1s linear infinite",
    display: "inline-block",
  },
  fire: {
    animation: "ae-fire 0.6s ease-in-out infinite alternate",
    display: "inline-block",
  },
  lightning: {
    animation: "ae-flash 1.5s ease-in-out infinite",
    display: "inline-block",
  },
  explosion: {
    animation: "ae-pulse-big 0.8s ease-in-out infinite",
    display: "inline-block",
  },
  comet: {
    animation: "ae-comet 2s ease-in-out infinite",
    display: "inline-block",
  },
  hearts: {
    animation: "ae-heartbeat 1s ease-in-out infinite",
    display: "inline-block",
  },
  sparkles: {
    animation: "ae-twinkle 1.5s ease-in-out infinite",
    display: "inline-block",
  },
  party: {
    animation: "ae-bounce 0.6s ease-in-out infinite",
    display: "inline-block",
  },
  clap: {
    animation: "ae-clap 0.8s ease-in-out infinite",
    display: "inline-block",
  },
  rocket: {
    animation: "ae-rocket 1.5s ease-in-out infinite",
    display: "inline-block",
  },
  "100": {
    animation: "ae-pulse-big 1s ease-in-out infinite",
    display: "inline-block",
  },
  leaf: {
    animation: "ae-leaf 3s ease-in-out infinite",
    display: "inline-block",
  },
  wave: {
    animation: "ae-wobble 1.5s ease-in-out infinite",
    display: "inline-block",
  },
  star: {
    animation: "ae-twinkle 2s ease-in-out infinite",
    display: "inline-block",
  },
  flower: {
    animation: "ae-bloom 2s ease-in-out infinite",
    display: "inline-block",
  },
};

export function AnimatedEmoji({ id, size = "1.25em" }: { id: string; size?: string }) {
  const def = ANIMATED_EMOJIS.find((e) => e.id === id);
  if (!def) return <span>{`:${id}:`}</span>;

  const style: React.CSSProperties = {
    ...(ANIMATION_MAP[id] || {}),
    fontSize: size,
    lineHeight: 1,
    verticalAlign: "middle",
  };

  return (
    <span className="animated-emoji" style={style} title={def.label} role="img" aria-label={def.label}>
      {def.emoji}
    </span>
  );
}
