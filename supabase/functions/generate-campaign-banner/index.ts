import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Campaign {
  name: string;
  color: string;
  colorName: string;
  description: string;
}

interface MonthCampaign {
  month: number;
  monthName: string;
  campaigns: Campaign[];
}

function generateCampaignSVG(monthData: MonthCampaign): string {
  const colors = monthData.campaigns.map(c => c.color);
  const primaryColor = colors[0] || "#8B5CF6";
  const secondaryColor = colors[1] || primaryColor;

  // Generate ribbon paths and decorative elements based on campaign colors
  const ribbons = colors.map((color, i) => {
    const xOffset = 600 + i * 280;
    const yOffset = 80 + i * 40;
    return `
      <g transform="translate(${xOffset}, ${yOffset}) scale(0.9)" opacity="0.85">
        <path d="M0,120 Q15,60 30,0 Q35,30 40,60 Q55,0 70,120 Q55,100 35,90 Q15,100 0,120Z" 
              fill="${color}" opacity="0.9"/>
        <path d="M25,90 Q35,130 35,160 L30,160 Q30,130 20,95Z" fill="${color}" opacity="0.7"/>
        <path d="M45,90 Q35,130 35,160 L40,160 Q40,130 50,95Z" fill="${color}" opacity="0.7"/>
        <ellipse cx="35" cy="85" rx="8" ry="6" fill="${color}" opacity="0.5"/>
      </g>
    `;
  }).join("");

  // Create bokeh circles
  const bokehCircles = Array.from({ length: 30 }, (_, i) => {
    const cx = Math.round((i * 137.5) % 960);
    const cy = Math.round((i * 89.3) % 400);
    const r = 5 + (i % 8) * 4;
    const opacity = 0.04 + (i % 5) * 0.03;
    const color = i % 2 === 0 ? primaryColor : secondaryColor;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${opacity}"/>`;
  }).join("");

  // Extra decorative shapes
  const decorativeShapes = Array.from({ length: 12 }, (_, i) => {
    const cx = 50 + (i * 83) % 860;
    const cy = 30 + (i * 67) % 340;
    const size = 2 + (i % 4) * 1.5;
    return `<circle cx="${cx}" cy="${cy}" r="${size}" fill="white" opacity="${0.15 + (i % 3) * 0.1}"/>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 400" width="960" height="400">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.25"/>
      <stop offset="50%" stop-color="#1a1a2e" stop-opacity="1"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0.3"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="white" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="glow1" cx="20%" cy="50%">
      <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="80%" cy="50%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur1">
      <feGaussianBlur stdDeviation="20"/>
    </filter>
    <filter id="blur2">
      <feGaussianBlur stdDeviation="8"/>
    </filter>
  </defs>

  <!-- Dark background -->
  <rect width="960" height="400" fill="#0d0d1a"/>
  
  <!-- Gradient overlay -->
  <rect width="960" height="400" fill="url(#bg)"/>
  
  <!-- Color glows -->
  <ellipse cx="180" cy="200" rx="300" ry="250" fill="url(#glow1)" filter="url(#blur1)"/>
  <ellipse cx="780" cy="200" rx="300" ry="250" fill="url(#glow2)" filter="url(#blur1)"/>
  
  <!-- Frosted glass panel -->
  <rect x="40" y="30" width="880" height="340" rx="20" fill="white" opacity="0.04"/>
  <rect x="40" y="30" width="880" height="340" rx="20" fill="url(#shine)"/>
  <rect x="40" y="30" width="880" height="340" rx="20" fill="none" stroke="white" stroke-opacity="0.08" stroke-width="1"/>
  
  <!-- Bokeh lights -->
  ${bokehCircles}
  
  <!-- Decorative dots -->
  ${decorativeShapes}
  
  <!-- Campaign ribbons -->
  ${ribbons}
  
  <!-- Bottom accent line -->
  <rect x="80" y="360" width="800" height="2" rx="1" fill="white" opacity="0.1"/>
  
  <!-- Corner accents -->
  <path d="M60,50 L60,70 Q60,60 70,60 L90,60" fill="none" stroke="${primaryColor}" stroke-opacity="0.4" stroke-width="1.5"/>
  <path d="M900,50 L900,70 Q900,60 890,60 L870,60" fill="none" stroke="${secondaryColor}" stroke-opacity="0.4" stroke-width="1.5"/>
  <path d="M60,350 L60,330 Q60,340 70,340 L90,340" fill="none" stroke="${primaryColor}" stroke-opacity="0.3" stroke-width="1.5"/>
  <path d="M900,350 L900,330 Q900,340 890,340 L870,340" fill="none" stroke="${secondaryColor}" stroke-opacity="0.3" stroke-width="1.5"/>

  <!-- Subtle health cross symbol -->
  <g transform="translate(140, 160)" opacity="0.12">
    <rect x="-8" y="-25" width="16" height="50" rx="4" fill="white"/>
    <rect x="-25" y="-8" width="50" height="16" rx="4" fill="white"/>
  </g>
</svg>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { monthData, userId } = await req.json() as { monthData: MonthCampaign; userId: string };

    if (!monthData || !userId) {
      return new Response(JSON.stringify({ error: "Missing monthData or userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Generating SVG campaign banner for ${monthData.monthName}...`);

    // Generate deterministic SVG banner
    const svgContent = generateCampaignSVG(monthData);
    const svgBytes = new TextEncoder().encode(svgContent);
    const fileName = `campaign-${monthData.month}-${new Date().getFullYear()}.svg`;

    // Upload SVG to storage
    const { error: uploadError } = await supabase.storage
      .from("announcements")
      .upload(fileName, svgBytes, {
        contentType: "image/svg+xml",
        upsert: true,
      });

    let imageUrl: string | null = null;
    if (uploadError) {
      console.error("Upload error:", uploadError);
    } else {
      const { data: publicData } = supabase.storage
        .from("announcements")
        .getPublicUrl(fileName);
      imageUrl = publicData.publicUrl;
      console.log("SVG banner uploaded:", imageUrl);
    }

    // Build announcement content
    const contentLines = monthData.campaigns.map((c: Campaign) =>
      `🎗️ ${c.name} (${c.colorName})\n${c.description}`
    );
    const content = `Neste mês de ${monthData.monthName}, celebramos importantes campanhas de conscientização:\n\n${contentLines.join("\n\n")}\n\nVamos juntos apoiar essas causas! 💪`;

    // Create announcement
    const { data: announcement, error: annError } = await supabase
      .from("announcements")
      .insert({
        title: `🎗️ Campanhas de ${monthData.monthName}`,
        content,
        image_url: imageUrl,
        target_type: "all",
        created_by: userId,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (annError) {
      console.error("Error creating announcement:", annError);
      throw annError;
    }

    console.log("Campaign announcement created:", announcement.id);

    return new Response(JSON.stringify({ success: true, announcementId: announcement.id, imageUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-campaign-banner:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
