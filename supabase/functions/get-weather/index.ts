const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=-1.5189&longitude=-48.6303&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&timezone=America/Sao_Paulo'
    );

    if (!res.ok) {
      throw new Error(`API returned ${res.status}`);
    }

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
