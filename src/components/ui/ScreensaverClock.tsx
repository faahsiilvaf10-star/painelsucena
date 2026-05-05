import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useTodayDDS } from "@/hooks/useDDSSchedule";
import { getCurrentMonthCampaigns } from "@/data/campaignData";
import { useActiveReminders } from "@/hooks/useReminders";
import { useOrderHighlights } from "@/hooks/useOrderHighlights";
import { AnimatePresence, motion } from "framer-motion";

interface ScreensaverHighlight {
  id: string;
  title: string;
  description: string;
  photo_url?: string;
  type: "dds" | "campaign" | "reminder" | "order";
}

export const ScreensaverClock = () => {
  const { user } = useAuth();
  const { settings } = useSiteSettings();
  const [isActive, setIsActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const { data: todayDDS } = useTodayDDS();
  const { data: activeReminders } = useActiveReminders();
  const { data: orderHighlights } = useOrderHighlights();
  const monthCampaigns = getCurrentMonthCampaigns();

  const highlights = React.useMemo(() => {
    const list: ScreensaverHighlight[] = [];

    // DDS
    if (todayDDS) {
      list.push({
        id: `dds-${todayDDS.id}`,
        title: "DDS de Hoje",
        description: todayDDS.theme,
        photo_url: todayDDS.photo_url || (todayDDS as any).event_photo_url,
        type: "dds"
      });
    }

    // Campanhas
    if (monthCampaigns) {
      monthCampaigns.campaigns.forEach((c, idx) => {
        list.push({
          id: `campaign-${idx}`,
          title: `Campanha ${c.colorName}`,
          description: c.name + ": " + c.description,
          type: "campaign"
        });
      });
    }

    // Lembretes
    if (activeReminders) {
      activeReminders.forEach(r => {
        list.push({
          id: `reminder-${r.id}`,
          title: "Lembrete: " + r.title,
          description: r.description || "",
          type: "reminder"
        });
      });
    }

    // Pedidos
    if (orderHighlights) {
      orderHighlights.forEach(o => {
        list.push({
          id: `order-${o.id}`,
          title: "Pedido: " + o.product_name,
          description: `Previsão: ${o.expected_date}`,
          type: "order"
        });
      });
    }

    return list;
  }, [todayDDS, activeReminders, orderHighlights, monthCampaigns]);

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
          timeoutRef.current = setTimeout(() => setIsActive(true), 5 * 60 * 1000);
        } else {
          timeoutRef.current = setTimeout(() => setIsActive(true), timeoutMs);
        }
      }
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("touchstart", handleActivity);
    
    if (settings.screensaver_enabled) {
      if (settings.screensaver_timeout === 0) {
        setIsActive(true);
      } else {
        timeoutRef.current = setTimeout(() => setIsActive(true), timeoutMs);
      }
    }

    return () => {
      clearTimeout(timeoutRef.current);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
    };
  }, [settings.screensaver_enabled, settings.screensaver_timeout]);

  useEffect(() => {
    if (!isActive || highlights.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % highlights.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isActive, highlights.length]);

  if (!isActive || !user) return null;

  const currentHighlight = highlights[currentIndex] || { 
    id: "default", 
    title: "Mantenha o foco", 
    description: "Sua produtividade é a nossa força.",
    type: "dds"
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center cursor-pointer overflow-hidden"
      onClick={(e) => {
        e.stopPropagation();
        setIsActive(false);
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentHighlight.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="relative w-full h-full flex flex-col items-center justify-center p-8 text-center"
        >
          {/* Background Image with Gradient */}
          {currentHighlight.photo_url ? (
            <div className="absolute inset-0 z-0">
              <motion.img
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 10, ease: "linear" }}
                src={currentHighlight.photo_url}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
            </div>
          ) : (
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black" />
          )}

          {/* Content */}
          <div className="relative z-10 max-w-4xl space-y-6">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight drop-shadow-2xl">
                {currentHighlight.title}
              </h2>
              <p className="text-xl md:text-3xl text-gray-200 font-medium leading-relaxed drop-shadow-lg">
                {currentHighlight.description}
              </p>
            </motion.div>

            {/* Visual Indicator */}
            <div className="flex justify-center gap-2 mt-12">
              {highlights.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    idx === currentIndex ? "w-8 bg-primary" : "w-2 bg-white/20"
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Clock in the corner */}
      <div className="absolute bottom-8 right-8 text-white/50 font-mono text-2xl">
        <ClockDisplay />
      </div>
    </div>
  );
};

const ClockDisplay = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
  );
};
