import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, slideCount, includeSystemData, dataContext } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context from system data if requested
    let systemContext = "";
    if (includeSystemData && dataContext) {
      systemContext = `\n\nDados do sistema disponíveis para usar nos slides:\n${JSON.stringify(dataContext, null, 2)}`;
    }

    const numSlides = slideCount || 6;

    const systemPrompt = `Você é um gerador de apresentações profissionais. Crie exatamente ${numSlides} slides em formato JSON.

REGRAS:
- Cada slide deve ter: title (título curto), content (texto principal em markdown, máx 3 parágrafos curtos), notes (notas do apresentador), layout (um de: "title", "content", "two-column", "image", "quote", "stats")
- O primeiro slide deve ser layout "title" com título da apresentação
- O último slide deve ser um slide de encerramento/agradecimento
- Use dados reais do sistema quando fornecidos
- Conteúdo deve ser profissional, direto e informativo
- Para layout "stats", adicione um campo "stats" com array de objetos {label, value}
- Para layout "quote", adicione um campo "quote" com {text, author}
- Responda APENAS com o JSON array, sem texto extra

Formato de saída:
[
  {
    "title": "string",
    "content": "string (markdown)",
    "notes": "string",
    "layout": "title|content|two-column|image|quote|stats",
    "stats": [{"label": "string", "value": "string"}],
    "quote": {"text": "string", "author": "string"}
  }
]`;

    console.log("Generating slides for prompt:", prompt.substring(0, 100));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt + systemContext },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos à sua conta." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao gerar slides" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "[]";

    // Parse JSON from the response (handle markdown code blocks)
    let slides;
    try {
      const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
      slides = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (e) {
      console.error("Failed to parse slides JSON:", e, rawContent.substring(0, 500));
      slides = [];
    }

    if (!Array.isArray(slides) || slides.length === 0) {
      return new Response(JSON.stringify({ error: "Falha ao gerar slides. Tente novamente." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generated ${slides.length} slides successfully`);

    return new Response(JSON.stringify({ slides }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-slides error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
