import { useEffect, useState, useCallback } from "react";
import { Cloud, CloudRain, Sun, CloudSun, CloudSnow, CloudLightning, Droplets, Wind, Thermometer, MapPin, RefreshCw } from "lucide-react";
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
  const cls = "h-7 w-7";
  if (code === 0 || code === 1) return <Sun className={`${cls} text-yellow-400`} />;
  if (code === 2) return <CloudSun className={`${cls} text-amber-300`} />;
  if (code === 3 || code === 45 || code === 48) return <Cloud className={`${cls}`} style={{ color: "hsl(30, 10%, 55%)" }} />;
  if (code >= 51 && code <= 67) return <CloudRain className={`${cls} text-blue-400`} />;
  if (code >= 71 && code <= 77) return <CloudSnow className={`${cls} text-blue-200`} />;
  if (code >= 80 && code <= 82) return <CloudRain className={`${cls} text-blue-500`} />;
  if (code >= 95) return <CloudLightning className={`${cls} text-yellow-500`} />;
  return <Cloud className={`${cls}`} style={{ color: "hsl(30, 10%, 55%)" }} />;
};

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  

  const fetchWeather = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const latitude = -1.5189;
      const longitude = -48.6356;
      const locationName = "Barcarena - Vila dos Cabanos";

      const baseUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&timezone=America/Sao_Paulo`;
      
      const urls = [
        baseUrl,
        `https://corsproxy.io/?${encodeURIComponent(baseUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(baseUrl)}`,
      ];

      let data: any = null;
      for (const url of urls) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeout);
          if (res.ok) {
            data = await res.json();
            break;
          }
        } catch {
          // try next proxy
        }
      }

      if (!data?.current) throw new Error("No data");

      setWeather({
        temperature: Math.round(data.current.temperature_2m),
        apparentTemp: Math.round(data.current.apparent_temperature),
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m),
        weatherCode: data.current.weather_code,
        isDay: data.current.is_day === 1,
        locationName,
        lastUpdated: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      });
    } catch {
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

  const cardStyle = {
    background: "linear-gradient(145deg, hsl(220, 15%, 22%), hsl(220, 18%, 16%))",
    boxShadow: "6px 6px 14px hsl(30, 10%, 78%), -6px -6px 14px hsl(30, 20%, 98%)",
    border: "1px solid hsl(30, 15%, 85%)",
  };

  if (error) {
    return (
      <div className="rounded-2xl p-4 text-center" style={cardStyle}>
        <Cloud className="h-8 w-8 mx-auto mb-2" style={{ color: "hsl(30, 10%, 60%)" }} />
        <p className="text-sm" style={{ color: "hsl(0, 0%, 70%)" }}>{error}</p>
        <Button variant="ghost" size="sm" className="mt-2 text-white/70 hover:text-white" onClick={fetchWeather}>
          <RefreshCw className="h-3 w-3 mr-1" /> Tentar novamente
        </Button>
      </div>
    );
  }

  if (loading || !weather) {
    return (
      <div className="rounded-2xl p-4" style={cardStyle}>
        <Skeleton className="h-10 w-20 bg-white/10" />
        <Skeleton className="h-5 w-32 mt-2 bg-white/10" />
      </div>
    );
  }

  const description = WMO_DESCRIPTIONS[weather.weatherCode] || "Indisponível";

  return (
    <div className="rounded-2xl p-4 animate-fade-in" style={cardStyle}>
      <div className="flex items-center gap-1.5 text-xs mb-2" style={{ color: "hsl(0, 0%, 65%)" }}>
        <MapPin className="h-3 w-3" />
        <span>{weather.locationName}</span>
      </div>

      <div className="flex items-end gap-2 mb-1">
        <span className="text-4xl font-extrabold tracking-tight text-white">{weather.temperature}°</span>
        {getWeatherIcon(weather.weatherCode)}
      </div>
      <p className="text-sm font-medium mb-3" style={{ color: "hsl(0, 0%, 70%)" }}>{description}</p>

      <div className="space-y-1 text-xs" style={{ color: "hsl(0, 0%, 75%)" }}>
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
  );
}
