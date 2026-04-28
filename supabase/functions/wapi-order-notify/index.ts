// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STATUS_LABELS: Record<string, string> = {
  solicitado: "Solicitado 📨",
  em_analise: "Em Análise 🔍",
  aprovado: "Aprovado ✅",
  comprado: "Comprado 🛒",
  a_caminho: "A Caminho 🚚",
  entregue: "Entregue 📬",
  pedido_realizado: "Pedido Realizado 📦",
  cancelado: "Cancelado ❌",
  recusado: "Recusado 🚫",
};

const UNIT_LABELS: Record<string, string> = {
  unidade: "un",
  kg: "kg",
  g: "g",
  litro: "L",
  ml: "ml",
  metro: "m",
  cm: "cm",
  caixa: "cx",
  pacote: "pct",
  duzia: "dz",
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

async function sendWapiText(cfg: any, phone: string, message: string) {
  const endpoint = buildWapiEndpoint(cfg.instance_url, cfg.instance_id);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.instance_token}`,
    },
    body: JSON.stringify({ phone, message, delayMessage: cfg.delay_seconds || 3 }),
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
    const { orderId, eventType, oldStatus, newStatus, changerName } = payload || {};

    if (!orderId || !eventType) {
      return new Response(JSON.stringify({ error: "orderId e eventType são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get config
    const { data: cfg } = await admin.from("wapi_config").select("*").limit(1).single();
    if (!cfg || !cfg.enabled || !cfg.auto_send_order_alerts) {
      return new Response(JSON.stringify({ skipped: true, reason: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!cfg.instance_url || !cfg.instance_token || !cfg.instance_id) {
      return new Response(JSON.stringify({ skipped: true, reason: "missing-config" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch order
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, order_number, product_name, description, requester_id, requester_name, mentioned_user_id, expected_date, notes, created_at")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch items
    const { data: items } = await admin
      .from("order_items")
      .select("product_name, quantity, quantity_unit, description")
      .eq("order_id", orderId);

    const itemsList = (items || []).map((i: any) => {
      const unit = UNIT_LABELS[i.quantity_unit] || i.quantity_unit;
      let line = `• ${i.quantity} ${unit} — ${i.product_name}`;
      if (i.description) line += `\n   _${i.description}_`;
      return line;
    }).join("\n");

    const orderNum = order.order_number ? `Nº ${order.order_number}` : "";
    const expectedDate = order.expected_date
      ? new Date(order.expected_date + "T00:00:00").toLocaleDateString("pt-BR")
      : null;

    let targetUserId: string | null = null;
    let message = "";

    if (eventType === "created") {
      // Send to mentioned user
      if (!order.mentioned_user_id) {
        return new Response(JSON.stringify({ skipped: true, reason: "no-mentioned-user" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetUserId = order.mentioned_user_id;

      message =
        `📦 *NOVO PEDIDO RECEBIDO*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `${orderNum ? `*Pedido:* ${orderNum}\n` : ""}` +
        `*Solicitante:* ${order.requester_name || "—"}\n` +
        (expectedDate ? `*Data esperada:* ${expectedDate}\n` : "") +
        `\n*Itens:*\n${itemsList || "—"}\n` +
        (order.description ? `\n*Descrição:* ${order.description}\n` : "") +
        (order.notes ? `\n*Observações:* ${order.notes}\n` : "") +
        `\n━━━━━━━━━━━━━━━━━━━━\n` +
        `🔔 Você foi encaminhado(a) para analisar este pedido. Acesse o sistema para dar continuidade.`;
    } else if (eventType === "status_changed") {
      // Send to requester
      targetUserId = order.requester_id;
      const oldLabel = STATUS_LABELS[oldStatus] || oldStatus || "—";
      const newLabel = STATUS_LABELS[newStatus] || newStatus || "—";

      message =
        `📦 *ATUALIZAÇÃO DE PEDIDO*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `${orderNum ? `*Pedido:* ${orderNum}\n` : ""}` +
        `*Produto:* ${order.product_name}\n\n` +
        `*Status anterior:* ${oldLabel}\n` +
        `*Status atual:* ${newLabel}\n` +
        (changerName ? `\n*Atualizado por:* ${changerName}\n` : "") +
        `\n*Itens:*\n${itemsList || "—"}\n` +
        `\n━━━━━━━━━━━━━━━━━━━━\n` +
        `🔔 Acompanhe seu pedido pelo sistema.`;
    } else {
      return new Response(JSON.stringify({ error: "eventType inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get target user phone
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("full_name, whatsapp_number")
      .eq("user_id", targetUserId)
      .single();

    const phone = sanitizePhone(targetProfile?.whatsapp_number || "");
    if (!phone) {
      return new Response(JSON.stringify({ skipped: true, reason: "no-phone" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await sendWapiText(cfg, phone, message);

    return new Response(
      JSON.stringify({ success: result.ok, target: targetProfile?.full_name, phone, eventType, wapi: result }),
      { status: result.ok ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[wapi-order-notify] error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
