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

// Pre-uploaded Canva banners mapped by month number
const CAMPAIGN_BANNER_MAP: Record<number, string> = {
  1: "campaign-banners/campanha-1.png",
  2: "campaign-banners/campanha-2.png",
  3: "campaign-banners/campanha-3.png",
  4: "campaign-banners/campanha-4.png",
  5: "campaign-banners/campanha-5.png",
  6: "campaign-banners/campanha-6.png",
  7: "campaign-banners/campanha-7.png",
  8: "campaign-banners/campanha-8.png",
  9: "campaign-banners/campanha-9.png",
  10: "campaign-banners/campanha-10.png",
  11: "campaign-banners/campanha-11.png",
  12: "campaign-banners/campanha-12.png",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { monthData, userId, environment } = await req.json() as { 
      monthData: MonthCampaign; 
      userId: string;
      environment?: string;
    };

    if (!monthData || !userId) {
      return new Response(JSON.stringify({ error: "Missing monthData or userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Getting pre-uploaded banner for ${monthData.monthName} (month ${monthData.month})...`);

    // Get the pre-uploaded Canva banner URL for this month
    let imageUrl: string | null = null;
    const bannerPath = CAMPAIGN_BANNER_MAP[monthData.month];
    
    if (bannerPath) {
      const { data: publicData } = supabase.storage
        .from("announcements")
        .getPublicUrl(bannerPath);
      imageUrl = publicData.publicUrl;
      console.log("Using Canva banner:", imageUrl);
    } else {
      console.log(`No banner available for month ${monthData.month}`);
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
        environment: environment || 'barcarena',
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
