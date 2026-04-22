import { useEffect, useState, useCallback } from "react";
import { Cloud, CloudRain, Sun, CloudSun, CloudSnow, CloudLightning, Droplets, Wind, Thermometer, MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface WeatherData {
  temperature: number;
  apparentTemp: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  isDay: boolean;
  locationName: string;
  lastUpdated: string;
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

const getWeatherIcon = (code: number) => {
  const cls = "h-10 w-10";
  if (code === 0 || code === 1) return <Sun className={`${cls} text-yellow-300`} />;
  if (code === 2) return <CloudSun className={`${cls} text-amber-300`} />;
  if (code === 3 || code === 45 || code === 48) return <Cloud className={`${cls} text-slate-300`} />;
  if (code >= 51 && code <= 67) return <CloudRain className={`${cls} text-sky-300`} />;
  if (code >= 71 && code <= 77) return <CloudSnow className={`${cls} text-blue-200`} />;
  if (code >= 80 && code <= 82) return <CloudRain className={`${cls} text-sky-400`} />;
  if (code >= 95) return <CloudLightning className={`${cls} text-yellow-400`} />;
  return <Cloud className={`${cls} text-slate-300`} />;
};

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: functionError } = await supabase.functions.invoke("weather-current");
      if (functionError) throw functionError;
      if (!data?.current) throw new Error(data?.error || "No data");

      setWeather({
        temperature: Math.round(data.current.temperature_2m),
        apparentTemp: Math.round(data.current.apparent_temperature),
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m),
        weatherCode: data.current.weather_code,
        isDay: data.current.is_day === 1,
        locationName: data.locationName || "Barcarena - Vila dos Cabanos",
        lastUpdated: new Date(data.fetchedAt || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      });
    } catch (err) {
      console.error("Erro ao obter previsão:", err);
      setError("Erro ao obter previsão");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  // Deep night-blue gradient with subtle cloud overlay (matches reference)
  const cardClass =
    "relative rounded-2xl p-5 h-full overflow-hidden text-white shadow-lg transition-transform hover:scale-[1.01]";
  const cardStyle: React.CSSProperties = {
    background:
      "linear-gradient(155deg, hsl(225, 60%, 18%) 0%, hsl(232, 55%, 24%) 55%, hsl(220, 50%, 32%) 100%)",
  };

  if (error) {
    return (
      <div className={cardClass} style={cardStyle}>
        <Cloud className="h-8 w-8 mx-auto mb-2 text-slate-300" />
        <p className="text-sm text-white/70 text-center">{error}</p>
        <Button variant="ghost" size="sm" className="mt-2 text-white/80 hover:text-white w-full" onClick={fetchWeather}>
          <RefreshCw className="h-3 w-3 mr-1" /> Tentar novamente
        </Button>
      </div>
    );
  }

  if (loading || !weather) {
    return (
      <div className={cardClass} style={cardStyle}>
        <Skeleton className="h-10 w-20 bg-white/10" />
        <Skeleton className="h-5 w-32 mt-2 bg-white/10" />
      </div>
    );
  }

  const description = WMO_DESCRIPTIONS[weather.weatherCode] || "Indisponível";

  return (
    <div className={cardClass} style={cardStyle}>
      {/* Subtle cloud silhouette decoration */}
      <div
        className="pointer-events-none absolute -bottom-6 -right-6 h-32 w-32 rounded-full opacity-20 blur-2xl"
        style={{ background: "radial-gradient(circle, hsl(220, 60%, 70%), transparent 70%)" }}
      />

      <div className="relative z-10">
        <div className="flex items-center gap-1.5 text-[11px] mb-3 text-white/80">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{weather.locationName}</span>
        </div>

        <div className="flex items-start justify-between mb-1">
          <span className="text-5xl font-extrabold tracking-tight leading-none">
            {weather.temperature}°
          </span>
          {getWeatherIcon(weather.weatherCode)}
        </div>
        <p className="text-sm font-medium mb-4 text-white/85">{description}</p>

        <div className="space-y-1.5 text-xs text-white/80 border-t border-white/10 pt-3">
          <div className="flex items-center gap-1.5">
            <Thermometer className="h-3.5 w-3.5" />
            <span>Sensação {weather.apparentTemp}°</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Droplets className="h-3.5 w-3.5" />
            <span>Umidade {weather.humidity}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wind className="h-3.5 w-3.5" />
            <span>Vento {weather.windSpeed} km/h</span>
          </div>
        </div>
      </div>
    </div>
  );
}
