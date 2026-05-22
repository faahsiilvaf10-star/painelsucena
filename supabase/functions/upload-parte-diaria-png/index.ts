// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { path, base64, caption, shiftRecordId } = await req.json();
    const bin = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const up = await admin.storage.from("site-assets").upload(path, bin, { contentType: "image/png", upsert: true });
    if (up.error) throw up.error;
    const { data: pub } = admin.storage.from("site-assets").getPublicUrl(path);
    const { data: cfg } = await admin.from("wapi_config").select("group_id_driver_status, group_id").limit(1).single();
    const groupId = (cfg.group_id_driver_status || cfg.group_id || "").trim();
    const ins = await admin.from("wapi_outbox").insert({
      kind: "image", target_type: "group", phone: groupId,
      image_url: pub.publicUrl, caption,
      origin: "driver-status", external_kind: "daily-shift-png", external_id: shiftRecordId,
    });
    if (ins.error) throw ins.error;
    return new Response(JSON.stringify({ url: pub.publicUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
