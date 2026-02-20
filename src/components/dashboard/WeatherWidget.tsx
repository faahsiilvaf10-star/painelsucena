import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Cloud, CloudRain, Sun, CloudSun, CloudSnow, CloudLightning, Droplets, Wind, Thermometer, MapPin, RefreshCw } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface HourlyData {
  time: string[];
  temperature: number[];
  weatherCode: number[];
  precipitationProbability: number[];
}

interface WeatherData {
  temperature: number;
  apparentTemp: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  isDay: boolean;
  daily: {
    tempMax: number[];
    tempMin: number[];
    weatherCode: number[];
    date: string[];
  };
  hourly: HourlyData;
  locationName: string;
}

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: "Céu limpo",
  1: "Parcialmente limpo",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Neblina",
  48: "Neblina com geada",
  51: "Garoa leve",
  53: "Garoa moderada",
  55: "Garoa forte",
  61: "Chuva leve",
  63: "Chuva moderada",
  65: "Chuva forte",
  71: "Neve leve",
  73: "Neve moderada",
  75: "Neve forte",
  80: "Pancadas leves",
  81: "Pancadas moderadas",
  82: "Pancadas fortes",
  95: "Tempestade",
  96: "Tempestade c/ granizo",
  99: "Tempestade severa",
};

const getWeatherIcon = (code: number, size = 24) => {
  const cls = `h-${size === 24 ? 6 : 4} w-${size === 24 ? 6 : 4}`;
  if (code === 0 || code === 1) return <Sun className={`${cls} text-yellow-400`} />;
  if (code === 2) return <CloudSun className={`${cls} text-amber-300`} />;
  if (code === 3 || code === 45 || code === 48) return <Cloud className={`${cls} text-muted-foreground`} />;
  if (code >= 51 && code <= 67) return <CloudRain className={`${cls} text-blue-400`} />;
  if (code >= 71 && code <= 77) return <CloudSnow className={`${cls} text-blue-200`} />;
  if (code >= 80 && code <= 82) return <CloudRain className={`${cls} text-blue-500`} />;
  if (code >= 95) return <CloudLightning className={`${cls} text-yellow-500`} />;
  return <Cloud className={`${cls} text-muted-foreground`} />;
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMobile = useIsMobile();

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);
    try {
      let latitude: number;
      let longitude: number;
      let locationName = "Barcarena, Pará";

      if (isMobile) {
        // Mobile: use geolocation
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;

        // Reverse geocode
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=pt-BR`);
          const geoData = await geoRes.json();
          const city = geoData.address?.city || geoData.address?.town || geoData.address?.village || geoData.address?.county;
          const state = geoData.address?.state;
          if (city) locationName = state ? `${city}, ${state}` : city;
        } catch {}
      } else {
        // Desktop: fixed location - Barcarena, Pará
        latitude = -1.5138;
        longitude = -48.6253;
      }

      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&hourly=temperature_2m,weather_code,precipitation_probability&timezone=America/Sao_Paulo&forecast_days=5`
      );
      const data = await res.json();

      // Filter hourly data to today only
      const todayStr = data.daily.time[0];
      const hourlyTime: string[] = data.hourly.time;
      const todayHourlyIndices = hourlyTime
        .map((t: string, i: number) => ({ t, i }))
        .filter(({ t }: { t: string }) => t.startsWith(todayStr));

      setWeather({
        temperature: Math.round(data.current.temperature_2m),
        apparentTemp: Math.round(data.current.apparent_temperature),
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m),
        weatherCode: data.current.weather_code,
        isDay: data.current.is_day === 1,
        daily: {
          tempMax: data.daily.temperature_2m_max.map((t: number) => Math.round(t)),
          tempMin: data.daily.temperature_2m_min.map((t: number) => Math.round(t)),
          weatherCode: data.daily.weather_code,
          date: data.daily.time,
        },
        hourly: {
          time: todayHourlyIndices.map(({ t }: { t: string }) => t),
          temperature: todayHourlyIndices.map(({ i }: { i: number }) => Math.round(data.hourly.temperature_2m[i])),
          weatherCode: todayHourlyIndices.map(({ i }: { i: number }) => data.hourly.weather_code[i]),
          precipitationProbability: todayHourlyIndices.map(({ i }: { i: number }) => data.hourly.precipitation_probability[i] ?? 0),
        },
        locationName,
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
  };

  useEffect(() => {
    fetchWeather();
  }, []);

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
          <Skeleton className="h-10 w-20" />
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 flex-1" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const description = WMO_DESCRIPTIONS[weather.weatherCode] || "Indisponível";

  // Filter hourly to working hours (07–17)
  const workHourIndices = weather.hourly.time
    .map((t, i) => ({ hour: new Date(t).getHours(), i }))
    .filter(({ hour }) => hour >= 7 && hour <= 17);

  const filteredHourly = {
    time: workHourIndices.map(({ i }) => weather.hourly.time[i]),
    temperature: workHourIndices.map(({ i }) => weather.hourly.temperature[i]),
    weatherCode: workHourIndices.map(({ i }) => weather.hourly.weatherCode[i]),
    precipitationProbability: workHourIndices.map(({ i }) => weather.hourly.precipitationProbability[i]),
  };

  const rainAlertHours = filteredHourly.time
    .map((t, i) => ({ hour: new Date(t).getHours(), prob: filteredHourly.precipitationProbability[i] }))
    .filter(h => h.prob >= 75);

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden animate-fade-in">
      <CardContent className="p-4">
        {/* Rain alert ≥75% - animated */}
        {rainAlertHours.length > 0 && (
          <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2.5 mb-3 text-sm animate-pulse shadow-lg shadow-destructive/5">
            <CloudLightning className="h-5 w-5 text-destructive shrink-0 animate-bounce" />
            <span className="text-foreground">
              <strong className="text-destructive">⚠️ Alerta de chuva!</strong>{" "}
              Probabilidade de chuva às {rainAlertHours.map(h => `${String(h.hour).padStart(2, "0")}h (${h.prob}%)`).join(", ")}
            </span>
          </div>
        )}

        {/* Current conditions */}
        <div className="flex items-start justify-between mb-4">
          <div className="animate-fade-in">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-[200px]">{weather.locationName}</span>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-extrabold tracking-tight bg-gradient-to-br from-amber-400 via-orange-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-sm">
                {weather.temperature}°
              </span>
              <div className="pb-1.5">{getWeatherIcon(weather.weatherCode)}</div>
            </div>
            <p className="text-sm font-medium bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">{description}</p>
          </div>
          <div className="text-right space-y-1.5 text-xs bg-muted/40 rounded-xl px-3 py-2.5 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 justify-end">
              <Thermometer className="h-3.5 w-3.5 text-orange-400 drop-shadow-sm" />
              <span className="text-orange-300 font-medium">Sensação {weather.apparentTemp}°</span>
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <Droplets className="h-3.5 w-3.5 text-sky-400 drop-shadow-sm" />
              <span className="text-sky-300 font-medium">Umidade {weather.humidity}%</span>
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <Wind className="h-3.5 w-3.5 text-teal-400 drop-shadow-sm" />
              <span className="text-teal-300 font-medium">Vento {weather.windSpeed} km/h</span>
            </div>
          </div>
        </div>

        {/* Hourly forecast */}
        <div className="border-t border-border/40 pt-3 mb-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2.5 uppercase tracking-wider">
            Previsão por hora — Hoje
          </p>
          <div className="flex gap-1 overflow-x-auto pb-1.5 scrollbar-none">
            {filteredHourly.time.map((timeStr, i) => {
              const hour = new Date(timeStr).getHours();
               const prob = filteredHourly.precipitationProbability[i];
              const isHighRain = prob >= 75;
              const isMedRain = prob >= 50 && prob < 75;
              return (
                <div
                  key={timeStr}
                  className={`flex flex-col items-center min-w-[44px] gap-0.5 rounded-xl py-1.5 px-1 transition-all duration-300 ${
                    isHighRain
                      ? "bg-destructive/10 border border-destructive/20"
                      : isMedRain
                        ? "bg-primary/8 border border-primary/15"
                        : "hover:bg-muted/50"
                  }`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <p className="text-[10px] font-semibold text-sky-300">{String(hour).padStart(2, "0")}h</p>
                  <div className="flex justify-center my-0.5">{getWeatherIcon(filteredHourly.weatherCode[i], 16)}</div>
                  <p className="text-xs font-bold text-amber-300">{filteredHourly.temperature[i]}°</p>
                  <p className={`text-[10px] flex items-center gap-0.5 font-semibold ${
                    isHighRain ? "text-destructive" : isMedRain ? "text-primary" : "text-sky-400"
                  }`}>
                    <Droplets className="h-2.5 w-2.5" />{prob}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5-day forecast */}
        <div className="grid grid-cols-5 gap-1.5 border-t border-border/40 pt-3">
          {weather.daily.date.map((dateStr, i) => {
            const d = new Date(dateStr + "T12:00:00");
            const dayLabel = i === 0 ? "Hoje" : WEEKDAYS[d.getDay()];
            return (
              <div
                key={dateStr}
                className="text-center space-y-1 rounded-xl py-2 hover:bg-muted/40 transition-colors duration-200"
              >
                <p className="text-xs font-semibold text-sky-300">{dayLabel}</p>
                <div className="flex justify-center my-0.5">{getWeatherIcon(weather.daily.weatherCode[i], 16)}</div>
                <p className="text-xs">
                  <span className="font-bold text-amber-300">{weather.daily.tempMax[i]}°</span>
                  <span className="text-sky-400/70 ml-0.5">{weather.daily.tempMin[i]}°</span>
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
