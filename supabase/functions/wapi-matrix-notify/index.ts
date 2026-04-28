// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Mirror the cargo definitions from src/pages/Matriz.tsx
const CARGO_FOLDERS = [
  { cargoType: "preposto", cargoLabel: "Preposto", taskIds: ["p1", "p2", "p3", "p4", "p5"] },
  { cargoType: "encarregado_geral", cargoLabel: "Encarregado Geral", taskIds: ["eg1", "eg2", "eg3"] },
  { cargoType: "encarregado_i", cargoLabel: "Encarregado I", taskIds: ["e1-1", "e1-2", "e1-3"] },
  { cargoType: "encarregado_ii", cargoLabel: "Encarregado II", taskIds: ["e2-1", "e2-2", "e2-3"] },
  { cargoType: "tecnico_seguranca_i", cargoLabel: "Téc. Segurança I", taskIds: ["ts1-1", "ts1-2", "ts1-3", "ts1-4", "ts1-5", "ts1-6"] },
  { cargoType: "tecnico_seguranca_ii", cargoLabel: "Téc. Segurança II", taskIds: ["ts2-1", "ts2-2", "ts2-3", "ts2-4", "ts2-5", "ts2-6"] },
];

const sanitizePhone = (raw) => {
  let digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
  return digits;
};

