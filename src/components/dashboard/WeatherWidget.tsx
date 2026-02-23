import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Cloud, CloudRain, Sun, CloudSun, CloudSnow, CloudLightning, Droplets, Wind, Thermometer, MapPin, RefreshCw, Eye } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface WeatherData {
  temperature: number;
  apparentTemp: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  isDay: boolean;
  precipitation: number;
  daily: {
    tempMax: number[];
    tempMin: number[];
    weatherCode: number[];
    date: string[];
    precipitationProbMax: number[];
  };
  hourly: {
    time: string[];
    temperature: number[];
    weatherCode: number[];
    precipitationProbability: number[];
    windSpeed: number[];
  };
  locationName: string;
  currentTime: string;
}

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: "Céu limpo", 1: "Parcialmente limpo", 2: "Parcialmente nublado", 3: "Nublado",
  45: "Neblina", 48: "Neblina com geada",
  51: "Garoa leve", 53: "Garoa moderada", 55: "Garoa forte",
  61: "Chuva leve", 63: "Chuva moderada", 65: "Chuva forte",
  71: "Neve leve", 73: "Neve moderada", 75: "Neve forte",
  80: "Pancadas leves", 81: "Pancadas moderadas", 82: "Pancadas fortes",
  95: "Tempestade", 96: "Tempestade c/ granizo", 99: "Tempestade severa",
};

const getWeatherIcon = (code: number, size: "lg" | "md" | "sm" = "md") => {
  const sizeMap = { lg: "h-14 w-14", md: "h-7 w-7", sm: "h-5 w-5" };
  const cls = sizeMap[size];
  if (code === 0 || code === 1) return <Sun className={`${cls} text-yellow-400`} />;
  if (code === 2) return <CloudSun className={`${cls} text-amber-300`} />;
  if (code === 3 || code === 45 || code === 48) return <Cloud className={`${cls} text-muted-foreground`} />;
  if (code >= 51 && code <= 67) return <CloudRain className={`${cls} text-blue-400`} />;
  if (code >= 71 && code <= 77) return <CloudSnow className={`${cls} text-blue-200`} />;
  if (code >= 80 && code <= 82) return <CloudRain className={`${cls} text-blue-500`} />;
  if (code >= 95) return <CloudLightning className={`${cls} text-yellow-500`} />;
  return <Cloud className={`${cls} text-muted-foreground`} />;
};

