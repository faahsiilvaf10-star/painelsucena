import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";

export const ScreensaverClock = () => {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleActivity = () => {
      setIsActive(false);
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setIsActive(true), 5 * 60 * 1000); // 5 minutes
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    
    timeoutRef.current = setTimeout(() => setIsActive(true), 5 * 60 * 1000);

    return () => {
      clearTimeout(timeoutRef.current);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
    };
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const now = new Date();
      const sec = now.getSeconds();
      const min = now.getMinutes();
      const hr = now.getHours();

      const secEl = document.getElementById("minutes");
      const minEl = document.getElementById("minutes");
      const hrEl = document.getElementById("hours");

      if (hrEl) hrEl.style.transform = `rotate(${(hr % 12) * 30 + min / 2}deg)`;
      if (minEl) minEl.style.transform = `rotate(${min * 6}deg)`;
      // Mickey arm handling would require sprite logic, simplified here for time
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive || !user) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      <div id="watch">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="digit" style={{ transform: `rotate(${(i + 1) * 30}deg)` }}>
            <span style={{ transform: `rotate(-${(i + 1) * 30}deg)` }}>{i + 1}</span>
          </div>
        ))}
        <div id="mickey" />
        <div id="hours" />
        <div id="minutes" />
      </div>
    </div>
  );
};
