import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export const ScreensaverClock = () => {
  const { user } = useAuth();
  const { settings } = useSiteSettings();
  const [isActive, setIsActive] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!settings.screensaver_enabled) {
      setIsActive(false);
      clearTimeout(timeoutRef.current);
      return;
    }

    const timeoutMs = settings.screensaver_timeout * 60 * 1000;

    const handleActivity = () => {
      setIsActive(false);
      clearTimeout(timeoutRef.current);
      if (settings.screensaver_enabled) {
        if (settings.screensaver_timeout === 0) {
          setIsActive(true);
        } else {
          timeoutRef.current = setTimeout(() => setIsActive(true), timeoutMs);
        }
      }
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("touchstart", handleActivity);
    
    timeoutRef.current = setTimeout(() => setIsActive(true), timeoutMs);

    return () => {
      clearTimeout(timeoutRef.current);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
    };
  }, [settings.screensaver_enabled, settings.screensaver_timeout]);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const now = new Date();
      const sec = now.getSeconds();
      const min = now.getMinutes();
      const hr = now.getHours();

      const hrEl = document.getElementById("hours");
      const minEl = document.getElementById("minutes");

      if (hrEl) hrEl.style.transform = `rotate(${(hr % 12) * 30 + min / 2}deg)`;
      if (minEl) minEl.style.transform = `rotate(${min * 6}deg)`;
      // Mickey arm handling would require sprite logic, simplified here for time
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive || !user) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center cursor-pointer"
      onClick={() => setIsActive(false)}
    >
      <div id="watch">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="digit">
            <span>{i + 1}</span>
          </div>
        ))}
        <div id="mickey" />
        <div id="hours" className="right" />
        <div id="minutes" className="right" />
      </div>
    </div>
  );
};
