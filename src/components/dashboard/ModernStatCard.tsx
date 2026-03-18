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
            <Cell fill="hsl(var(--muted))" />
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
            innerRadius={22}
            outerRadius={30}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            <Cell fill={color} />
            <Cell fill="hsl(var(--muted))" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold" style={{ color }}>{percentage}%</span>
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
}: ModernStatCardProps) => {
  return (
    <div className="group relative bg-card rounded-2xl p-5 hover-lift border border-border/50 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground font-medium truncate">{title}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold">{value}</span>
            {percentage > 0 && variant !== "circular" && (
              <span className="text-xs font-semibold" style={{ color }}>
                {percentage}%
              </span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 ml-3">
          {variant === "gauge" && <GaugeChart percentage={percentage} color={color} />}
          {variant === "sparkline" && <SparklineChart data={sparklineData} color={color} />}
          {variant === "bars" && <MiniBarChart data={barData} color={accentColor || color} />}
          {variant === "circular" && <CircularChart percentage={percentage} color={color} />}
        </div>
      </div>

      {/* Bottom icon accent */}
      <div className="absolute bottom-2 right-3 opacity-10">
        <Icon className="w-8 h-8" style={{ color }} />
      </div>
    </div>
  );
};

export default ModernStatCard;
