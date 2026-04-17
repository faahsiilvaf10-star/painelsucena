// Recebe webhooks do projeto parceiro (Sucena1) e sincroniza posts/comentários/reações
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sync-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SyncEvent = {
  entity: "post" | "comment" | "reaction";
  action: "upsert" | "delete";
  payload: Record<string, unknown>;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate shared secret
    const expectedSecret = Deno.env.get("SYNC_WEBHOOK_SECRET");
    if (!expectedSecret) {
      console.error("SYNC_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const providedSecret = req.headers.get("x-sync-secret");
    if (providedSecret !== expectedSecret) {
      console.warn("Invalid sync secret received");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const events: SyncEvent[] = Array.isArray(body) ? body : [body];

    if (!events.length) {
      return new Response(JSON.stringify({ error: "Empty payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const results: Array<{ ok: boolean; entity: string; id?: string; error?: string }> = [];

    for (const event of events) {
      try {
        const { entity, action, payload } = event;

        if (entity === "post") {
          if (action === "delete") {
            const { error } = await admin.from("instacena_posts").delete().eq("id", payload.id as string);
            if (error) throw error;
          } else {
            const { error } = await admin.from("instacena_posts").upsert({
              id: payload.id,
              user_id: payload.user_id,
              user_name: payload.user_name,
              user_avatar_url: payload.user_avatar_url ?? null,
              content: payload.content ?? null,
              image_urls: payload.image_urls ?? [],
              is_system_post: payload.is_system_post ?? false,
              created_at: payload.created_at,
              updated_at: payload.updated_at ?? new Date().toISOString(),
            }, { onConflict: "id" });
            if (error) throw error;
          }
        } else if (entity === "comment") {
          if (action === "delete") {
            const { error } = await admin.from("instacena_comments").delete().eq("id", payload.id as string);
            if (error) throw error;
          } else {
            const { error } = await admin.from("instacena_comments").upsert({
              id: payload.id,
              post_id: payload.post_id,
              user_id: payload.user_id,
              user_name: payload.user_name,
              user_avatar_url: payload.user_avatar_url ?? null,
              content: payload.content,
              created_at: payload.created_at,
            }, { onConflict: "id" });
            if (error) throw error;
          }
        } else if (entity === "reaction") {
          if (action === "delete") {
            const { error } = await admin.from("instacena_reactions").delete().eq("id", payload.id as string);
            if (error) throw error;
          } else {
            const { error } = await admin.from("instacena_reactions").upsert({
              id: payload.id,
              post_id: payload.post_id,
              user_id: payload.user_id,
              user_name: payload.user_name,
              reaction_type: payload.reaction_type ?? "like",
              created_at: payload.created_at,
            }, { onConflict: "post_id,user_id" });
            if (error) throw error;
          }
        } else {
          throw new Error(`Unknown entity: ${entity}`);
        }

        results.push({ ok: true, entity, id: payload.id as string });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Failed to sync event:`, event, msg);
        results.push({ ok: false, entity: event.entity, error: msg });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Sync receiver error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
