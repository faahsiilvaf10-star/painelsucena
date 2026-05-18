// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STATUS_LABELS: Record<string, string> = {
  none: "▶️ Operando",
  operando: "▶️ Operando",
  waiting: "⏸️ Aguardando Frente",
  rain: "🌧️ Parado (Chuva)",
  end_of_day: "⛽ Abastecendo",
  abastecimento: "⛽ Abastecendo",
  end_of_shift: "🌙 Fim de Turno",
  maintenance: "🔧 Manutenção",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const payload = await req.json().catch(() => ({}));
    const {
      equipmentId,
      equipmentName,
      plate,
      newStatus,
      previousStatus,
      driverName,
      waterPoint,
      extraInfo,
      imageUrl,
      imageCaption,
    } = payload || {};

    if (!newStatus) {
      return new Response(JSON.stringify({ error: "newStatus é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cfg } = await admin.from("wapi_config").select("*").limit(1).single();
    if (!cfg || !cfg.enabled || !cfg.auto_send_driver_status) {
      return new Response(JSON.stringify({ skipped: true, reason: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const targetGroupId = (cfg.group_id_driver_status || cfg.group_id || "").trim();
    if (!cfg.instance_url || !cfg.instance_token || !cfg.instance_id || !targetGroupId) {
      return new Response(JSON.stringify({ skipped: true, reason: "missing-config-or-group" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lookup equipment if not provided
    let eqName = equipmentName || "—";
    let eqPlate = plate || "—";
    if (equipmentId && (!equipmentName || !plate)) {
      const { data: eq } = await admin
        .from("equipment")
        .select("name, plate")
        .eq("id", equipmentId)
        .maybeSingle();
      if (eq) {
        eqName = eq.name || eqName;
        eqPlate = eq.plate || eqPlate;
      }
    }

    const newLabel = STATUS_LABELS[newStatus] || newStatus;
    const prevLabel = previousStatus ? (STATUS_LABELS[previousStatus] || previousStatus) : null;

    const now = new Date();
    const paraTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const dateBR = paraTime.toISOString().slice(0, 10).split("-").reverse().join("/");
    const timeBR = paraTime.toISOString().slice(11, 16);

    let message =
      `🚜 *STATUS DO EQUIPAMENTO*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `*Equipamento:* ${eqName}\n` +
      `*Placa/ID:* ${eqPlate}\n` +
      `*Data:* ${dateBR}\n` +
      `*Horário:* ${timeBR}\n`;

    if (prevLabel) {
      message += `*Mudança:* ${prevLabel} → ${newLabel}\n`;
    } else {
      message += `*Status:* ${newLabel}\n`;
    }

    if (waterPoint) {
      message += `*Ponto de Água:* ${waterPoint}\n`;
    }
    if (extraInfo) {
      message += `\n${extraInfo}\n`;
    }

    message +=
      `\n*Motorista:* ${driverName || "—"}\n` +
      `━━━━━━━━━━━━━━━━━━━━`;

    const { error } = await admin.from("wapi_outbox").insert({
      kind: "text",
      target_type: "group",
      phone: targetGroupId,
      message,
      origin: "driver-status",
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, queued: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[wapi-driver-status-notify] error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
