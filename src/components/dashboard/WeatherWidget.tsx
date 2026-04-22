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

  const code = weather?.weatherCode ?? 3;
  const isRainy =
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    code >= 95;
  const isSunny = code === 0 || code === 1 || code === 2;

  const cardClass =
    "relative rounded-2xl p-5 h-full overflow-hidden shadow-lg transition-transform hover:scale-[1.01]";
  const sunnyBg =
    "linear-gradient(160deg, hsl(200, 90%, 88%) 0%, hsl(195, 85%, 78%) 55%, hsl(200, 80%, 70%) 100%)";
  const rainyBg =
    "linear-gradient(155deg, hsl(225, 60%, 18%) 0%, hsl(232, 55%, 24%) 55%, hsl(220, 50%, 32%) 100%)";
  const cardStyle: React.CSSProperties = {
    background: isSunny ? sunnyBg : rainyBg,
    color: isSunny ? "hsl(220, 40%, 18%)" : "white",
  };
  const textMuted = isSunny ? "text-slate-700/80" : "text-white/80";

  if (error) {
    return (
      <div className={cardClass} style={cardStyle}>
        <Cloud className="h-8 w-8 mx-auto mb-2" />
        <p className={`text-sm text-center ${textMuted}`}>{error}</p>
        <Button variant="ghost" size="sm" className={`mt-2 w-full ${textMuted}`} onClick={fetchWeather}>
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
      {!isSunny && (
        <div
          className="pointer-events-none absolute -bottom-6 -right-6 h-32 w-32 rounded-full opacity-20 blur-2xl"
          style={{ background: "radial-gradient(circle, hsl(220, 60%, 70%), transparent 70%)" }}
        />
      )}

      {isSunny && (
        <>
          <div className="pointer-events-none absolute -top-10 -right-10 z-0">
            <div className="weather-sun" />
          </div>
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="weather-sun-cloud weather-sun-cloud-1" />
            <div className="weather-sun-cloud weather-sun-cloud-2" />
          </div>
        </>
      )}

      {isRainy && (
        <>
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="weather-cloud weather-cloud-1" />
            <div className="weather-cloud weather-cloud-2" />
            <div className="weather-cloud weather-cloud-3" />
          </div>
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 18 }).map((_, i) => (
              <span
                key={i}
                className="weather-raindrop"
                style={{
                  left: `${(i * 5.7) % 100}%`,
                  animationDelay: `${(i * 0.17) % 2}s`,
                  animationDuration: `${0.7 + ((i * 0.13) % 0.8)}s`,
                }}
              />
            ))}
          </div>
        </>
      )}

      <div className="relative z-10">
        <div className={`flex items-center gap-1.5 text-[11px] mb-3 ${textMuted}`}>
          <MapPin className="h-3 w-3" />
          <span className="truncate">{weather.locationName}</span>
        </div>

        <div className="flex items-start justify-between mb-1">
          <span className="text-5xl font-extrabold tracking-tight leading-none">
            {weather.temperature}°
          </span>
          {!isSunny && getWeatherIcon(weather.weatherCode)}
          {isSunny && <Sun className="h-8 w-8 text-amber-500 drop-shadow-sm animate-spin-slow" />}
        </div>
        <p className={`text-sm font-medium mb-4 ${textMuted}`}>{description}</p>

        <div className={`space-y-1.5 text-xs border-t pt-3 ${textMuted} ${isSunny ? "border-slate-900/10" : "border-white/10"}`}>
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
