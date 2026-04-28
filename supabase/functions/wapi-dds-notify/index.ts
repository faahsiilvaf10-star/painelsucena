import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

// Retorna a data alvo em Pará (UTC-4) no formato YYYY-MM-DD (offsetDays: 0 = hoje, 1 = amanhã)
const getParaDateISO = (offsetDays = 0): string => {
  const now = new Date();
  const para = new Date(now.getTime() - 4 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000);
  return para.toISOString().slice(0, 10);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    let mode: "today" | "tomorrow" = "today";
    try {
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        if (body?.mode === "tomorrow") mode = "tomorrow";
      }
    } catch { /* ignore */ }

    const { data: cfg } = await admin
      .from("wapi_config")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!cfg || !cfg.enabled || !cfg.instance_url || !cfg.instance_token || !cfg.instance_id) {
      return new Response(JSON.stringify({ skipped: true, reason: "W-API não configurada" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const flagOk = mode === "tomorrow" ? cfg.dds_notify_day_before : cfg.dds_auto_notify;
    if (!flagOk) {
      return new Response(JSON.stringify({ skipped: true, reason: `Lembrete '${mode}' desabilitado` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetDate = mode === "tomorrow" ? getParaDateISO(1) : getParaDateISO(0);

    const { data: schedules, error: scheduleErr } = await admin
      .from("dds_schedule")
      .select("id, theme, presenter_user_id, external_presenter_name, scheduled_date")
      .eq("scheduled_date", targetDate);

    if (scheduleErr) throw scheduleErr;
    if (!schedules || schedules.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: `Nenhum DDS agendado para ${mode === "tomorrow" ? "amanhã" : "hoje"}`, targetDate }), {
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
          message: `[DDS automático ${mode}] Tema: ${dds.theme}`,
          status: "failed",
          error_message: "WhatsApp não cadastrado",
        });
        continue;
      }

      const dateBR = targetDate.split("-").reverse().join("/");
      const message = mode === "tomorrow"
        ? `🔔 *Lembrete DDS - Amanhã é o seu dia!*\n\nOlá, ${presenterName}!\n\nVocê é o palestrante do DDS de *amanhã* (${dateBR}).\n\n📋 *Tema:* ${dds.theme}\n\nPrepare-se com antecedência! 📚\n\n_Mensagem automática - Sucena_`
        : `🎤 *Lembrete DDS - Hoje é o seu dia!*\n\nOlá, ${presenterName}!\n\nVocê é o palestrante do DDS de hoje (${dateBR}).\n\n📋 *Tema:* ${dds.theme}\n\nPrepare-se e bom DDS! 🌟\n\n_Mensagem automática - Sucena_`;

      try {
        const { error: qErr } = await admin.from("wapi_outbox").insert({
          kind: "text", target_type: "contact", phone, message,
          origin: "dds", recipient_user_id: dds.presenter_user_id, recipient_name: presenterName,
        });
        const ok = !qErr;
        results.push({ presenter: presenterName, phone, ok, error: ok ? undefined : qErr?.message });

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
    return new Response(JSON.stringify({ success: true, mode, targetDate, sent, total: results.length, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
