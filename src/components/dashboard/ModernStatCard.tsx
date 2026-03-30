// @ts-nocheck
import { LucideIcon } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";

type ChartVariant = "gauge" | "sparkline" | "bars" | "circular";

interface ModernStatCardProps {
  title: string;
  value: string | number;
  percentage?: number;
  icon: LucideIcon;
  variant: ChartVariant;
  color?: string;
  accentColor?: string;
  sparklineData?: number[];
  barData?: number[];
  bgTint?: string;
}

const GaugeChart = ({ percentage, color }: { percentage: number; color: string }) => {
  const data = [
    { value: percentage },
    { value: 100 - percentage },
  ];
  return (
    <div className="relative w-16 h-16">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            startAngle={180}
            endAngle={0}
            innerRadius={20}
            outerRadius={30}
            paddingAngle={0}
            dataKey="value"
            strokeWidth={0}
          >
            <Cell fill={color} />
            <Cell fill="hsl(30, 10%, 82%)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

const SparklineChart = ({ data, color }: { data: number[]; color: string }) => {
  const chartData = data.map((v, i) => ({ v, i }));
  return (
    <div className="w-20 h-12">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            fill={color}
            fillOpacity={0.15}
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const MiniBarChart = ({ data, color }: { data: number[]; color: string }) => {
  const chartData = data.map((v, i) => ({ v, i }));
  return (
    <div className="w-20 h-12">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Bar dataKey="v" fill={color} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const CircularChart = ({ percentage, color }: { percentage: number; color: string }) => {
  const radius = 30;
  const stroke = 5;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="hsl(30, 10%, 80%)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="url(#copperMini)"
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
          <linearGradient id="copperMini" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(25, 55%, 55%)" />
            <stop offset="50%" stopColor="hsl(30, 65%, 65%)" />
            <stop offset="100%" stopColor="hsl(20, 50%, 45%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold" style={{ color: "hsl(30, 15%, 35%)" }}>
          {percentage}%
        </span>
      </div>
    </div>
  );
};

const ModernStatCard = ({
  title,
  value,
  percentage = 0,
  icon: Icon,
  variant,
  color = "hsl(174, 62%, 47%)",
  accentColor,
  sparklineData = [4, 7, 5, 8, 6, 9, 7],
  barData = [3, 7, 5, 9, 4, 8, 6],
  bgTint,
}: ModernStatCardProps) => {
  return (
    <div
      className="group relative rounded-2xl p-5 overflow-hidden transition-transform hover:scale-[1.02]"
      style={{
        background: bgTint || "linear-gradient(145deg, hsl(30, 15%, 94%), hsl(30, 10%, 88%))",
        boxShadow:
          "6px 6px 14px hsl(30, 10%, 78%), -6px -6px 14px hsl(30, 20%, 98%), inset 0 1px 0 hsl(30, 20%, 96%)",
        border: "1px solid hsl(30, 15%, 85%)",
      }}
    >
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-medium truncate"
            style={{ color: "hsl(30, 10%, 45%)" }}
          >
            {title}
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className="text-2xl font-bold"
              style={{ color: "hsl(30, 15%, 18%)" }}
            >
              {value}
            </span>
            {percentage > 0 && variant !== "circular" && (
              <span
                className="text-xs font-semibold"
                style={{ color: "hsl(30, 20%, 45%)" }}
              >
                {percentage}%
              </span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 ml-3">
          {variant === "gauge" && <GaugeChart percentage={percentage} color="hsl(30, 50%, 55%)" />}
          {variant === "sparkline" && <SparklineChart data={sparklineData} color="hsl(30, 40%, 50%)" />}
          {variant === "bars" && <MiniBarChart data={barData} color={accentColor || "hsl(30, 50%, 55%)"} />}
          {variant === "circular" && <CircularChart percentage={percentage} color="hsl(30, 50%, 55%)" />}
        </div>
      </div>

      {/* Bottom icon accent */}
      <div className="absolute bottom-2 right-3 opacity-10">
        <Icon className="w-8 h-8" style={{ color: "hsl(30, 30%, 50%)" }} />
      </div>
    </div>
  );
};

export default ModernStatCard;
