import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sanitizePhone = (raw: string): string => {
  let digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
  return digits;
};

const buildWapiEndpoint = (rawUrl: string, instanceId: string): string => {
  const url = new URL(rawUrl.trim());
  if (url.hostname === "painel.w-api.app" || url.pathname.startsWith("/app")) {
    url.protocol = "https:";
    url.hostname = "api.w-api.app";
  }
  if (!url.pathname.replace(/\/+$/, "").endsWith("/send-text")) {
    url.pathname = "/v1/message/send-text";
  }
  url.searchParams.set("instanceId", instanceId);
  return url.toString();
};

// Retorna a data de hoje em Pará (UTC-4) no formato YYYY-MM-DD
const getParaDateISO = (): string => {
  const now = new Date();
  const para = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  return para.toISOString().slice(0, 10);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: cfg } = await admin
      .from("wapi_config")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!cfg || !cfg.enabled || !cfg.dds_auto_notify || !cfg.instance_url || !cfg.instance_token || !cfg.instance_id) {
      return new Response(JSON.stringify({ skipped: true, reason: "DDS auto-notify desabilitado ou W-API não configurada" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = getParaDateISO();

    const { data: schedules, error: scheduleErr } = await admin
      .from("dds_schedule")
      .select("id, theme, presenter_user_id, external_presenter_name, scheduled_date")
      .eq("scheduled_date", today);

    if (scheduleErr) throw scheduleErr;
    if (!schedules || schedules.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "Nenhum DDS agendado para hoje", today }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const endpoint = buildWapiEndpoint(cfg.instance_url, cfg.instance_id);
    const results: Array<{ presenter: string; phone: string; ok: boolean; error?: string }> = [];

    for (const dds of schedules) {
      if (!dds.presenter_user_id) {
        results.push({ presenter: dds.external_presenter_name ?? "(externo)", phone: "", ok: false, error: "Sem usuário interno cadastrado" });
        continue;
      }

      const { data: profile } = await admin
        .from("profiles")
        .select("full_name, whatsapp_number")
        .eq("user_id", dds.presenter_user_id)
        .maybeSingle();

      const phoneRaw = profile?.whatsapp_number ?? "";
      const phone = sanitizePhone(phoneRaw);
      const presenterName = profile?.full_name ?? "Palestrante";

      if (!phone) {
        results.push({ presenter: presenterName, phone: phoneRaw, ok: false, error: "WhatsApp não cadastrado" });
        await admin.from("wapi_message_logs").insert({
          sent_by: null,
          recipient_user_id: dds.presenter_user_id,
          recipient_name: presenterName,
          recipient_phone: phoneRaw || "(vazio)",
          message: `[DDS automático] Tema: ${dds.theme}`,
          status: "failed",
          error_message: "WhatsApp não cadastrado",
        });
        continue;
      }

      const message = `🎤 *Lembrete DDS - Hoje é o seu dia!*\n\nOlá, ${presenterName}!\n\nVocê é o palestrante do DDS de hoje (${today.split("-").reverse().join("/")}).\n\n📋 *Tema:* ${dds.theme}\n\nPrepare-se e bom DDS! 🌟\n\n_Mensagem automática - Sucena_`;

      try {
        const resp = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${cfg.instance_token}`,
          },
          body: JSON.stringify({ phone, message, delayMessage: Math.max(1, Math.min(15, Number(cfg.delay_seconds ?? 5) || 5)) }),
        });
        const respText = await resp.text();
        let respJson: unknown = null;
        try { respJson = JSON.parse(respText); } catch { respJson = { raw: respText }; }

        const ok = resp.ok;
        await admin.from("wapi_message_logs").insert({
          sent_by: null,
          recipient_user_id: dds.presenter_user_id,
          recipient_name: presenterName,
          recipient_phone: phone,
          message,
          status: ok ? "sent" : "failed",
          error_message: ok ? null : `HTTP ${resp.status}: ${respText.slice(0, 200)}`,
          response: respJson as never,
        });
        results.push({ presenter: presenterName, phone, ok, error: ok ? undefined : `HTTP ${resp.status}` });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro desconhecido";
        await admin.from("wapi_message_logs").insert({
          sent_by: null,
          recipient_user_id: dds.presenter_user_id,
          recipient_name: presenterName,
          recipient_phone: phone,
          message,
          status: "failed",
          error_message: msg,
        });
        results.push({ presenter: presenterName, phone, ok: false, error: msg });
      }
    }

    const sent = results.filter((r) => r.ok).length;
    return new Response(JSON.stringify({ success: true, today, sent, total: results.length, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
