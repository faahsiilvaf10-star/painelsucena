import { useState } from "react";
import { 
  Play, 
  Clock, 
  CloudRain, 
  Fuel,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StopReason } from "@/hooks/useEquipment";

interface GaugeOption {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  action: StopReason;
  angle: number; // Angle in degrees for the pointer
}

const gaugeOptions: GaugeOption[] = [
  {
    id: "none",
    label: "Operando",
    shortLabel: "Operar",
    icon: <Play className="h-4 w-4" />,
    color: "text-green-500",
    bgColor: "bg-green-500",
    action: "none",
    angle: -60,
  },
  {
    id: "waiting",
    label: "Aguardando Frente",
    shortLabel: "Aguardando",
    icon: <Clock className="h-4 w-4" />,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500",
    action: "waiting",
    angle: -20,
  },
  {
    id: "rain",
    label: "Chuva",
    shortLabel: "Chuva",
    icon: <CloudRain className="h-4 w-4" />,
    color: "text-blue-500",
    bgColor: "bg-blue-500",
    action: "rain",
    angle: 20,
  },
  {
    id: "end_of_day",
    label: "Combustível",
    shortLabel: "Combustível",
    icon: <Fuel className="h-4 w-4" />,
    color: "text-orange-500",
    bgColor: "bg-orange-500",
    action: "end_of_day",
    angle: 60,
  },
];

interface ShiftStartGaugeProps {
  selectedStatus: StopReason;
  onStatusChange: (status: StopReason) => void;
  disabled?: boolean;
}

export function ShiftStartGauge({ selectedStatus, onStatusChange, disabled }: ShiftStartGaugeProps) {
  const currentIndex = gaugeOptions.findIndex(opt => opt.action === selectedStatus);
  const currentOption = gaugeOptions[currentIndex] || gaugeOptions[0];

  const handlePrevious = () => {
    if (disabled) return;
    const newIndex = currentIndex <= 0 ? gaugeOptions.length - 1 : currentIndex - 1;
    onStatusChange(gaugeOptions[newIndex].action);
  };

  const handleNext = () => {
    if (disabled) return;
    const newIndex = currentIndex >= gaugeOptions.length - 1 ? 0 : currentIndex + 1;
    onStatusChange(gaugeOptions[newIndex].action);
  };

  const handleOptionClick = (option: GaugeOption) => {
    if (disabled) return;
    onStatusChange(option.action);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Gauge Container */}
      <div className="relative w-36 h-20 sm:w-44 sm:h-24">
        {/* Gauge Background Arc */}
        <svg 
          viewBox="0 0 120 70" 
          className="w-full h-full"
        >
          {/* Background arc */}
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
            strokeLinecap="round"
          />
          
          {/* Colored segments */}
          <path
            d="M 15 55 A 45 45 0 0 1 35 22"
            fill="none"
            stroke="#22c55e"
            strokeWidth="6"
            strokeLinecap="round"
            opacity={currentOption.id === "none" ? 1 : 0.3}
          />
          <path
            d="M 38 18 A 45 45 0 0 1 58 10"
            fill="none"
            stroke="#eab308"
            strokeWidth="6"
            strokeLinecap="round"
            opacity={currentOption.id === "waiting" ? 1 : 0.3}
          />
          <path
            d="M 62 10 A 45 45 0 0 1 82 18"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="6"
            strokeLinecap="round"
            opacity={currentOption.id === "rain" ? 1 : 0.3}
          />
          <path
            d="M 85 22 A 45 45 0 0 1 105 55"
            fill="none"
            stroke="#f97316"
            strokeWidth="6"
            strokeLinecap="round"
            opacity={currentOption.id === "end_of_day" ? 1 : 0.3}
          />

          {/* Center point */}
          <circle cx="60" cy="60" r="6" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />

          {/* Red Pointer */}
          <g 
            style={{ 
              transform: `rotate(${currentOption.angle}deg)`,
              transformOrigin: "60px 60px",
              transition: "transform 0.3s ease-out"
            }}
          >
            <line
              x1="60"
              y1="60"
              x2="60"
              y2="20"
              stroke="#ef4444"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <polygon
              points="60,12 55,22 65,22"
              fill="#ef4444"
            />
          </g>

          {/* Center circle overlay */}
          <circle cx="60" cy="60" r="4" fill="#ef4444" />
        </svg>

        {/* Option Labels around the gauge */}
        <div className="absolute -left-1 top-8 sm:top-10">
          <button
            type="button"
            onClick={() => handleOptionClick(gaugeOptions[0])}
            disabled={disabled}
            className={cn(
              "p-1 rounded-full transition-all",
              currentOption.id === "none" ? "bg-green-500 text-white scale-110" : "bg-muted hover:bg-green-500/20"
            )}
          >
            <Play className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
        </div>
        <div className="absolute left-6 sm:left-8 -top-1">
          <button
            type="button"
            onClick={() => handleOptionClick(gaugeOptions[1])}
            disabled={disabled}
            className={cn(
              "p-1 rounded-full transition-all",
              currentOption.id === "waiting" ? "bg-yellow-500 text-white scale-110" : "bg-muted hover:bg-yellow-500/20"
            )}
          >
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
        </div>
        <div className="absolute right-6 sm:right-8 -top-1">
          <button
            type="button"
            onClick={() => handleOptionClick(gaugeOptions[2])}
            disabled={disabled}
            className={cn(
              "p-1 rounded-full transition-all",
              currentOption.id === "rain" ? "bg-blue-500 text-white scale-110" : "bg-muted hover:bg-blue-500/20"
            )}
          >
            <CloudRain className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
        </div>
        <div className="absolute -right-1 top-8 sm:top-10">
          <button
            type="button"
            onClick={() => handleOptionClick(gaugeOptions[3])}
            disabled={disabled}
            className={cn(
              "p-1 rounded-full transition-all",
              currentOption.id === "end_of_day" ? "bg-orange-500 text-white scale-110" : "bg-muted hover:bg-orange-500/20"
            )}
          >
            <Fuel className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={disabled}
          className="p-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        
        <div className={cn(
          "px-3 py-1 rounded-full text-white text-xs sm:text-sm font-medium min-w-[100px] text-center",
          currentOption.bgColor
        )}>
          {currentOption.shortLabel}
        </div>
        
        <button
          type="button"
          onClick={handleNext}
          disabled={disabled}
          className="p-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
        Selecione como iniciar o turno
      </p>
    </div>
  );
}
