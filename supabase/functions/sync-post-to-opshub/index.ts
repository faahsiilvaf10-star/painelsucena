// Edge function to replicate InstaCena posts/comments/reactions to the OpsHub project
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncPayload {
  type: "post" | "comment" | "reaction";
  action: "INSERT" | "DELETE" | "UPDATE";
  record: Record<string, unknown>;
  old_record?: Record<string, unknown>;
}

const TABLE_MAP: Record<SyncPayload["type"], string> = {
  post: "instacena_posts",
  comment: "instacena_comments",
  reaction: "instacena_reactions",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const OPSHUB_URL = Deno.env.get("OPSHUB_SUPABASE_URL");
    const OPSHUB_KEY = Deno.env.get("OPSHUB_ANON_KEY");
    if (!OPSHUB_URL || !OPSHUB_KEY) {
      throw new Error("OPSHUB_SUPABASE_URL or OPSHUB_ANON_KEY not configured");
    }

    const payload = (await req.json()) as SyncPayload;
    const table = TABLE_MAP[payload.type];
    if (!table) throw new Error(`Unknown type: ${payload.type}`);

    const baseUrl = `${OPSHUB_URL.replace(/\/$/, "")}/rest/v1/${table}`;
    const headers = {
      apikey: OPSHUB_KEY,
      Authorization: `Bearer ${OPSHUB_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal,resolution=merge-duplicates",
    };

    let response: Response;

    if (payload.action === "DELETE") {
      const id = (payload.old_record?.id ?? payload.record?.id) as string;
      if (!id) throw new Error("Missing id for DELETE");
      response = await fetch(
        `${baseUrl}?external_id=eq.${id}&external_source=eq.painelsucena`,
        { method: "DELETE", headers }
      );
    } else {
      // INSERT (or UPDATE → upsert by external_id)
      const rec = payload.record;
      const body: Record<string, unknown> = {
        ...rec,
        // Force origin tracking; original local id becomes external_id on the other side
        origin: "external",
        external_source: "painelsucena",
        external_id: rec.id,
      };
      // Drop the local primary key so the remote project assigns its own
      delete body.id;

      response = await fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    }

    const text = await response.text();
    if (!response.ok) {
      console.error(`OpsHub sync failed [${response.status}]:`, text);
      return new Response(
        JSON.stringify({ ok: false, status: response.status, body: text }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("sync-post-to-opshub error:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
