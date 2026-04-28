import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Recipient {
  user_id?: string | null;
  name?: string | null;
  phone: string;
}

interface Body {
  message: string;
  recipients: Recipient[];
}

const sanitizePhone = (raw: string): string => {
  let digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
  return digits;
};

const buildWapiEndpoint = (rawUrl: string, instanceId: string): string => {
  const url = new URL(rawUrl.trim());
  const normalizedPath = url.pathname.replace(/\/+$/, "");

  // W-API docs: POST https://api.w-api.app/v1/message/send-text?instanceId=...
  // Accept pasted panel/instance URLs too, but always target the official send-text route.
  if (url.hostname === "painel.w-api.app" || url.pathname.startsWith("/app")) {
    url.protocol = "https:";
    url.hostname = "api.w-api.app";
  }

  if (!normalizedPath.endsWith("/send-text")) {
    url.pathname = "/v1/message/send-text";
  }

  url.searchParams.set("instanceId", instanceId);
  return url.toString();
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: userId });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: Body = await req.json();
    if (!body?.message || !Array.isArray(body.recipients) || body.recipients.length === 0) {
      return new Response(JSON.stringify({ error: "Mensagem e destinatários são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.message.length > 4000) {
      return new Response(JSON.stringify({ error: "Mensagem muito longa (máx 4000)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cfg } = await admin
      .from("wapi_config")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!cfg || !cfg.enabled || !cfg.instance_url || !cfg.instance_token || !cfg.instance_id) {
      return new Response(JSON.stringify({ error: "W-API não configurada ou desabilitada" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const endpoint = buildWapiEndpoint(cfg.instance_url, cfg.instance_id);

    const results: Array<{ phone: string; ok: boolean; error?: string }> = [];

    for (const r of body.recipients) {
      const phone = sanitizePhone(r.phone);
      if (!phone) {
        results.push({ phone: r.phone, ok: false, error: "Telefone inválido" });
        await admin.from("wapi_message_logs").insert({
          sent_by: userId,
          recipient_user_id: r.user_id ?? null,
          recipient_name: r.name ?? null,
          recipient_phone: r.phone,
          message: body.message,
          status: "failed",
          error_message: "Telefone inválido",
        });
        continue;
      }

      try {
        const resp = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${cfg.instance_token}`,
          },
          body: JSON.stringify({ phone, message: body.message }),
        });
        const respText = await resp.text();
        let respJson: unknown = null;
        try { respJson = JSON.parse(respText); } catch { respJson = { raw: respText }; }

        const ok = resp.ok;
        await admin.from("wapi_message_logs").insert({
          sent_by: userId,
          recipient_user_id: r.user_id ?? null,
          recipient_name: r.name ?? null,
          recipient_phone: phone,
          message: body.message,
          status: ok ? "sent" : "failed",
          error_message: ok ? null : `HTTP ${resp.status}`,
          response: respJson as never,
        });
        results.push({ phone, ok, error: ok ? undefined : `HTTP ${resp.status}: ${respText.slice(0, 200)}` });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro desconhecido";
        await admin.from("wapi_message_logs").insert({
          sent_by: userId,
          recipient_user_id: r.user_id ?? null,
          recipient_name: r.name ?? null,
          recipient_phone: phone,
          message: body.message,
          status: "failed",
          error_message: msg,
        });
        results.push({ phone, ok: false, error: msg });
      }
    }

    const sent = results.filter((r) => r.ok).length;
    return new Response(JSON.stringify({ success: true, sent, total: results.length, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
