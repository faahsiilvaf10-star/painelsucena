import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment",
};

const GATEWAY = "https://connector-gateway.lovable.dev/microsoft_excel";
const FILE_NAME_HINT = "Avanço Mensal"; // procura por esse nome
const SHEET_NAME_HINT = ""; // primeira sheet por padrão

interface ExcelRange {
  values?: (string | number | null)[][];
}

async function gw(path: string): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const MS_KEY = Deno.env.get("MICROSOFT_EXCEL_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");
  if (!MS_KEY) throw new Error("MICROSOFT_EXCEL_API_KEY ausente");
  return fetch(`${GATEWAY}${path}`, {
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": MS_KEY,
    },
  });
}

async function findFileId(): Promise<{ id: string; name: string } | null> {
  // 1) tenta no próprio drive
  let r = await gw(
    `/me/drive/root/search(q='${encodeURIComponent(FILE_NAME_HINT)}')?$top=10&$select=id,name,file`,
  );
  let j = await r.json();
  let hit = (j?.value ?? []).find((v: { file?: unknown; name: string }) =>
    v.file && v.name?.toLowerCase().endsWith(".xlsx"),
  );
  if (hit) return { id: hit.id, name: hit.name };

  // 2) tenta em "Compartilhados comigo"
  r = await gw(`/me/drive/sharedWithMe?$top=50`);
  j = await r.json();
  hit = (j?.value ?? []).find((v: { name?: string }) =>
    v.name?.toLowerCase().includes(FILE_NAME_HINT.toLowerCase()) &&
    v.name?.toLowerCase().endsWith(".xlsx"),
  );
  if (hit) {
    // sharedWithMe retorna remoteItem; precisamos do driveId+itemId
    const remote = (hit as { remoteItem?: { id: string; parentReference?: { driveId?: string } } }).remoteItem;
    if (remote?.id && remote?.parentReference?.driveId) {
      return { id: `drives/${remote.parentReference.driveId}/items/${remote.id}`, name: hit.name };
    }
    return { id: hit.id, name: hit.name };
  }
  return null;
}

function buildItemPath(idOrPath: string): string {
  // Se já contém "drives/", usa como path absoluto
  if (idOrPath.startsWith("drives/")) return `/${idOrPath}`;
  return `/me/drive/items/${idOrPath}`;
}

async function readUsedRange(itemPath: string, sheetName?: string): Promise<ExcelRange> {
  // pega primeira sheet se não informada
  let sheet = sheetName;
  if (!sheet) {
    const r = await gw(`${itemPath}/workbook/worksheets?$select=name,position`);
    const j = await r.json();
    if (!r.ok) throw new Error(`Falha ao listar abas: ${JSON.stringify(j)}`);
    const first = (j?.value ?? []).sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position,
    )[0];
    if (!first) throw new Error("Planilha sem abas");
    sheet = first.name as string;
  }
  const r = await gw(
    `${itemPath}/workbook/worksheets/${encodeURIComponent(sheet)}/usedRange?$select=values`,
  );
  const j = await r.json();
  if (!r.ok) throw new Error(`Falha ao ler usedRange: ${JSON.stringify(j)}`);
  return j as ExcelRange;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\./g, "").replace(",", ".").replace(/[^\d.\-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const file = await findFileId();
    if (!file) {
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            "Planilha não encontrada. Compartilhe 'Avanço Mensal - Meta DRS.xlsx' com a conta conectada (ffaahsiilva@hotmail.com) com permissão de Edição.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const itemPath = buildItemPath(file.id);
    const range = await readUsedRange(itemPath, SHEET_NAME_HINT || undefined);
    const rows = range.values ?? [];

    // Heurística: cada linha que tem um número na coluna A (linha numérica)
    // e nome de atividade na coluna B/C, com meta/realizado em colunas seguintes.
    // Vamos fazer match por número da "linha" (campo planejamento_metas.linha).
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, key);

    const { data: metas, error: mErr } = await sb
      .from("planejamento_metas")
      .select("id, linha, atividade, meta, realizado")
      .not("linha", "is", null);
    if (mErr) throw mErr;

    const byLinha = new Map<number, { id: string; meta: number; realizado: number }>();
    for (const m of metas ?? []) {
      if (typeof m.linha === "number") byLinha.set(m.linha, m);
    }

    let updated = 0;
    let scanned = 0;
    const samples: Array<{ linha: number; meta: number | null; realizado: number | null }> = [];

    for (const row of rows) {
      const linha = num(row[0]);
      if (linha === null) continue;
      scanned++;
      const target = byLinha.get(linha);
      if (!target) continue;

      // Detecta colunas "Meta" e "Realizado" — heurística: dois últimos números da linha,
      // sendo meta o maior dos dois normalmente. Para robustez, procuramos por números nas
      // últimas 6 colunas e usamos os dois primeiros encontrados a partir do fim.
      const tail = row.slice(-8).map(num).filter((v): v is number => v !== null);
      let metaVal: number | null = null;
      let realVal: number | null = null;
      if (tail.length >= 2) {
        // assume [..., realizado, meta] ou [..., meta, realizado] — pega os 2 últimos
        const a = tail[tail.length - 2];
        const b = tail[tail.length - 1];
        // se um deles é claramente maior, esse é a meta; caso contrário mantém ordem [meta, realizado]
        metaVal = Math.max(a, b);
        realVal = Math.min(a, b);
      } else if (tail.length === 1) {
        realVal = tail[0];
      }

      if (samples.length < 5) samples.push({ linha, meta: metaVal, realizado: realVal });

      const patch: Record<string, number> = {};
      if (metaVal !== null && metaVal !== Number(target.meta)) patch.meta = metaVal;
      if (realVal !== null && realVal !== Number(target.realizado)) patch.realizado = realVal;
      if (Object.keys(patch).length === 0) continue;

      const { error: uErr } = await sb
        .from("planejamento_metas")
        .update(patch)
        .eq("id", target.id);
      if (!uErr) updated++;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        file: file.name,
        rows: rows.length,
        scanned,
        updated,
        samples,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("sync-planejamento-excel error:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
