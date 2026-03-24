import { ReactNode, useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { SLogoTransition } from "./SLogoTransition";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const [showLogoTransition, setShowLogoTransition] = useState(false);
  const [pendingChildren, setPendingChildren] = useState<ReactNode>(null);

  useEffect(() => {
    // Fade out content and trigger logo animation
    setIsVisible(false);
    setPendingChildren(children);
    setShowLogoTransition(true);
  }, [location.pathname]);

  const handleTransitionComplete = useCallback(() => {
    if (pendingChildren) {
      setDisplayedChildren(pendingChildren);
      setPendingChildren(null);
    }
    setShowLogoTransition(false);
    setIsVisible(true);
  }, [pendingChildren]);

  // Update children immediately on first render
  useEffect(() => {
    setDisplayedChildren(children);
  }, [children]);

  return (
    <>
      <SLogoTransition
        isActive={showLogoTransition}
        onComplete={handleTransitionComplete}
      />
      <div
        className={`transition-all duration-500 ease-in-out ${
          isVisible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-3 scale-[0.99]"
        }`}
      >
        {displayedChildren}
      </div>
    </>
  );
}
