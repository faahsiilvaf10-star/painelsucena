// Worker que processa wapi_outbox respeitando o delay_seconds global do W-API.
// Executado pelo pg_cron a cada minuto. Em cada execução, envia quantas
// mensagens couberem dentro do minuto, espaçadas pelo delay configurado.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const buildWapiUrl = (rawUrl: string, instanceId: string, pathname: string): string => {
  const url = new URL(rawUrl.trim());
  if (url.hostname === "painel.w-api.app" || url.pathname.startsWith("/app")) {
    url.protocol = "https:";
    url.hostname = "api.w-api.app";
  }
  url.pathname = pathname;
  url.searchParams.set("instanceId", instanceId);
  return url.toString();
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const { data: cfg } = await admin
      .from("wapi_config")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!cfg || !cfg.enabled || !cfg.instance_url || !cfg.instance_token || !cfg.instance_id) {
      return new Response(JSON.stringify({ skipped: "wapi_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const delaySec = Math.max(0, Number(cfg.delay_seconds ?? 5));
    const delayMs = delaySec * 1000;
    const startedAt = Date.now();
    const maxRunMs = 55_000; // sai antes do próximo cron

    let processed = 0;
    let lastDispatched = cfg.last_dispatched_at ? new Date(cfg.last_dispatched_at).getTime() : 0;

    while (Date.now() - startedAt < maxRunMs) {
      // Espera tempo restante até a próxima janela
      const waitMs = Math.max(0, lastDispatched + delayMs - Date.now());
      if (waitMs > 0) {
        if (Date.now() - startedAt + waitMs >= maxRunMs) break;
        await sleep(waitMs);
      }

      // Pega 1 mensagem pendente e marca como processing (lock simples otimista)
      const { data: pending } = await admin
        .from("wapi_outbox")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!pending) break;

      const { data: locked } = await admin
        .from("wapi_outbox")
        .update({ status: "processing", attempts: (pending.attempts ?? 0) + 1 })
        .eq("id", pending.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (!locked) continue; // outro worker pegou

      const isImage = pending.kind === "image" && !!pending.image_url;
      const path = isImage ? "/v1/message/send-image" : "/v1/message/send-text";
      const endpoint = buildWapiUrl(cfg.instance_url, cfg.instance_id, path);
      const payload: Record<string, unknown> = isImage
        ? { phone: pending.phone, image: pending.image_url, caption: pending.caption ?? pending.message ?? "", delayMessage: Math.max(1, Math.min(15, delaySec || 5)) }
        : { phone: pending.phone, message: pending.message ?? "", delayMessage: Math.max(1, Math.min(15, delaySec || 5)) };

      let ok = false;
      let errMsg: string | null = null;
      let respJson: unknown = null;
      try {
        const resp = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${cfg.instance_token}`,
          },
          body: JSON.stringify(payload),
        });
        const text = await resp.text();
        try { respJson = JSON.parse(text); } catch { respJson = { raw: text }; }
        ok = resp.ok;
        if (!ok) errMsg = `HTTP ${resp.status}: ${text.slice(0, 200)}`;
      } catch (e) {
        errMsg = e instanceof Error ? e.message : "Erro desconhecido";
      }

      await admin
        .from("wapi_outbox")
        .update({
          status: ok ? "sent" : "failed",
          sent_at: ok ? new Date().toISOString() : null,
          last_error: errMsg,
        })
        .eq("id", pending.id);

      // Log para auditoria (mesma tabela usada pelo wapi-send)
      await admin.from("wapi_message_logs").insert({
        sent_by: null,
        recipient_user_id: pending.recipient_user_id ?? null,
        recipient_name: pending.recipient_name ?? (pending.target_type === "group" ? `Grupo ${pending.phone}` : null),
        recipient_phone: pending.phone,
        message: pending.message ?? pending.caption ?? "",
        status: ok ? "sent" : "failed",
        error_message: errMsg,
        response: respJson as never,
      });

      lastDispatched = Date.now();
      await admin
        .from("wapi_config")
        .update({ last_dispatched_at: new Date(lastDispatched).toISOString() })
        .eq("id", cfg.id);

      processed++;
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
