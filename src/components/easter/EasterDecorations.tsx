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

      {/* Corner Páscoa images */}
      <img
        src={easterPascoa}
        alt=""
        className="fixed bottom-2 left-2 pointer-events-none select-none z-[1] opacity-50 dark:opacity-25"
        style={{
          width: "100px",
          height: "auto",
          animation: "easterBounce 3s ease-in-out infinite",
        }}
      />
      <img
        src={easterPascoa}
        alt=""
        className="fixed bottom-2 right-2 pointer-events-none select-none z-[1] opacity-50 dark:opacity-25"
        style={{
          width: "100px",
          height: "auto",
          animation: "easterBounce 3s ease-in-out 1.5s infinite",
          transform: "scaleX(-1)",
        }}
      />

      {/* Top center Páscoa image */}
      <div className="fixed top-0 left-0 right-0 z-[2] pointer-events-none flex justify-center">
        <img
          src={easterPascoa}
          alt=""
          className="select-none opacity-70 dark:opacity-40"
          style={{
            width: "120px",
            height: "auto",
            marginTop: "-5px",
            animation: "easterBounce 3s ease-in-out infinite",
          }}
        />
      </div>
    </>
  );
};
