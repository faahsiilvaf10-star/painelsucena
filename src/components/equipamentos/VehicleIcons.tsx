import React from "react";

export type EquipmentType = "pipa" | "munk" | "camionete";

interface VehicleIconProps {
  type: EquipmentType;
  isStopped?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const VehicleIcon: React.FC<VehicleIconProps> = ({ 
  type, 
  isStopped = false, 
  className = "",
  size = "md"
}) => {
  const sizeConfig = {
    sm: { width: 32, height: 20 },
    md: { width: 40, height: 24 },
    lg: { width: 48, height: 28 },
  };

  const { width, height } = sizeConfig[size];
  const baseClass = `${isStopped ? 'opacity-60' : ''} ${className}`;

  switch (type) {
    case "pipa":
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 40 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={baseClass}
        >
          {/* Cabin */}
          <rect x="28" y="4" width="10" height="12" rx="1.5" fill="#F59E0B" />
          <rect x="30" y="6" width="6" height="4" rx="1" fill="#1E293B" />
          {/* Tank */}
          <ellipse cx="16" cy="10" rx="14" ry="6" fill="#3B82F6" />
          <ellipse cx="16" cy="8" rx="10" ry="2.5" fill="#60A5FA" opacity="0.5" />
          <text x="16" y="12" textAnchor="middle" fill="white" fontSize="5" fontWeight="bold">H₂O</text>
          {/* Wheels */}
          <circle cx="8" cy="18" r="3.5" fill="#1F2937" />
          <circle cx="8" cy="18" r="1.5" fill="#4B5563" />
          <circle cx="32" cy="18" r="3.5" fill="#1F2937" />
          <circle cx="32" cy="18" r="1.5" fill="#4B5563" />
          {!isStopped && (
            <>
              <circle cx="8" cy="18" r="2.5" fill="none" stroke="#9CA3AF" strokeWidth="0.5" strokeDasharray="2 2" className="animate-spin-slow" style={{ transformOrigin: '8px 18px' }} />
              <circle cx="32" cy="18" r="2.5" fill="none" stroke="#9CA3AF" strokeWidth="0.5" strokeDasharray="2 2" className="animate-spin-slow" style={{ transformOrigin: '32px 18px' }} />
            </>
          )}
        </svg>
      );

    case "munk":
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 44 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={baseClass}
        >
          {/* Cabin */}
          <rect x="32" y="6" width="10" height="10" rx="1.5" fill="#F59E0B" />
          <rect x="34" y="8" width="6" height="4" rx="1" fill="#1E293B" />
          {/* Bed */}
          <rect x="4" y="10" width="28" height="6" rx="1" fill="#4B5563" />
          {/* Crane Base */}
          <rect x="26" y="4" width="6" height="6" fill="#EA580C" rx="1" />
          {/* Crane Arm */}
          <rect x="10" y="2" width="18" height="3" rx="1" fill="#F97316" />
          {/* Hook */}
          <path d="M10 2 L10 0 L6 0 L6 4 L8 4 L8 2" stroke="#DC2626" strokeWidth="1.5" fill="none" />
          <circle cx="6" cy="5" r="1.5" fill="#DC2626" />
          {/* Wheels */}
          <circle cx="10" cy="20" r="3.5" fill="#1F2937" />
          <circle cx="10" cy="20" r="1.5" fill="#4B5563" />
          <circle cx="36" cy="20" r="3.5" fill="#1F2937" />
          <circle cx="36" cy="20" r="1.5" fill="#4B5563" />
          {!isStopped && (
            <>
              <circle cx="10" cy="20" r="2.5" fill="none" stroke="#9CA3AF" strokeWidth="0.5" strokeDasharray="2 2" className="animate-spin-slow" style={{ transformOrigin: '10px 20px' }} />
              <circle cx="36" cy="20" r="2.5" fill="none" stroke="#9CA3AF" strokeWidth="0.5" strokeDasharray="2 2" className="animate-spin-slow" style={{ transformOrigin: '36px 20px' }} />
            </>
          )}
        </svg>
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
  }
};

export const equipmentTypeLabels: Record<EquipmentType, string> = {
  pipa: "Caminhão Pipa",
  munk: "Caminhão Munk",
  camionete: "Camionete",
};

export const equipmentTypeColors: Record<EquipmentType, string> = {
  pipa: "bg-blue-500",
  munk: "bg-orange-500",
  camionete: "bg-gray-500",
};
