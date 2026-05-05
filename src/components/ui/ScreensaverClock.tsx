import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useTodayDDS } from "@/hooks/useDDSSchedule";
import { getCurrentMonthCampaigns } from "@/data/campaignData";
import { useActiveReminders } from "@/hooks/useReminders";
import { useOrderHighlights } from "@/hooks/useOrderHighlights";
import { usePageCustomizations } from "@/hooks/usePageCustomizations";
import { usePlanejamentoMetas } from "@/hooks/usePlanejamentoMetas";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";
import { useAttendanceDailyMarks } from "@/hooks/useAttendanceDailyMarks";
import { useEquipment } from "@/hooks/useEquipment";
import { useCurrentTemperature } from "@/hooks/useCurrentTemperature";
import { useSlingWithInspections } from "@/hooks/useSlingWithInspections";
import { useMeetingMinutes } from "@/hooks/useMeetingMinutes";
import { getEffectiveAsoExpiry } from "@/lib/asoValidity";
import { AnimatePresence, motion } from "framer-motion";

interface ScreensaverHighlight {
  id: string;
  title: string;
  description: string;
  photo_url?: string;
  type: "dds" | "campaign" | "reminder" | "order" | "meta" | "attendance" | "equipment" | "weather" | "aso" | "sling" | "minute";
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
  const { data: metas } = usePlanejamentoMetas();
  const { data: rhData } = useRHEfetivo();
  const today = new Date().toISOString().split('T')[0];
  const { data: attendanceMarks } = useAttendanceDailyMarks(today);
  const { data: equipments } = useEquipment();
  const { data: weatherData } = useCurrentTemperature();
  const { slings, pendingInspections } = useSlingWithInspections();
  const { data: minutes } = useMeetingMinutes();
  
  const monthCampaigns = getCurrentMonthCampaigns();
  const { customizations } = usePageCustomizations("campanhas");

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
        // Buscar foto customizada do banner da campanha para este mês
        const bannerKey = `banner-month-${monthCampaigns.month}`;
        const customPhoto = customizations?.find(cust => cust.element_key === bannerKey)?.image_url;
        
        // Se houver fotos estáticas mapeadas em Campanhas.tsx, poderíamos usar aqui também,
        // mas o usuário especificou "se houver foto", o que sugere as fotos enviadas/definidas por ele.
        const staticBanners: Record<number, string> = {
          2: "/campaigns/campanha-2.png",
          3: "/campaigns/campanha-3.png",
          4: "/campaigns/campanha-4.png",
          5: "/campaigns/campanha-5.png",
          6: "/campaigns/campanha-6.png",
          7: "/campaigns/campanha-7.png",
          8: "/campaigns/campanha-8.png",
          9: "/campaigns/campanha-9.png",
          10: "/campaigns/campanha-10.png",
          11: "/campaigns/campanha-11.png",
          12: "/campaigns/campanha-12.png",
        };

        list.push({
          id: `campaign-${idx}`,
          title: `Campanha ${c.colorName}`,
          description: c.name + ": " + c.description,
          photo_url: customPhoto || staticBanners[monthCampaigns.month],
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

    // Avanço Mensal Atual (Metas)
    if (metas && metas.length > 0) {
      const activeMetas = metas.filter(m => !m.is_section_header && m.meta > 0);
      if (activeMetas.length > 0) {
        const avgProgress = Math.round(
          (activeMetas.reduce((acc, m) => acc + (m.realizado / m.meta), 0) / activeMetas.length) * 100
        );
        list.push({
          id: "monthly-advance",
          title: "Avanço Mensal",
          description: `Progresso médio das metas: ${avgProgress}% concluído.`,
          photo_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80",
          type: "meta"
        });
      }
    }

    // Presentes e Ausentes Hoje
    if (rhData?.colaboradores && attendanceMarks) {
      const totalColabs = rhData.colaboradores.length;
      const absentIds = new Set(attendanceMarks.flatMap(m => m.absent_employee_ids));
      const absentCount = absentIds.size;
      const presentCount = totalColabs - absentCount;
      
      list.push({
        id: "attendance-summary",
        title: "Efetivo de Hoje",
        description: `${presentCount} Presentes • ${absentCount} Ausentes`,
        photo_url: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&q=80",
        type: "attendance"
      });
    }

    // Equipamentos Ativos
    if (equipments && equipments.length > 0) {
      const activeEquip = equipments.filter(e => e.stop_reason === "none").length;
      list.push({
        id: "active-equipment",
        title: "Equipamentos Ativos",
        description: `${activeEquip} de ${equipments.length} equipamentos em operação agora.`,
        photo_url: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80",
        type: "equipment"
      });
    }

    // Temperatura Atual
    if (weatherData) {
      list.push({
        id: "current-weather",
        title: `Temperatura: ${weatherData.temperature}°C`,
        description: `Sensação térmica de ${weatherData.apparentTemp}°C • Humidade: ${weatherData.humidity}%`,
        photo_url: weatherData.temperature > 30 
          ? "https://images.unsplash.com/photo-1504370805625-d32c54b16100?auto=format&fit=crop&q=80"
          : "https://images.unsplash.com/photo-1516912481808-34061f8bc6a4?auto=format&fit=crop&q=80",
        type: "weather"
      });
    }

    // Vencimento de ASOs
    if (rhData?.colaboradores) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const expiringSoon = rhData.colaboradores.filter(c => {
        const expiry = getEffectiveAsoExpiry(c.aso, c.admissao);
        if (!expiry) return false;
        const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 30;
      });

      if (expiringSoon.length > 0) {
        list.push({
          id: "aso-expiry",
          title: "Vencimento de ASOs",
          description: `${expiringSoon.length} colaboradores com ASO vencendo nos próximos 30 dias.`,
          photo_url: "https://images.unsplash.com/photo-1505751172107-5962250d73b9?auto=format&fit=crop&q=80",
          type: "aso"
        });
      }
    }

    // Vistoria de Cintas
    if (pendingInspections && pendingInspections.length > 0) {
      list.push({
        id: "sling-inspections",
        title: "Vistoria de Cintas",
        description: `Existem ${pendingInspections.length} cintas pendentes de vistoria este mês.`,
        photo_url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80",
        type: "sling"
      });
    }

    // Atas de Contrato (Última ata)
    if (minutes && minutes.length > 0) {
      const latestMinute = minutes[0];
      list.push({
        id: `minute-${latestMinute.id}`,
        title: "Última Ata de Reunião",
        description: `${latestMinute.title} - ${latestMinute.meeting_date ? new Date(latestMinute.meeting_date).toLocaleDateString('pt-BR') : 'Data não informada'}`,
        photo_url: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80",
        type: "minute"
      });
    }

    return list;
  }, [todayDDS, activeReminders, orderHighlights, monthCampaigns, customizations, metas, rhData, attendanceMarks, equipments, weatherData, pendingInspections, minutes]);

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
                    idx === currentIndex ? "w-12 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" : "w-2 bg-white/20"
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
