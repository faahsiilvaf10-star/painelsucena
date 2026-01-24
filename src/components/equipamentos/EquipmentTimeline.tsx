import { useState, useEffect, useMemo } from "react";
import { Truck } from "lucide-react";

interface EquipmentTimelineProps {
  name: string;
  startHour?: number;
  endHour?: number;
}

export function EquipmentTimeline({ 
  name, 
  startHour = 8, 
  endHour = 16 
}: EquipmentTimelineProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate position based on current time
  const position = useMemo(() => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const currentDecimal = hours + minutes / 60;

    if (currentDecimal < startHour) return 0;
    if (currentDecimal > endHour) return 100;

    const totalDuration = endHour - startHour;
    const elapsed = currentDecimal - startHour;
    return (elapsed / totalDuration) * 100;
  }, [currentTime, startHour, endHour]);

  // Generate hour markers
  const hourMarkers = useMemo(() => {
    const markers = [];
    for (let h = startHour; h <= endHour; h++) {
      const pos = ((h - startHour) / (endHour - startHour)) * 100;
      markers.push({ hour: h, position: pos });
    }
    return markers;
  }, [startHour, endHour]);

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, "0")}:00`;
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Truck className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{name}</h3>
          <p className="text-sm text-muted-foreground">
            Operação: {formatHour(startHour)} - {formatHour(endHour)}
          </p>
        </div>
      </div>

      {/* Timeline Container */}
      <div className="relative pt-16 pb-8">
        {/* Progress Background */}
        <div className="absolute left-0 right-0 h-3 bg-muted rounded-full overflow-hidden">
          {/* Progress Fill */}
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-1000"
            style={{ width: `${position}%` }}
          />
        </div>

        {/* Animated Truck */}
        <div
          className="absolute -top-2 transition-all duration-1000 ease-linear"
          style={{ left: `calc(${position}% - 24px)` }}
        >
          <div className="relative">
            {/* Truck Body */}
            <div className="animate-bounce-slow">
              <svg
                width="48"
                height="32"
                viewBox="0 0 48 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-lg"
              >
                {/* Truck Cabin */}
                <rect
                  x="28"
                  y="8"
                  width="16"
                  height="14"
                  rx="2"
                  className="fill-primary"
                />
                {/* Cabin Window */}
                <rect
                  x="32"
                  y="10"
                  width="10"
                  height="6"
                  rx="1"
                  className="fill-primary-foreground/80"
                />
                {/* Tank Body */}
                <ellipse
                  cx="16"
                  cy="15"
                  rx="14"
                  ry="8"
                  className="fill-blue-500"
                />
                {/* Tank Highlight */}
                <ellipse
                  cx="16"
                  cy="12"
                  rx="10"
                  ry="3"
                  className="fill-blue-400/50"
                />
                {/* Water Label */}
                <text
                  x="16"
                  y="17"
                  textAnchor="middle"
                  className="fill-white text-[6px] font-bold"
                >
                  ÁGUA
                </text>
                {/* Wheels */}
                <circle cx="10" cy="24" r="4" className="fill-gray-800" />
                <circle cx="10" cy="24" r="2" className="fill-gray-600" />
                <circle cx="36" cy="24" r="4" className="fill-gray-800" />
                <circle cx="36" cy="24" r="2" className="fill-gray-600" />
                {/* Wheel spokes animation */}
                <g className="origin-center animate-spin-slow" style={{ transformOrigin: '10px 24px' }}>
                  <line x1="10" y1="22" x2="10" y2="26" className="stroke-gray-400" strokeWidth="0.5" />
                  <line x1="8" y1="24" x2="12" y2="24" className="stroke-gray-400" strokeWidth="0.5" />
                </g>
                <g className="origin-center animate-spin-slow" style={{ transformOrigin: '36px 24px' }}>
                  <line x1="36" y1="22" x2="36" y2="26" className="stroke-gray-400" strokeWidth="0.5" />
                  <line x1="34" y1="24" x2="38" y2="24" className="stroke-gray-400" strokeWidth="0.5" />
                </g>
              </svg>
            </div>
            {/* Current Time Badge */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow-lg">
              {currentTime.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>

        {/* Hour Markers */}
        <div className="absolute left-0 right-0 top-8">
          {hourMarkers.map(({ hour, position: pos }) => (
            <div
              key={hour}
              className="absolute flex flex-col items-center"
              style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
            >
              <div className="w-0.5 h-4 bg-border" />
              <span className="mt-2 text-xs text-muted-foreground font-medium">
                {formatHour(hour)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${position > 0 && position < 100 ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
          <span className="text-sm text-muted-foreground">
            {position === 0 && "Aguardando início"}
            {position > 0 && position < 100 && "Em operação"}
            {position >= 100 && "Operação concluída"}
          </span>
        </div>
        <span className="text-sm font-medium text-foreground">
          {Math.round(position)}% concluído
        </span>
      </div>
    </div>
  );
}
