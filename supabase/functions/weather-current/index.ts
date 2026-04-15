import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOCATION_NAME = "Barcarena - Vila dos Cabanos";
const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=-1.5189&longitude=-48.6356&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&timezone=America/Sao_Paulo";

async function fetchWithTimeout(url: string, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const response = await fetchWithTimeout(WEATHER_URL);

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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("weather-current error:", error);

    return new Response(JSON.stringify({ error: "Erro ao obter previsão" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});