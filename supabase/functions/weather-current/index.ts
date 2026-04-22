import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-environment, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const LOCATION_NAME = "Barcarena - Vila dos Cabanos";
const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=-1.5189&longitude=-48.6356&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&timezone=America/Sao_Paulo";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(WEATHER_URL, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Weather API ${response.status}: ${details.slice(0, 200)}`);
    }

    const data = await response.json();

    if (!data?.current) {
      throw new Error("Weather API returned no current data");
    }

    return new Response(
      JSON.stringify({
        current: data.current,
        fetchedAt: new Date().toISOString(),
        locationName: LOCATION_NAME,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("weather-current error:", error);

    return new Response(
      JSON.stringify({ error: "Erro ao obter previsão", details: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
