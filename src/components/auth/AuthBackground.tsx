export function AuthBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Gradient background matching the reference image */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            135deg,
            hsl(210, 50%, 20%) 0%,
            hsl(240, 40%, 25%) 20%,
            hsl(270, 35%, 30%) 40%,
            hsl(300, 30%, 35%) 55%,
            hsl(330, 40%, 40%) 70%,
            hsl(35, 50%, 45%) 85%,
            hsl(40, 60%, 55%) 100%
          )`
        }}
      />

      {/* Subtle overlay for depth */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(
            ellipse at 30% 20%,
            rgba(100, 150, 200, 0.15) 0%,
            transparent 50%
          )`
        }}
      />

      {/* Light ray effect from top-left */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: `linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.1) 0%,
            transparent 40%
          )`
        }}
      />
    </div>
  );
}
