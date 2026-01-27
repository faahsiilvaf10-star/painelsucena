import { useState, useEffect } from "react";

export function CursorFollower() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [isVisible]);

  return (
    <div
      className="fixed pointer-events-none z-[9999] transition-opacity duration-300"
      style={{
        left: position.x,
        top: position.y,
        opacity: isVisible ? 1 : 0,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Outer glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: "24px",
          height: "24px",
          left: "-12px",
          top: "-12px",
          background: "radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%)",
          filter: "blur(4px)",
        }}
      />
      {/* Main ball */}
      <div
        className="rounded-full"
        style={{
          width: "10px",
          height: "10px",
          background: "radial-gradient(circle at 30% 30%, #fef08a, #eab308, #ca8a04)",
          boxShadow: `
            0 0 8px 2px rgba(234, 179, 8, 0.8),
            0 0 16px 4px rgba(234, 179, 8, 0.5),
            0 0 24px 6px rgba(234, 179, 8, 0.3),
            inset 0 0 4px rgba(255, 255, 255, 0.5)
          `,
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Inner highlight */}
      <div
        className="absolute rounded-full"
        style={{
          width: "4px",
          height: "4px",
          left: "-4px",
          top: "-4px",
          background: "rgba(255, 255, 255, 0.8)",
          filter: "blur(1px)",
        }}
      />
    </div>
  );
}
