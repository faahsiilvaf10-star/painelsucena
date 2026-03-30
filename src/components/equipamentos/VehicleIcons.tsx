import React from "react";
import pipaTruckImg from "@/assets/pipa-truck.png";
import munkTruckImg from "@/assets/munk-truck.png";

export type EquipmentType = "pipa" | "munk" | "camionete" | "onibus";

interface VehicleIconProps {
  type: EquipmentType;
  isStopped?: boolean;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
}

export const VehicleIcon: React.FC<VehicleIconProps> = ({ 
  type, 
  isStopped = false, 
  className = "",
  size = "md"
}) => {
  const sizeConfig = {
    xs: { width: 20, height: 12 },
    sm: { width: 32, height: 20 },
    md: { width: 40, height: 24 },
    lg: { width: 48, height: 28 },
  };

  const { width, height } = sizeConfig[size];
  const baseClass = `${isStopped ? 'opacity-60' : ''} ${className}`;

  switch (type) {
    case "pipa":
      return (
        <img
          src={pipaTruckImg}
          alt="Caminhão Pipa"
          width={width * 3}
          height={height * 3}
          className={`${baseClass} object-contain`}
          style={{ imageRendering: 'auto' }}
        />
      );

    case "munk":
      return (
        <img
          src={munkTruckImg}
          alt="Caminhão Munk"
          width={width * 3}
          height={height * 3}
          className={`${baseClass} object-contain`}
          style={{ imageRendering: 'auto' }}
        />
      );

    case "camionete":
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 36 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={baseClass}
        >
          {/* Body */}
          <path d="M4 8 L4 12 L32 12 L32 6 L26 6 L22 2 L12 2 L12 8 Z" fill="#6B7280" />
          {/* Cabin */}
          <path d="M22 2 L26 6 L32 6 L32 12 L12 12 L12 2 Z" fill="#F59E0B" />
          {/* Windows */}
          <path d="M14 4 L14 10 L20 10 L20 4 L18 2 L14 2 Z" fill="#1E293B" />
          <rect x="22" y="4" width="8" height="6" rx="1" fill="#1E293B" />
          {/* Bed */}
          <rect x="4" y="6" width="8" height="6" fill="#4B5563" />
          {/* Wheels */}
          <circle cx="8" cy="16" r="3" fill="#1F2937" />
          <circle cx="8" cy="16" r="1.2" fill="#4B5563" />
          <circle cx="28" cy="16" r="3" fill="#1F2937" />
          <circle cx="28" cy="16" r="1.2" fill="#4B5563" />
          {!isStopped && (
            <>
              <circle cx="8" cy="16" r="2" fill="none" stroke="#9CA3AF" strokeWidth="0.5" strokeDasharray="2 2" className="animate-spin-slow" style={{ transformOrigin: '8px 16px' }} />
              <circle cx="28" cy="16" r="2" fill="none" stroke="#9CA3AF" strokeWidth="0.5" strokeDasharray="2 2" className="animate-spin-slow" style={{ transformOrigin: '28px 16px' }} />
            </>
          )}
        </svg>
      );

    case "onibus":
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 48 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={baseClass}
        >
          {/* Body */}
          <rect x="2" y="4" width="44" height="14" rx="2" fill="#6366F1" />
          {/* Windows */}
          <rect x="6" y="6" width="6" height="6" rx="1" fill="#1E293B" />
          <rect x="14" y="6" width="6" height="6" rx="1" fill="#1E293B" />
          <rect x="22" y="6" width="6" height="6" rx="1" fill="#1E293B" />
          <rect x="30" y="6" width="6" height="6" rx="1" fill="#1E293B" />
          {/* Windshield */}
          <rect x="38" y="6" width="6" height="8" rx="1" fill="#1E293B" />
          {/* Door */}
          <rect x="10" y="12" width="4" height="6" fill="#4F46E5" />
          {/* Stripe */}
          <rect x="2" y="14" width="44" height="2" fill="#A5B4FC" />
          {/* Wheels */}
          <circle cx="12" cy="20" r="3" fill="#1F2937" />
          <circle cx="12" cy="20" r="1.2" fill="#4B5563" />
          <circle cx="36" cy="20" r="3" fill="#1F2937" />
          <circle cx="36" cy="20" r="1.2" fill="#4B5563" />
          {!isStopped && (
            <>
              <circle cx="12" cy="20" r="2" fill="none" stroke="#9CA3AF" strokeWidth="0.5" strokeDasharray="2 2" className="animate-spin-slow" style={{ transformOrigin: '12px 20px' }} />
              <circle cx="36" cy="20" r="2" fill="none" stroke="#9CA3AF" strokeWidth="0.5" strokeDasharray="2 2" className="animate-spin-slow" style={{ transformOrigin: '36px 20px' }} />
            </>
          )}
        </svg>
      );
  }
};

export const equipmentTypeLabels: Record<EquipmentType, string> = {
  pipa: "Caminhão Pipa",
  munk: "Caminhão Munk",
  camionete: "Camionete",
  onibus: "Ônibus",
};

export const equipmentTypeColors: Record<EquipmentType, { bg: string; text: string; border: string; glow: string }> = {
  pipa: { 
    bg: "bg-blue-500/10", 
    text: "text-blue-600", 
    border: "border-blue-500/30",
    glow: "shadow-blue-500/20"
  },
  munk: { 
    bg: "bg-orange-500/10", 
    text: "text-orange-600", 
    border: "border-orange-500/30",
    glow: "shadow-orange-500/20"
  },
  camionete: { 
    bg: "bg-emerald-500/10", 
    text: "text-emerald-600", 
    border: "border-emerald-500/30",
    glow: "shadow-emerald-500/20"
  },
  onibus: { 
    bg: "bg-indigo-500/10", 
    text: "text-indigo-600", 
    border: "border-indigo-500/30",
    glow: "shadow-indigo-500/20"
  },
};
