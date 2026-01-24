export function AuthBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Main gradient matching the reference exactly */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            140deg,
            hsl(220, 60%, 12%) 0%,
            hsl(230, 50%, 18%) 15%,
            hsl(250, 45%, 25%) 30%,
            hsl(270, 40%, 32%) 45%,
            hsl(290, 35%, 38%) 55%,
            hsl(320, 35%, 42%) 65%,
            hsl(350, 40%, 48%) 75%,
            hsl(25, 50%, 52%) 85%,
            hsl(40, 55%, 58%) 95%,
            hsl(45, 60%, 62%) 100%
          )`
        }}
      />

      {/* Light ray effect from top-left corner */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            130deg,
            rgba(150, 180, 220, 0.12) 0%,
            rgba(150, 180, 220, 0.05) 20%,
            transparent 40%
          )`
        }}
      />

      {/* Subtle vignette for depth */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(
            ellipse at center,
            transparent 40%,
            rgba(0, 0, 0, 0.15) 100%
          )`
        }}
      />
    </div>
  );
}