const WEEKDAYS_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type TabType = "temperature" | "precipitation" | "wind";

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("temperature");
  const isMobile = useIsMobile();

  const fetchWeather = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let latitude: number;
      let longitude: number;
      let locationName = "Barcarena, Pará";

      if (isMobile) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=pt-BR`);
          const geoData = await geoRes.json();
          const city = geoData.address?.city || geoData.address?.town || geoData.address?.village || geoData.address?.county;
          const state = geoData.address?.state;
          if (city) locationName = state ? `${city}, ${state}` : city;
        } catch {}
      } else {
        latitude = -1.5138;
        longitude = -48.6253;
      }

      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m&timezone=America/Sao_Paulo&forecast_days=7`
      );
      const data = await res.json();

      const now = new Date();
      const dayName = WEEKDAYS_FULL[now.getDay()];
      const hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const period = hours >= 12 ? "PM" : "AM";
      const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
      const currentTime = `${dayName} ${displayHour}:${minutes} ${period}`;

      setWeather({
        temperature: Math.round(data.current.temperature_2m),
        apparentTemp: Math.round(data.current.apparent_temperature),
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m),
        weatherCode: data.current.weather_code,
        isDay: data.current.is_day === 1,
        precipitation: data.current.precipitation ?? 0,
        daily: {
          tempMax: data.daily.temperature_2m_max.map((t: number) => Math.round(t)),
          tempMin: data.daily.temperature_2m_min.map((t: number) => Math.round(t)),
          weatherCode: data.daily.weather_code,
          date: data.daily.time,
          precipitationProbMax: data.daily.precipitation_probability_max ?? [],
        },
        hourly: {
          time: data.hourly.time,
          temperature: data.hourly.temperature_2m.map((t: number) => Math.round(t)),
          weatherCode: data.hourly.weather_code,
          precipitationProbability: data.hourly.precipitation_probability ?? [],
          windSpeed: data.hourly.wind_speed_10m?.map((w: number) => Math.round(w)) ?? [],
        },
        locationName,
        currentTime,
      });
    } catch (err: any) {
      if (err?.code === 1) {
        setError("Permissão de localização negada");
      } else {
        setError("Erro ao obter previsão");
      }
    } finally {
      setLoading(false);
    }
  }, [isMobile]);

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  if (error) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-4 text-center">
          <Cloud className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={fetchWeather}>
            <RefreshCw className="h-3 w-3 mr-1" /> Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading || !weather) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-14 w-24" />
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map(i => <Skeleton key={i} className="h-20 flex-1" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const description = WMO_DESCRIPTIONS[weather.weatherCode] || "Indisponível";

  // Rain alert for working hours
  const now = new Date();
  const todayStr = weather.daily.date[0];
  const workHourAlerts = weather.hourly.time
    .map((t, i) => ({ time: t, hour: new Date(t).getHours(), prob: weather.hourly.precipitationProbability[i] }))
    .filter(h => h.time.startsWith(todayStr) && h.hour >= 7 && h.hour <= 17 && h.prob >= 75);

  // Hourly chart data - next 24 hours from now
  const currentHourIndex = weather.hourly.time.findIndex(t => new Date(t) >= now);
  const chartStartIdx = Math.max(0, currentHourIndex - 1);
  const chartHours = weather.hourly.time.slice(chartStartIdx, chartStartIdx + 24);
  const chartTemps = weather.hourly.temperature.slice(chartStartIdx, chartStartIdx + 24);
  const chartPrecip = weather.hourly.precipitationProbability.slice(chartStartIdx, chartStartIdx + 24);
  const chartWind = weather.hourly.windSpeed.slice(chartStartIdx, chartStartIdx + 24);

  // Render mini chart
  const renderChart = () => {
    let values: number[];
    let unit: string;
    let color: string;

    if (activeTab === "temperature") {
      values = chartTemps;
      unit = "°";
      color = "hsl(var(--primary))";
    } else if (activeTab === "precipitation") {
      values = chartPrecip;
      unit = "%";
      color = "#60a5fa";
    } else {
      values = chartWind;
      unit = "";
      color = "#a78bfa";
    }

    if (!values.length) return null;

    const maxVal = Math.max(...values, 1);
    const minVal = Math.min(...values, 0);
    const range = maxVal - minVal || 1;
    const height = 60;
    const width = values.length * 28;

    const points = values.map((v, i) => {
      const x = (i / (values.length - 1)) * (width - 10) + 5;
      const y = height - ((v - minVal) / range) * (height - 20) - 10;
      return { x, y, v };
    });

    const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    // Show labels every ~3 hours
    const labelInterval = Math.max(1, Math.floor(values.length / 8));

    return (
      <div className="overflow-x-auto scrollbar-none pb-1">
        <div style={{ minWidth: `${width}px` }}>
          <svg viewBox={`0 0 ${width} ${height + 18}`} className="w-full" style={{ minWidth: `${width}px` }}>
            <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="2" fill={color} />
            ))}
            {points.filter((_, i) => i % labelInterval === 0).map((p, idx) => {
              const realIdx = idx * labelInterval;
              const hour = new Date(chartHours[realIdx]).getHours();
              return (
                <g key={realIdx}>
                  <text x={p.x} y={p.y - 6} textAnchor="middle" className="fill-foreground text-[8px] font-semibold">
                    {p.v}{unit}
                  </text>
                  <text x={p.x} y={height + 14} textAnchor="middle" className="fill-muted-foreground text-[7px]">
                    {hour === 0 || hour === 12 ? `${hour === 0 ? "12 AM" : "12 PM"}` : `${hour > 12 ? hour - 12 : hour} ${hour >= 12 ? "PM" : "AM"}`}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden animate-fade-in">
      <CardContent className="p-4 sm:p-5">
        {/* Rain alert */}
        {workHourAlerts.length > 0 && (
          <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2.5 mb-3 text-sm animate-pulse shadow-lg shadow-destructive/5">
            <CloudLightning className="h-5 w-5 text-destructive shrink-0 animate-bounce" />
            <span className="text-foreground">
              <strong className="text-destructive">⚠️ Alerta de chuva!</strong>{" "}
              {workHourAlerts.map(h => `${String(h.hour).padStart(2, "0")}h (${h.prob}%)`).join(", ")}
            </span>
          </div>
        )}

        {/* Google-style header: location on right, temp + icon on left */}
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-3">
            {getWeatherIcon(weather.weatherCode, "lg")}
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl sm:text-6xl font-light tracking-tight text-foreground">
                  {weather.temperature}°<span className="text-lg text-muted-foreground">C</span>
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-foreground flex items-center gap-1 justify-end">
              <span>Precipitação: {weather.precipitation > 0 ? `${weather.precipitation} mm` : `${weather.daily.precipitationProbMax[0] ?? 0}%`}</span>
            </div>
            <div className="text-sm text-foreground">Umidade: {weather.humidity}%</div>
            <div className="text-sm text-foreground">Vento: {weather.windSpeed} km/h</div>
          </div>
        </div>

        {/* Description + time */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{weather.locationName}</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{description}</p>
            <p className="text-xs text-muted-foreground">{weather.currentTime}</p>
          </div>
        </div>

        {/* Tabs: Temperature | Precipitation | Wind */}
        <div className="flex gap-0 border-b border-border/50 mb-3">
          {([
            { key: "temperature" as TabType, label: "Temperatura" },
            { key: "precipitation" as TabType, label: "Precipitação" },
            { key: "wind" as TabType, label: "Vento" },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 text-xs sm:text-sm font-medium transition-colors relative ${
                activeTab === tab.key
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="mb-4">
          {renderChart()}
        </div>

        {/* 7-day forecast */}
        <div className="grid grid-cols-7 gap-1 border-t border-border/40 pt-3">
          {weather.daily.date.map((dateStr, i) => {
            const d = new Date(dateStr + "T12:00:00");
            const dayLabel = i === 0 ? "Hoje" : (isMobile ? WEEKDAYS_SHORT[d.getDay()] : WEEKDAYS_SHORT[d.getDay()]);
            return (
              <div key={dateStr} className="text-center space-y-1 rounded-xl py-2 hover:bg-muted/40 transition-colors">
                <p className="text-xs font-semibold text-foreground">{dayLabel}</p>
                <div className="flex justify-center my-0.5">{getWeatherIcon(weather.daily.weatherCode[i], "sm")}</div>
                <p className="text-xs">
                  <span className="font-bold text-foreground">{weather.daily.tempMax[i]}°</span>
                  {" "}
                  <span className="text-muted-foreground">{weather.daily.tempMin[i]}°</span>
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
