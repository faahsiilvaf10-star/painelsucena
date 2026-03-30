import { useEffect, useState } from "react";
import easterPascoa from "@/assets/easter-pascoa.png";
import easterEgg from "@/assets/easter-egg.png";
import easterEggPink from "@/assets/easter-egg-pink.png";

export const EasterDecorations = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <>
      {/* Floating chocolate eggs */}
      {[8, 25, 45, 65, 85].map((left, i) => {
        const img = i % 2 === 0 ? easterEgg : easterEggPink;
        return (
          <img
            key={`egg-${i}`}
            src={img}
            alt=""
            className="fixed pointer-events-none select-none z-[1] opacity-0"
            style={{
              left: `${left}%`,
              top: "-60px",
              width: "36px",
              height: "auto",
              animation: `easterFloat 20s ease-in-out ${i * 1.5}s infinite`,
            }}
          />
        );
      })}

      {/* Corner bunnies */}
      <img
        src={easterBunny}
        alt=""
        className="fixed bottom-2 left-2 pointer-events-none select-none z-[1] opacity-50 dark:opacity-25"
        style={{
          width: "70px",
          height: "auto",
          animation: "easterBounce 3s ease-in-out infinite",
        }}
      />
      <img
        src={easterBunny}
        alt=""
        className="fixed bottom-2 right-2 pointer-events-none select-none z-[1] opacity-50 dark:opacity-25"
        style={{
          width: "70px",
          height: "auto",
          animation: "easterBounce 3s ease-in-out 1.5s infinite",
          transform: "scaleX(-1)",
        }}
      />

    </>
  );
};
