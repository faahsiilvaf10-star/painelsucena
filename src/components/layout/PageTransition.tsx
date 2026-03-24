import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [displayedChildren, setDisplayedChildren] = useState(children);

  useEffect(() => {
    setIsVisible(false);
    
    const timeout = setTimeout(() => {
      setDisplayedChildren(children);
      setIsVisible(true);
    }, 350);

    return () => clearTimeout(timeout);
  }, [location.pathname]);

  useEffect(() => {
    setDisplayedChildren(children);
  }, [children]);

  return (
    <div
      className={`transition-all duration-500 ease-in-out ${
        isVisible 
          ? "opacity-100 translate-y-0 scale-100" 
          : "opacity-0 translate-y-3 scale-[0.99]"
      }`}
    >
      {displayedChildren}
    </div>
  );
}
