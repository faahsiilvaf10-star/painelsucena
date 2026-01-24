import React from "react";

export type EquipmentType = "pipa" | "munk" | "camionete";

interface VehicleIconProps {
  type: EquipmentType;
  isStopped?: boolean;
  className?: string;
}

export const VehicleIcon: React.FC<VehicleIconProps> = ({ type, isStopped = false, className = "" }) => {
  const baseClass = `drop-shadow-lg ${isStopped ? 'opacity-70' : ''} ${className}`;

  switch (type) {
    case "pipa":
      return (
        <svg
          width="48"
          height="32"
          viewBox="0 0 48 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={baseClass}
        >
          {/* Truck Cabin */}
          <rect x="28" y="8" width="16" height="14" rx="2" className="fill-primary" />
          {/* Cabin Window */}
          <rect x="32" y="10" width="10" height="6" rx="1" className="fill-primary-foreground/80" />
          {/* Tank Body */}
          <ellipse cx="16" cy="15" rx="14" ry="8" className="fill-blue-500" />
          {/* Tank Highlight */}
          <ellipse cx="16" cy="12" rx="10" ry="3" className="fill-blue-400/50" />
          {/* Water Label */}
          <text x="16" y="17" textAnchor="middle" className="fill-white text-[6px] font-bold">
            ÁGUA
          </text>
          {/* Wheels */}
          <circle cx="10" cy="24" r="4" className="fill-gray-800" />
          <circle cx="10" cy="24" r="2" className="fill-gray-600" />
          <circle cx="36" cy="24" r="4" className="fill-gray-800" />
          <circle cx="36" cy="24" r="2" className="fill-gray-600" />
          {!isStopped && (
            <>
              <g className="origin-center animate-spin-slow" style={{ transformOrigin: '10px 24px' }}>
                <line x1="10" y1="22" x2="10" y2="26" className="stroke-gray-400" strokeWidth="0.5" />
                <line x1="8" y1="24" x2="12" y2="24" className="stroke-gray-400" strokeWidth="0.5" />
              </g>
              <g className="origin-center animate-spin-slow" style={{ transformOrigin: '36px 24px' }}>
                <line x1="36" y1="22" x2="36" y2="26" className="stroke-gray-400" strokeWidth="0.5" />
                <line x1="34" y1="24" x2="38" y2="24" className="stroke-gray-400" strokeWidth="0.5" />
              </g>
            </>
          )}
        </svg>
      );

    case "munk":
      return (
        <svg
          width="56"
          height="36"
          viewBox="0 0 56 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={baseClass}
        >
          {/* Truck Cabin */}
          <rect x="36" y="12" width="16" height="14" rx="2" className="fill-primary" />
          {/* Cabin Window */}
          <rect x="40" y="14" width="10" height="6" rx="1" className="fill-primary-foreground/80" />
          {/* Truck Bed */}
          <rect x="4" y="16" width="32" height="10" rx="1" className="fill-gray-600" />
          {/* Crane Base */}
          <rect x="26" y="8" width="8" height="8" className="fill-orange-500" />
          {/* Crane Arm */}
          <rect x="12" y="4" width="20" height="4" rx="1" className="fill-orange-400" />
          {/* Crane Hook */}
          <path d="M12 4 L12 0 L8 0 L8 6 L12 6" className="stroke-orange-600 fill-none" strokeWidth="2" />
          {/* Wheels */}
          <circle cx="12" cy="28" r="4" className="fill-gray-800" />
          <circle cx="12" cy="28" r="2" className="fill-gray-600" />
          <circle cx="44" cy="28" r="4" className="fill-gray-800" />
          <circle cx="44" cy="28" r="2" className="fill-gray-600" />
          {!isStopped && (
            <>
              <g className="origin-center animate-spin-slow" style={{ transformOrigin: '12px 28px' }}>
                <line x1="12" y1="26" x2="12" y2="30" className="stroke-gray-400" strokeWidth="0.5" />
                <line x1="10" y1="28" x2="14" y2="28" className="stroke-gray-400" strokeWidth="0.5" />
              </g>
              <g className="origin-center animate-spin-slow" style={{ transformOrigin: '44px 28px' }}>
                <line x1="44" y1="26" x2="44" y2="30" className="stroke-gray-400" strokeWidth="0.5" />
                <line x1="42" y1="28" x2="46" y2="28" className="stroke-gray-400" strokeWidth="0.5" />
              </g>
            </>
          )}
        </svg>
      );

    case "camionete":
      return (
        <svg
          width="44"
          height="28"
          viewBox="0 0 44 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={baseClass}
        >
          {/* Cabin */}
          <path
            d="M24 6 L24 16 L40 16 L40 10 L36 6 L24 6 Z"
            className="fill-primary"
          />
          {/* Cabin Window */}
          <path
            d="M26 8 L26 14 L34 14 L34 10 L32 8 L26 8 Z"
            className="fill-primary-foreground/80"
          />
          {/* Truck Bed */}
          <rect x="4" y="10" width="20" height="6" className="fill-gray-500" />
          {/* Bed Rail */}
          <rect x="4" y="8" width="20" height="2" className="fill-gray-600" />
          {/* Wheels */}
          <circle cx="10" cy="20" r="4" className="fill-gray-800" />
          <circle cx="10" cy="20" r="2" className="fill-gray-600" />
          <circle cx="34" cy="20" r="4" className="fill-gray-800" />
          <circle cx="34" cy="20" r="2" className="fill-gray-600" />
          {!isStopped && (
            <>
              <g className="origin-center animate-spin-slow" style={{ transformOrigin: '10px 20px' }}>
                <line x1="10" y1="18" x2="10" y2="22" className="stroke-gray-400" strokeWidth="0.5" />
                <line x1="8" y1="20" x2="12" y2="20" className="stroke-gray-400" strokeWidth="0.5" />
              </g>
              <g className="origin-center animate-spin-slow" style={{ transformOrigin: '34px 20px' }}>
                <line x1="34" y1="18" x2="34" y2="22" className="stroke-gray-400" strokeWidth="0.5" />
                <line x1="32" y1="20" x2="36" y2="20" className="stroke-gray-400" strokeWidth="0.5" />
              </g>
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
