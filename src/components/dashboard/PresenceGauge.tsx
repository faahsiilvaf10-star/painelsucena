import { ClipboardCheck } from "lucide-react";

interface PresenceGaugeProps {
  present: number;
  total: number;
  percentage: number;
}

export function PresenceGauge({ present, total, percentage }: PresenceGaugeProps) {
  const radius = 80;
  const stroke = 10;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className="relative flex flex-col items-center justify-center rounded-2xl p-6"
      style={{
        background: "linear-gradient(145deg, hsl(30, 15%, 92%), hsl(30, 10%, 86%))",
        boxShadow:
          "8px 8px 16px hsl(30, 10%, 78%), -8px -8px 16px hsl(30, 20%, 98%), inset 0 1px 0 hsl(30, 20%, 96%)",
        minHeight: 220,
      }}
    >
      {/* Copper ring SVG */}
      <svg height={radius * 2} width={radius * 2} className="drop-shadow-md">
        {/* Background ring */}
        <circle
          stroke="hsl(30, 12%, 82%)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Copper progress ring */}
        <circle
          stroke="url(#copperGradient)"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "50% 50%",
            transition: "stroke-dashoffset 1s ease-out",
          }}
        />
        <defs>
          <linearGradient id="copperGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(25, 55%, 55%)" />
            <stop offset="50%" stopColor="hsl(30, 65%, 65%)" />
            <stop offset="100%" stopColor="hsl(20, 50%, 45%)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: 8 }}>
        <span
          className="uppercase tracking-widest font-bold"
          style={{
            fontSize: "0.65rem",
            color: "hsl(30, 20%, 45%)",
            letterSpacing: "0.18em",
          }}
        >
          Presença
        </span>
        <span
          className="font-extrabold leading-none"
          style={{
            fontSize: "1.8rem",
            color: "hsl(30, 15%, 20%)",
          }}
        >
          {present}
          <span
            style={{
              fontSize: "0.95rem",
              color: "hsl(30, 10%, 50%)",
              fontWeight: 500,
              marginLeft: 4,
            }}
          >
            | {percentage}%
          </span>
        </span>
      </div>

      {/* Bottom section */}
      <div className="mt-3 flex items-center gap-2">
        <span
          className="font-semibold"
          style={{
            fontSize: "0.85rem",
            color: "hsl(30, 15%, 25%)",
          }}
        >
          Presentes Hoje
        </span>
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        <span
          className="font-extrabold"
          style={{
            fontSize: "1.5rem",
            color: "hsl(30, 15%, 20%)",
          }}
        >
          {present}
        </span>
        <span
          style={{
            fontSize: "0.85rem",
            color: "hsl(30, 10%, 50%)",
          }}
        >
          | {percentage}%
        </span>
        <ClipboardCheck
          className="ml-auto"
          style={{
            width: 22,
            height: 22,
            color: "hsl(30, 15%, 60%)",
          }}
        />
      </div>
    </div>
  );
}
