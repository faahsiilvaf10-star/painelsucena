import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment",
};

const GATEWAY = "https://connector-gateway.lovable.dev/microsoft_excel";
const FILE_NAME_HINT = "Avanço Mensal"; // procura por esse nome (sharedWithMe)
const SHEET_NAME_HINT = ""; // primeira sheet por padrão
// Layout fixo da planilha: A=LINHA, B=ATIVIDADE, C=META (BM), D=REALIZADO, E=%, F=UNID.
const COL_LINHA = 0;
const COL_META = 2;
const COL_REAL = 3;

interface ExcelRange {
  values?: (string | number | null)[][];
}

interface FoundWorkbook {
  itemPath: string;
  name: string;
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

async function canAccessWorkbook(itemPath: string): Promise<boolean> {
  const r = await gw(`${itemPath}/workbook/worksheets?$top=1&$select=name`);
  return r.ok;
}

async function findWorkbook(): Promise<FoundWorkbook | null> {
  const candidates: FoundWorkbook[] = [];

  let r = await gw(
    `/me/drive/root/search(q='${encodeURIComponent(FILE_NAME_HINT)}')?$top=10&$select=id,name,file`,
  );
  let j = await r.json();
  for (const hit of j?.value ?? []) {
    if (hit?.file && hit?.name?.toLowerCase().endsWith(".xlsx")) {
      candidates.push({
        itemPath: `/me/drive/items/${encodeURIComponent(hit.id)}`,
        name: hit.name,
      });
    }
  }

  r = await gw(`/me/drive/sharedWithMe?$top=50`);
  j = await r.json();
  for (const hit of j?.value ?? []) {
    if (!hit?.name?.toLowerCase().includes(FILE_NAME_HINT.toLowerCase())) continue;
    if (!hit?.name?.toLowerCase().endsWith(".xlsx")) continue;

    const remote = hit.remoteItem as { id?: string; parentReference?: { driveId?: string } } | undefined;
    if (remote?.id && remote?.parentReference?.driveId) {
      candidates.push({
        itemPath:
          `/drives/${encodeURIComponent(remote.parentReference.driveId)}` +
          `/items/${encodeURIComponent(remote.id)}`,
        name: hit.name,
      });
      continue;
    }

    if (hit?.id) {
      candidates.push({
        itemPath: `/me/drive/items/${encodeURIComponent(hit.id)}`,
        name: hit.name,
      });
    }
  }

  for (const candidate of candidates) {
    if (await canAccessWorkbook(candidate.itemPath)) {
      return candidate;
    }
  }

  return candidates[0] ?? null;
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
    const workbook = await findWorkbook();
    if (!workbook) {
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            "Planilha não encontrada. Compartilhe 'Avanço Mensal - Meta DRS.xlsx' com a conta conectada (ffaahsiilva@hotmail.com) com permissão de Edição.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const range = await readUsedRange(workbook.itemPath, SHEET_NAME_HINT || undefined);
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
      const linha = num(row[COL_LINHA]);
      if (linha === null) continue;
      scanned++;
      const target = byLinha.get(linha);
      if (!target) continue;

      const metaVal = num(row[COL_META]);
      const realVal = num(row[COL_REAL]);

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
        file: workbook.name,
        itemPath: workbook.itemPath,
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
