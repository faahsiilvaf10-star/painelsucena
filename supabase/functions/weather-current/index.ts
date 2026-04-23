import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-environment, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const LOCATION_NAME = "Barcarena - Vila dos Cabanos";

// Multiple endpoints for fallback (Open-Meteo has several mirrors)
const WEATHER_URLS = [
  "https://api.open-meteo.com/v1/forecast?latitude=-1.5189&longitude=-48.6356&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&timezone=America/Sao_Paulo",
  "https://api.open-meteo.com/v1/forecast?latitude=-1.5189&longitude=-48.6356&current_weather=true&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=America/Sao_Paulo",
];

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  let lastError: Error | null = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; SucenaPainel/1.0)" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status}`);
      // Wait briefly before retrying on 5xx
      if (response.status >= 500 && i < retries) {
        await new Promise((r) => setTimeout(r, 500 * (i + 1)));
        continue;
      }
      return response;
    } catch (err) {
      lastError = err as Error;
      if (i < retries) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastError ?? new Error("fetch failed");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Try each endpoint with retries
  for (const url of WEATHER_URLS) {
    try {
      const response = await fetchWithRetry(url, 2);
      if (!response.ok) continue;

      const data = await response.json();

      // Normalize: support both `current` and legacy `current_weather` shapes
      let current = data?.current;
      if (!current && data?.current_weather) {
        const cw = data.current_weather;
        const hourly = data.hourly ?? {};
        const idx = hourly.time?.indexOf?.(cw.time) ?? -1;
        current = {
          temperature_2m: cw.temperature,
          apparent_temperature: idx >= 0 ? hourly.apparent_temperature?.[idx] ?? cw.temperature : cw.temperature,
          relative_humidity_2m: idx >= 0 ? hourly.relative_humidity_2m?.[idx] ?? 0 : 0,
          wind_speed_10m: cw.windspeed,
          weather_code: cw.weathercode,
          is_day: cw.is_day,
        };
      }

      if (!current) continue;

      return new Response(
        JSON.stringify({
          current,
          fetchedAt: new Date().toISOString(),
          locationName: LOCATION_NAME,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (err) {
      console.warn(`weather-current: endpoint failed ${url}:`, String(err));
    }
  }

  // All endpoints failed → return graceful fallback (200 so frontend doesn't blank-screen)
  console.error("weather-current: all endpoints failed, returning fallback");
  return new Response(
    JSON.stringify({
      current: {
        temperature_2m: 28,
        apparent_temperature: 30,
        relative_humidity_2m: 75,
        wind_speed_10m: 8,
        weather_code: 2,
        is_day: 1,
      },
      fetchedAt: new Date().toISOString(),
      locationName: LOCATION_NAME,
      fallback: true,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
