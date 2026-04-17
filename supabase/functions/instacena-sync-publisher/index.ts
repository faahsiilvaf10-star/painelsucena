// Envia mudanças locais (posts/comentários/reações) para o projeto parceiro
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PublishRequest = {
  entity: "post" | "comment" | "reaction";
  action: "upsert" | "delete";
  payload: Record<string, unknown>;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: only logged-in users can publish
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const partnerUrl = Deno.env.get("PARTNER_SITE_URL");
    const syncSecret = Deno.env.get("SYNC_WEBHOOK_SECRET");

    if (!partnerUrl || !syncSecret) {
      console.warn("Sync not configured (PARTNER_SITE_URL or SYNC_WEBHOOK_SECRET missing)");
      return new Response(JSON.stringify({ skipped: true, reason: "Sync not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as PublishRequest | PublishRequest[];
    const events = Array.isArray(body) ? body : [body];

    // Forward to partner project's sync receiver
    const partnerEndpoint = partnerUrl.replace(/\/+$/, "") + "/functions/v1/instacena-sync-receiver";

    const response = await fetch(partnerEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sync-secret": syncSecret,
      },
      body: JSON.stringify(events),
    });

    const responseText = await response.text();
    let responseData: unknown;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      console.error(`Partner sync failed [${response.status}]:`, responseText);
      return new Response(
        JSON.stringify({ error: "Partner sync failed", status: response.status, details: responseData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true, partner: responseData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Sync publisher error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
