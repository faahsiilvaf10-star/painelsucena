export function AuthBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Dark background base */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />

      {/* Overlay gradient for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-black/80" />

      {/* Animated grid overlay (CAD style) */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(245, 165, 36, 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(245, 165, 36, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          animation: "gridMove 20s linear infinite",
        }}
      />

      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-primary/40 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${5 + Math.random() * 5}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Corner accent lines (engineering style) */}
      <div className="absolute top-4 left-4 w-20 h-20 border-l-2 border-t-2 border-primary/40" />
      <div className="absolute top-4 right-4 w-20 h-20 border-r-2 border-t-2 border-primary/40" />
      <div className="absolute bottom-4 left-4 w-20 h-20 border-l-2 border-b-2 border-primary/40" />
      <div className="absolute bottom-4 right-4 w-20 h-20 border-r-2 border-b-2 border-primary/40" />

      <style>{`
        @keyframes gridMove {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(40px, 40px);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-30px) translateX(10px);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}
