import { ReactNode, useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [phase, setPhase] = useState<"visible" | "exit" | "enter">("visible");
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setDisplayedChildren(children);
      return;
    }

    // Exit phase
    setPhase("exit");

    const exitTimer = setTimeout(() => {
      setDisplayedChildren(children);
      setPhase("enter");

      const enterTimer = setTimeout(() => {
        setPhase("visible");
      }, 350);

      return () => clearTimeout(enterTimer);
    }, 200);

    return () => clearTimeout(exitTimer);
  }, [location.pathname]);

  // Keep children in sync for non-navigation updates
  useEffect(() => {
    if (phase === "visible") {
      setDisplayedChildren(children);
    }
  }, [children, phase]);

  const transitionStyles: React.CSSProperties =
    phase === "exit"
      ? {
          opacity: 0,
          transform: "scale(0.96) translateY(8px)",
          filter: "blur(2px)",
          transition: "opacity 200ms ease-in, transform 200ms ease-in, filter 200ms ease-in",
        }
      : phase === "enter"
      ? {
          opacity: 1,
          transform: "scale(1) translateY(0)",
          filter: "blur(0px)",
          transition: "opacity 300ms cubic-bezier(0.16, 1, 0.3, 1), transform 300ms cubic-bezier(0.16, 1, 0.3, 1), filter 300ms cubic-bezier(0.16, 1, 0.3, 1)",
        }
      : {
          opacity: 1,
          transform: "scale(1) translateY(0)",
          filter: "blur(0px)",
        };

  return (
    <div style={{ ...transitionStyles, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }} className="will-change-[transform,opacity,filter]">
      {displayedChildren}
    </div>
  );
}
