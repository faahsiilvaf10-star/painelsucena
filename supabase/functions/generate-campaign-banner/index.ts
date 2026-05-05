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
    const body = await req.json();
    console.log("Received body:", JSON.stringify(body));
    
    const { monthData, userId, environment } = body as { 
      monthData: MonthCampaign; 
      userId: string;
      environment?: string;
    };

    if (!monthData || !userId) {
      console.error("Missing monthData or userId:", { monthData: !!monthData, userId: !!userId });
      return new Response(JSON.stringify({ error: "Dados incompletos (monthData ou userId)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const currentEnv = environment || 'barcarena';
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    console.log(`Starting campaign update for ${monthData.monthName} in ${currentEnv}...`);

    // 1. Cleanup old announcements
    try {
      const { data: existing } = await supabase
        .from("announcements")
        .select("id")
        .eq("environment", currentEnv)
        .ilike("title", `%Campanhas de ${monthData.monthName}%`)
        .gte("created_at", `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`);

      if (existing && existing.length > 0) {
        const ids = existing.map(a => a.id);
        console.log(`Deleting ${ids.length} old announcements...`);
        await supabase.from("announcement_reads").delete().in("announcement_id", ids);
        await supabase.from("announcements").delete().in("id", ids);
      }
    } catch (err) {
      console.error("Cleanup error (ignoring):", err);
    }

    // 2. Get banner URL
    let imageUrl: string | null = null;
    const bannerPath = CAMPAIGN_BANNER_MAP[monthData.month];
    
    if (bannerPath) {
      const { data: publicData } = supabase.storage
        .from("announcements")
        .getPublicUrl(bannerPath);
      imageUrl = publicData.publicUrl;
    }

    // 3. Create new announcement
    const contentLines = monthData.campaigns.map((c: Campaign) =>
      `🎗️ ${c.name} (${c.colorName})\n${c.description}`
    );
    const content = `Neste mês de ${monthData.monthName}, celebramos importantes campanhas de conscientização:\n\n${contentLines.join("\n\n")}\n\nVamos juntos apoiar essas causas! 💪`;

    const { data: announcement, error: annError } = await supabase
      .from("announcements")
      .insert({
        title: `🎗️ Campanhas de ${monthData.monthName}`,
        content,
        image_url: imageUrl,
        target_type: "all",
        created_by: userId,
        environment: currentEnv,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (annError) throw annError;

    // 4. Trigger WhatsApp (Internal call)
    console.log("Triggering WhatsApp notification...");
    try {
      await supabase.functions.invoke("wapi-campaign-notify", {
        body: { force: true },
      });
    } catch (wapiErr) {
      console.error("Internal WAPI trigger error:", wapiErr);
    }

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