const buildWapiEndpoint = (rawUrl, instanceId) => {
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

// Pará UTC-4 month-year YYYY-MM
const paraMonthYear = () => {
  const now = new Date();
  const para = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  return `${para.getUTCFullYear()}-${String(para.getUTCMonth() + 1).padStart(2, "0")}`;
};

const monthLabelPT = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return `${meses[m - 1]}/${y}`;
};

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

    if (!cfg.auto_send_matrix_alert && !force) {
      return new Response(JSON.stringify({ skipped: true, reason: "Alerta de Matriz desabilitado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groupId = (cfg.group_id || "").trim();
    if (!groupId) {
      return new Response(JSON.stringify({ skipped: true, reason: "ID do grupo não configurado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const monthYear = paraMonthYear();
    const allCargos = CARGO_FOLDERS.map((c) => c.cargoType);

    // Busca todos os usuários relevantes (com cargo nos folders)
    const { data: profiles, error: profErr } = await admin
      .from("profiles")
      .select("user_id, full_name, cargo")
      .in("cargo", allCargos);
    if (profErr) throw profErr;

    // Busca todas as completions do mês
    const { data: completions, error: compErr } = await admin
      .from("matrix_task_completions")
      .select("user_id, task_id")
      .eq("month_year", monthYear);
    if (compErr) throw compErr;

    // Agrupa por user_id
    const byUser = new Map();
    for (const c of completions || []) {
      if (!byUser.has(c.user_id)) byUser.set(c.user_id, new Set());
      byUser.get(c.user_id).add(c.task_id);
    }

    // Para cada cargo, identifica quem está pendente
    const sectionsPending = []; // { cargoLabel, pending: [{name, missingCount, totalCount}] }
    const allUsersOfMatrix = [];
    for (const folder of CARGO_FOLDERS) {
      const usersOfCargo = (profiles || []).filter((p) => p.cargo === folder.cargoType);
      if (usersOfCargo.length === 0) continue;
      const pending = [];
      for (const u of usersOfCargo) {
        allUsersOfMatrix.push(u);
        const done = byUser.get(u.user_id) || new Set();
        const missing = folder.taskIds.filter((t) => !done.has(t));
        if (missing.length > 0) {
          const missingNames = missing.map((id) => {
            // task names will be resolved by the human-readable map below
            return TASK_NAME_MAP[id] || id;
          });
          pending.push({
            name: u.full_name || "(sem nome)",
            missingCount: missing.length,
            totalCount: folder.taskIds.length,
            missingNames,
          });
        }
      }
      sectionsPending.push({ cargoLabel: folder.cargoLabel, total: usersOfCargo.length, pending });
    }

    const totalPending = sectionsPending.reduce((acc, s) => acc + s.pending.length, 0);
    const totalUsers = allUsersOfMatrix.length;

    const lines = [];
    lines.push(`📊 *MATRIZ DE RESPONSABILIDADES*`);
    lines.push(`📅 Mês de referência: *${monthLabelPT(monthYear)}*`);
    lines.push("");

    if (totalUsers === 0) {
      lines.push(`ℹ️ Nenhum usuário com cargo da Matriz cadastrado.`);
    } else if (totalPending === 0) {
      lines.push(`✅ *TODOS preencheram a Matriz deste mês!*`);
      lines.push("");
      lines.push(`🎉 *PARABÉNS A TODA A EQUIPE!* 🎉`);
      lines.push(`Excelente engajamento e compromisso com a segurança! 👏👏👏`);
    } else {
      lines.push(`⚠️ *${totalPending} colaborador(es) ainda não preencheram TODAS as tarefas:*`);
      lines.push("");
      for (const s of sectionsPending) {
        if (s.pending.length === 0) continue;
        lines.push(`━━━━━━━━━━━━━━━━━━━━`);
        lines.push(`🏷️ *${s.cargoLabel}* (${s.pending.length}/${s.total} pendente)`);
        for (const p of s.pending) {
          lines.push(`• 👤 ${p.name} — *${p.missingCount}/${p.totalCount}* tarefa(s) pendente(s)`);
          for (const n of p.missingNames) {
            lines.push(`     ⛔ ${n}`);
          }
        }
      }
      lines.push("");
      lines.push(`📌 Por favor, acessem o sistema e concluam suas tarefas o quanto antes!`);
    }

    lines.push("");
    lines.push(`_Mensagem automática - Sucena_`);
    const message = lines.join("\n");

    const endpoint = buildWapiEndpoint(cfg.instance_url, cfg.instance_id);
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
          phone: groupId,
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
        recipient_name: "Grupo - Matriz",
        recipient_phone: groupId,
        message,
        status: ok ? "sent" : "failed",
        error_message: errorMsg,
      });
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : "Erro desconhecido";
      await admin.from("wapi_message_logs").insert({
        sent_by: null,
        recipient_user_id: null,
        recipient_name: "Grupo - Matriz",
        recipient_phone: groupId,
        message,
        status: "failed",
        error_message: errorMsg,
      });
    }

    return new Response(JSON.stringify({
      success: ok,
      monthYear,
      totalUsers,
      totalPending,
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

// Names of tasks (mirrored from src/pages/Matriz.tsx)
const TASK_NAME_MAP = {
  // Preposto
  "p1": "DDS de Liderança",
  "p2": "WOC - Caminhar, Observar e Conversar",
  "p3": "Observação de Tarefas",
  "p4": "Inspeção em HSE",
  "p5": "Roda de Conversa",
  // Encarregado Geral
  "eg1": "Evento sem Lesão / Condição de Risco",
  "eg2": "Observação de Tarefa",
  "eg3": "Inspeção de HSE",
  // Encarregado I
  "e1-1": "Evento sem Lesão / Condição de Risco",
  "e1-2": "Observação de Tarefa",
  "e1-3": "Inspeção de HSE",
  // Encarregado II
  "e2-1": "Evento sem Lesão / Condição de Risco",
  "e2-2": "Observação de Tarefa",
  "e2-3": "Inspeção de HSE",
  // Téc. Segurança I
  "ts1-1": "DDS da Liderança",
  "ts1-2": "WOC - Caminhar, Observar e Conversar",
  "ts1-3": "Inspeção de HSE",
  "ts1-4": "Evento sem Lesão / Condição de Risco (ALTO RISCO)",
  "ts1-5": "Coach em HSE",
  "ts1-6": "Observação de Tarefa",
  // Téc. Segurança II
  "ts2-1": "DDS da Liderança",
  "ts2-2": "WOC - Caminhar, Observar e Conversar",
  "ts2-3": "Inspeção de HSE",
  "ts2-4": "Evento sem Lesão / Condição de Risco (ALTO RISCO)",
  "ts2-5": "Coach em HSE",
  "ts2-6": "Observação de Tarefa",
};
