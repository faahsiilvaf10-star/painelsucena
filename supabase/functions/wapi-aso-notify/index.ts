// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALERT_DAYS = 10;

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

// Pará UTC-4 today at midnight (in UTC ms)
const paraTodayUTC = () => {
  const now = new Date();
  const para = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  return Date.UTC(para.getUTCFullYear(), para.getUTCMonth(), para.getUTCDate());
};

const parseBR = (d) => {
  if (!d || typeof d !== "string") return null;
  const parts = d.split("/");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  if (!day || !month || !year) return null;
  return Date.UTC(year, month - 1, day);
};

const addOneYearMs = (ms) => {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate());
};

// Mirror frontend logic from src/lib/asoValidity.ts
const getEffectiveAsoExpiryMs = (aso, admissao) => {
  const candidates = [];
  if (aso) {
    for (const k of ["validade", "periodico", "retornoTrabalho", "mudancaRisco"]) {
      const ms = parseBR(aso[k]);
      if (ms) candidates.push({ key: k, ms });
    }
  }
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.ms - a.ms);
    const latest = candidates[0];
    if (latest.key === "validade") return latest.ms;
    return addOneYearMs(latest.ms);
  }
  const adm = parseBR(admissao);
  if (adm) return addOneYearMs(adm);
  return null;
};

const fmtDateBR = (ms) => {
  const d = new Date(ms);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
};
const fmtDateISO = (ms) => new Date(ms).toISOString().slice(0, 10);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const admin = createClient(supabaseUrl, serviceKey);

    let force = false;
    try {
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        force = !!body?.force;
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

    if (!cfg.auto_send_aso_alert && !force) {
      return new Response(JSON.stringify({ skipped: true, reason: "Alerta de ASO desabilitado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groupId = (cfg.group_id || "").trim();
    if (!groupId) {
      return new Response(JSON.stringify({ skipped: true, reason: "ID do grupo não configurado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pega o efetivo mais recente de TODOS os ambientes
    const { data: rhRows, error: rhErr } = await admin
      .from("rh_efetivo")
      .select("colaboradores, environment, imported_at")
      .order("imported_at", { ascending: false });

    if (rhErr) throw rhErr;

    // Pega o registro mais recente por ambiente
    const byEnv = new Map();
    for (const row of rhRows || []) {
      if (!byEnv.has(row.environment)) byEnv.set(row.environment, row);
    }

    const todayMs = paraTodayUTC();
    const targetMs = todayMs + ALERT_DAYS * 86400000;

    // Coleta colaboradores cujo ASO vence em exatamente ALERT_DAYS dias
    const expiring = [];
    for (const [env, row] of byEnv.entries()) {
      const colabs = Array.isArray(row.colaboradores) ? row.colaboradores : [];
      for (const c of colabs) {
        const expMs = getEffectiveAsoExpiryMs(c.aso, c.admissao);
        if (!expMs) continue;
        if (expMs === targetMs) {
          expiring.push({
            key: `${env}:${c.id ?? c.nome}:${fmtDateISO(expMs)}`,
            nome: c.nome,
            funcao: c.funcao || c.cargo || "",
            environment: env,
            expiryMs: expMs,
          });
        }
      }
    }

    if (expiring.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: `Nenhum ASO vencendo em ${ALERT_DAYS} dias` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filtra os que já foram enviados (idempotência)
    const keys = expiring.map((e) => e.key);
    const { data: sentRows } = await admin
      .from("wapi_aso_alerts_sent")
      .select("colaborador_key")
      .in("colaborador_key", keys);
    const sentSet = new Set((sentRows || []).map((r) => r.colaborador_key));

    const toSend = force ? expiring : expiring.filter((e) => !sentSet.has(e.key));
    if (toSend.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "Todos os alertas já foram enviados hoje" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Monta UMA mensagem única para o grupo
    const lines = [];
    lines.push(`🩺 *Alerta de Vencimento de ASO*`);
    lines.push(`_Faltam *${ALERT_DAYS} dias* para o vencimento do(s) ASO(s) abaixo:_`);
    lines.push("");
    for (const e of toSend) {
      lines.push(`• *${e.nome}*${e.funcao ? ` — ${e.funcao}` : ""}`);
      lines.push(`   📅 Vence em: ${fmtDateBR(e.expiryMs)}`);
    }
    lines.push("");
    lines.push(`⚠️ Providencie a renovação com antecedência.`);
    lines.push(`_Mensagem automática - Sucena_`);
    const message = lines.join("\n");

    const endpoint = buildWapiEndpoint(cfg.instance_url, cfg.instance_id);
    const phone = sanitizePhone(groupId.replace(/@g\.us$/i, "")) || groupId.replace(/@g\.us$/i, "");
    // W-API usa o group id direto (com @g.us) no campo phone para grupos
    const phoneField = groupId;

    let ok = false;
    let errorMsg = null;
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${cfg.instance_token}`,
        },
        body: JSON.stringify({
          phone: phoneField,
          message,
          delayMessage: Math.max(1, Math.min(15, Number(cfg.delay_seconds ?? 5) || 5)),
        }),
      });
      const respText = await resp.text();
      ok = resp.ok;
      if (!ok) errorMsg = `HTTP ${resp.status}: ${respText.slice(0, 200)}`;

      await admin.from("wapi_message_logs").insert({
        sent_by: null,
        recipient_user_id: null,
        recipient_name: "Grupo - Alerta ASO",
        recipient_phone: phoneField,
        message,
        status: ok ? "sent" : "failed",
        error_message: errorMsg,
      });
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : "Erro desconhecido";
      await admin.from("wapi_message_logs").insert({
        sent_by: null,
        recipient_user_id: null,
        recipient_name: "Grupo - Alerta ASO",
        recipient_phone: phoneField,
        message,
        status: "failed",
        error_message: errorMsg,
      });
    }

    if (ok && !force) {
      // Marca como enviados
      const inserts = toSend.map((e) => ({
        colaborador_key: e.key,
        expiry_date: fmtDateISO(e.expiryMs),
      }));
      await admin.from("wapi_aso_alerts_sent").insert(inserts);
    }

    return new Response(JSON.stringify({
      success: ok,
      total: toSend.length,
      colaboradores: toSend.map((e) => ({ nome: e.nome, vence: fmtDateBR(e.expiryMs) })),
      error: errorMsg,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
