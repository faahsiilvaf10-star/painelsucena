import { ClipboardCheck } from "lucide-react";

interface PresenceGaugeProps {
  present: number;
  total: number;
  percentage: number;
}

export function PresenceGauge({ present, total, percentage }: PresenceGaugeProps) {
  const svgSize = 180;
  const stroke = 12;
  const radius = (svgSize - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const gap = circumference * 0.15; // 15% gap at the bottom
  const usableArc = circumference - gap;
  const filledArc = (percentage / 100) * usableArc;
  // Rotate so gap is at bottom center: start from ~210deg
  const startAngle = 150;

  return (
    <div
      className="relative flex flex-col items-center justify-center rounded-2xl p-6 h-full"
      style={{
        background: "linear-gradient(145deg, hsl(30, 15%, 94%), hsl(30, 10%, 88%))",
        boxShadow:
          "6px 6px 14px hsl(30, 10%, 78%), -6px -6px 14px hsl(30, 20%, 98%), inset 0 1px 0 hsl(30, 20%, 96%)",
        border: "1px solid hsl(30, 15%, 85%)",
      }}
    >
      {/* SVG Ring */}
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg height={svgSize} width={svgSize} className="drop-shadow-sm">
          {/* Background arc */}
          <circle
            stroke="hsl(30, 10%, 84%)"
            fill="transparent"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${usableArc} ${gap}`}
            r={radius}
            cx={svgSize / 2}
            cy={svgSize / 2}
            style={{
              transform: `rotate(${startAngle}deg)`,
              transformOrigin: "50% 50%",
            }}
          />
          {/* Copper progress arc */}
          <circle
            stroke="url(#copperGaugeGrad)"
            fill="transparent"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${filledArc} ${circumference - filledArc}`}
            r={radius}
            cx={svgSize / 2}
            cy={svgSize / 2}
            style={{
              transform: `rotate(${startAngle}deg)`,
              transformOrigin: "50% 50%",
              transition: "stroke-dasharray 1s ease-out",
            }}
          />
          <defs>
            <linearGradient id="copperGaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(25, 60%, 55%)" />
              <stop offset="50%" stopColor="hsl(30, 70%, 65%)" />
              <stop offset="100%" stopColor="hsl(20, 55%, 48%)" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center content inside ring */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="uppercase tracking-[0.2em] font-semibold"
            style={{
              fontSize: "0.6rem",
              color: "hsl(30, 15%, 50%)",
            }}
          >
            Presença
          </span>
          <div className="flex items-baseline gap-1">
            <span
              className="font-extrabold leading-none"
              style={{
                fontSize: "2.2rem",
                color: "hsl(30, 15%, 18%)",
              }}
            >
              {present}
            </span>
            <span
              style={{
                fontSize: "0.9rem",
                color: "hsl(30, 10%, 55%)",
                fontWeight: 500,
              }}
            >
              | {percentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Bottom label */}
      <div className="mt-3 text-center">
        <span
          className="font-medium block"
          style={{
            fontSize: "0.85rem",
            color: "hsl(30, 10%, 45%)",
          }}
        >
          Presentes Hoje
        </span>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span
            className="font-extrabold"
            style={{
              fontSize: "1.4rem",
              color: "hsl(30, 15%, 18%)",
            }}
          >
            {present}
          </span>
          <span
            style={{
              fontSize: "0.85rem",
              color: "hsl(30, 10%, 55%)",
            }}
          >
            | {percentage}%
          </span>
          <ClipboardCheck
            style={{
              width: 18,
              height: 18,
              color: "hsl(30, 10%, 60%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
