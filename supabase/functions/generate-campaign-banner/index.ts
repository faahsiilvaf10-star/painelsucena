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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { monthData, userId, logoUrl } = await req.json() as { monthData: MonthCampaign; userId: string; logoUrl?: string };

    if (!monthData || !userId) {
      return new Response(JSON.stringify({ error: "Missing monthData or userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch company logo URL from site_settings if not provided
    let companyLogoUrl = logoUrl;
    if (!companyLogoUrl) {
      const { data: siteSettings } = await supabase
        .from("site_settings")
        .select("logo_url")
        .limit(1)
        .single();
      companyLogoUrl = siteSettings?.logo_url || null;
    }

    console.log(`Generating campaign banner for ${monthData.monthName}... Logo: ${companyLogoUrl}`);

    // Build prompt for AI image generation
    const campaignNames = monthData.campaigns.map((c: Campaign) => c.name).join(", ");
    const campaignColors = monthData.campaigns.map((c: Campaign) => c.colorName).join(", ");
    const campaignDescriptions = monthData.campaigns.map((c: Campaign) => `${c.name}: ${c.description}`).join(". ");

    const prompt = `Create a beautiful, professional health awareness campaign banner image for the month of "${monthData.monthName}" in Brazil. 
The campaigns are: ${campaignNames}. The theme colors are: ${campaignColors}.
${campaignDescriptions}.
Design a modern, clean banner with a Windows 11 Fluent Design aesthetic: rounded corners, frosted glass effects, soft gradients using the campaign colors (${monthData.campaigns.map((c: Campaign) => c.color).join(", ")}). 
Include symbolic awareness ribbons in the campaign colors, gentle bokeh lights, and a professional medical/health feel. 
The banner should be wide (16:9 aspect ratio), elegant and inspiring.
CRITICAL: DO NOT include ANY text, words, letters, or typography in the image. The image must be purely visual/graphical with NO text at all. No month names, no campaign names, no logos as text. Only visual elements like ribbons, gradients, abstract shapes, and health symbols.
Ultra high resolution.`;

    console.log("Calling AI to generate banner image...");

    // Build messages with optional logo image
    const messageContent: any[] = [{ type: "text", text: prompt }];
    if (companyLogoUrl) {
      messageContent.push({
        type: "image_url",
        image_url: { url: companyLogoUrl },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: messageContent,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    let imageUrl: string | null = null;

    if (imageData && imageData.startsWith("data:image")) {
      console.log("Got image from AI, uploading to storage...");

      // Extract base64 data
      const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
      if (base64Match) {
        const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
        const base64Data = base64Match[2];

        // Decode base64 to Uint8Array
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const fileName = `campaign-${monthData.month}-${new Date().getFullYear()}.${ext}`;
        const contentType = `image/${base64Match[1]}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("announcements")
          .upload(fileName, bytes, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
        } else {
          const { data: publicData } = supabase.storage
            .from("announcements")
            .getPublicUrl(fileName);
          imageUrl = publicData.publicUrl;
          console.log("Image uploaded successfully:", imageUrl);
        }
      }
    } else {
      console.log("No image generated by AI, proceeding without banner.");
    }

    // Build announcement content
    const contentLines = monthData.campaigns.map(c => 
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

    console.log("Campaign announcement created successfully:", announcement.id);

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
