import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  if (code === 3 || code === 45 || code === 48) return <Cloud className={`${cls} text-muted-foreground`} />;
  if (code >= 51 && code <= 67) return <CloudRain className={`${cls} text-blue-400`} />;
  if (code >= 71 && code <= 77) return <CloudSnow className={`${cls} text-blue-200`} />;
  if (code >= 80 && code <= 82) return <CloudRain className={`${cls} text-blue-500`} />;
  if (code >= 95) return <CloudLightning className={`${cls} text-yellow-500`} />;
  return <Cloud className={`${cls} text-muted-foreground`} />;
};

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
        latitude = -1.5067;
        longitude = -48.6153;
      }

      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&timezone=America/Sao_Paulo&_=${Date.now()}`
      );
      const data = await res.json();

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
    } catch (err: any) {
      setError(err?.code === 1 ? "Permissão de localização negada" : "Erro ao obter previsão");
    } finally {
      setLoading(false);
    }
  }, [isMobile]);

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 2 * 60 * 1000);
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
        <CardContent className="p-4 flex items-center gap-4">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-5 w-40" />
        </CardContent>
      </Card>
    );
  }

  const description = WMO_DESCRIPTIONS[weather.weatherCode] || "Indisponível";

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden animate-fade-in">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Left: location + temp + description */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <MapPin className="h-3 w-3" />
              <span>{weather.locationName}</span>
              <span className="text-[10px] text-muted-foreground/60">• {weather.lastUpdated}</span>
              <Button variant="ghost" size="icon" className="h-5 w-5 ml-0.5" onClick={fetchWeather} title="Atualizar">
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-extrabold tracking-tight text-foreground">{weather.temperature}°</span>
              {getWeatherIcon(weather.weatherCode)}
            </div>
            <p className="text-sm font-medium text-muted-foreground">{description}</p>
          </div>

          {/* Right: details */}
          <div className="text-right space-y-1.5 text-xs bg-muted/40 rounded-xl px-3 py-2.5 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 justify-end">
              <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-foreground font-medium">Sensação {weather.apparentTemp}°</span>
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <Droplets className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-foreground font-medium">Umidade {weather.humidity}%</span>
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <Wind className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-foreground font-medium">Vento {weather.windSpeed} km/h</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
