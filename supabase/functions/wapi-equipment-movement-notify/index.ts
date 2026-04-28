// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXIT_REASON_LABELS: Record<string, string> = {
  manutencao_corretiva: "🔧 Manutenção Corretiva",
  manutencao_preventiva: "🛠️ Manutenção Preventiva",
  vistoria: "🔎 Vistoria",
  operando: "🟢 Operando",
  aguardando_frente_servico: "⏸️ Aguardando Frente de Serviço",
  fim_turno: "🌙 Fim de Turno",
};

const buildWapiGroupEndpoint = (rawUrl: string, instanceId: string): string => {
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

async function sendWapiGroupText(cfg: any, groupId: string, message: string) {
  const endpoint = buildWapiGroupEndpoint(cfg.instance_url, cfg.instance_id);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.instance_token}`,
    },
    body: JSON.stringify({ phone: groupId, message, delayMessage: cfg.delay_seconds || 3 }),
  });
  const text = await res.text();
  let body: any = text;
  try { body = JSON.parse(text); } catch {}
  return { ok: res.ok, status: res.status, body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const payload = await req.json().catch(() => ({}));
    const { movementId } = payload || {};

    if (!movementId) {
      return new Response(JSON.stringify({ error: "movementId é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get config
    const { data: cfg } = await admin.from("wapi_config").select("*").limit(1).single();
    if (!cfg || !cfg.enabled || !cfg.auto_send_equipment_movements) {
      return new Response(JSON.stringify({ skipped: true, reason: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!cfg.instance_url || !cfg.instance_token || !cfg.instance_id || !cfg.group_id) {
      return new Response(JSON.stringify({ skipped: true, reason: "missing-config-or-group" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch movement
    const { data: mov, error: movErr } = await admin
      .from("equipment_movements")
      .select("id, equipment_name, plate, movement_type, movement_date, movement_time, exit_reason, problem_description, observation, created_by")
      .eq("id", movementId)
      .single();

    if (movErr || !mov) {
      return new Response(JSON.stringify({ error: "Movimentação não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch creator name
    let creatorName = "—";
    if (mov.created_by) {
      const { data: prof } = await admin
        .from("profiles")
        .select("full_name")
        .eq("user_id", mov.created_by)
        .maybeSingle();
      creatorName = prof?.full_name || "—";
    }

    const isExit = mov.movement_type === "saida";
    const headerEmoji = isExit ? "🚪➡️" : "⬅️🏠";
    const headerLabel = isExit ? "SAÍDA DE EQUIPAMENTO" : "ENTRADA DE EQUIPAMENTO";

    const dateBR = mov.movement_date
      ? new Date(mov.movement_date + "T00:00:00").toLocaleDateString("pt-BR")
      : "—";
    const timeBR = (mov.movement_time || "").toString().slice(0, 5);

    const reasonLabel = mov.exit_reason
      ? (EXIT_REASON_LABELS[mov.exit_reason] || mov.exit_reason)
      : (isExit ? "—" : "Retorno ao canteiro");

    let message =
      `${headerEmoji} *${headerLabel}*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `*Equipamento:* ${mov.equipment_name}\n` +
      `*Placa/ID:* ${mov.plate}\n` +
      `*Data:* ${dateBR}\n` +
      `*Horário:* ${timeBR}\n` +
      `*${isExit ? "Motivo da Saída" : "Tipo"}:* ${reasonLabel}\n`;

    if (mov.problem_description) {
      message += `\n*Descrição do problema:*\n${mov.problem_description}\n`;
    }
    if (mov.observation) {
      message += `\n*Observação:*\n${mov.observation}\n`;
    }

    message +=
      `\n*Registrado por:* ${creatorName}\n` +
      `━━━━━━━━━━━━━━━━━━━━`;

    const result = await sendWapiGroupText(cfg, cfg.group_id, message);

    return new Response(
      JSON.stringify({ success: result.ok, movement_type: mov.movement_type, wapi: result }),
      { status: result.ok ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[wapi-equipment-movement-notify] error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
