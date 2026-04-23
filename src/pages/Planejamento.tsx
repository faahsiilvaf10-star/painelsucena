import { useEffect, useMemo, useRef, useState } from "react";
import { Target, TrendingUp, CheckCircle2, AlertCircle, Pencil, Save, X, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlanejamentoMetas, useUpdatePlanejamentoMeta, type PlanejamentoMeta } from "@/hooks/usePlanejamentoMetas";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";

function pct(realizado: number, meta: number) {
  if (!meta || meta <= 0) return 0;
  return Math.min(100, (realizado / meta) * 100);
}

function progressTone(p: number) {
  if (p >= 100) return "text-emerald-600";
  if (p >= 50) return "text-amber-600";
  if (p > 0) return "text-orange-600";
  return "text-muted-foreground";
}

function MetaRow({ meta, canEdit }: { meta: PlanejamentoMeta; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [metaVal, setMetaVal] = useState(String(meta.meta));
  const [realVal, setRealVal] = useState(String(meta.realizado));
  const update = useUpdatePlanejamentoMeta();

  const p = pct(meta.realizado, meta.meta);
  const tone = progressTone(p);
  const completed = p >= 100 && meta.meta > 0;

  const save = () => {
    update.mutate(
      { id: meta.id, meta: Number(metaVal) || 0, realizado: Number(realVal) || 0 },
      { onSuccess: () => setEditing(false) }
    );
  };

  return (
    <div className="rounded-lg border bg-card p-4 hover:bg-accent/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {meta.linha !== null && (
              <Badge variant="outline" className="font-mono text-xs">
                {meta.linha}
              </Badge>
            )}
            {completed ? (
              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 hover:bg-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Concluída
              </Badge>
            ) : meta.meta > 0 ? (
              <Badge variant="secondary" className="text-xs">
                <AlertCircle className="w-3 h-3 mr-1" /> Em andamento
              </Badge>
            ) : null}
            {meta.unidade && (
              <span className="text-xs text-muted-foreground">{meta.unidade}</span>
            )}
          </div>
          <p className="mt-2 text-sm font-medium leading-snug">{meta.atividade}</p>
        </div>
        {canEdit && !editing && (
          <Button variant="ghost" size="icon" onClick={() => setEditing(true)} className="h-8 w-8 shrink-0">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {editing ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground">Meta</label>
            <Input type="number" value={metaVal} onChange={(e) => setMetaVal(e.target.value)} className="h-8" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Realizado</label>
            <Input type="number" value={realVal} onChange={(e) => setRealVal(e.target.value)} className="h-8" />
          </div>
          <div className="flex gap-1 col-span-2 sm:col-span-1">
            <Button size="sm" onClick={save} disabled={update.isPending} className="flex-1">
              <Save className="w-3.5 h-3.5 mr-1" /> Salvar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{meta.realizado.toLocaleString("pt-BR")}</span>
              {" / "}
              <span>{meta.meta.toLocaleString("pt-BR")}</span>
              {meta.unidade ? ` ${meta.unidade}` : ""}
            </span>
            <span className={cn("font-bold tabular-nums", tone)}>{p.toFixed(2)}%</span>
          </div>
          <Progress value={p} className="h-2" />
        </div>
      )}
    </div>
  );
}

export default function Planejamento() {
  const { data: metas = [], isLoading } = usePlanejamentoMetas();
  const { isStrictAdmin } = useIsAdmin();
  const { data: profile } = useProfile();
  const canEdit = isStrictAdmin || profile?.cargo === "planejador";
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const autoSyncRef = useRef(false);

  const runSync = async (silent: boolean) => {
    if (autoSyncRef.current) return;
    autoSyncRef.current = true;
    if (!silent) setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-planejamento-excel");
      if (error) throw error;
      const d = data as { ok: boolean; updated?: number; error?: string };
      if (!d.ok) throw new Error(d.error || "Falha na sincronização");
      if (!silent) {
        toast.success(`Sincronizado: ${d.updated ?? 0} meta(s) atualizada(s)`);
      }
      qc.invalidateQueries({ queryKey: ["planejamento-metas"] });
    } catch (e) {
      if (!silent) {
        toast.error(e instanceof Error ? e.message : "Erro ao sincronizar");
      } else {
        console.warn("[Planejamento] Auto-sync falhou:", e);
      }
    } finally {
      if (!silent) setSyncing(false);
      autoSyncRef.current = false;
    }
  };

  const handleSync = () => runSync(false);

  // Sincronização automática a cada 5 minutos (silenciosa)
  useEffect(() => {
    // dispara a primeira sincronização logo ao montar
    runSync(true);
    const interval = setInterval(() => {
      runSync(true);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    const groups: { categoria: string; items: PlanejamentoMeta[] }[] = [];
    let current: { categoria: string; items: PlanejamentoMeta[] } | null = null;
    for (const m of metas) {
      if (m.is_section_header) {
        current = { categoria: m.atividade, items: [] };
        groups.push(current);
      } else if (current) {
        current.items.push(m);
      }
    }
    return groups;
  }, [metas]);

  const summary = useMemo(() => {
    const items = metas.filter((m) => !m.is_section_header && m.meta > 0);
    const total = items.length;
    const completed = items.filter((m) => m.realizado >= m.meta).length;
    const totalMeta = items.reduce((s, m) => s + m.meta, 0);
    const totalReal = items.reduce((s, m) => s + Math.min(m.realizado, m.meta), 0);
    const overall = totalMeta > 0 ? (totalReal / totalMeta) * 100 : 0;
    return { total, completed, overall };
  }, [metas]);

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Target className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl sm:text-3xl font-bold text-gradient">Planejamento</h1>
          <p className="text-sm text-muted-foreground">
            Avanço Mensal — Meta DRS. Cada linha representa uma meta a bater.
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm">
            <RefreshCw className={cn("w-4 h-4 mr-2", syncing && "animate-spin")} />
            {syncing ? "Sincronizando..." : "Sincronizar agora"}
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Avanço geral
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{summary.overall.toFixed(2)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={summary.overall} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Metas concluídas</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {summary.completed}
              <span className="text-base font-normal text-muted-foreground"> / {summary.total}</span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de atividades</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{metas.filter((m) => !m.is_section_header).length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Sections */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="h-[calc(100vh-22rem)] overflow-y-auto pr-2 space-y-6 rounded-lg">
          {grouped.map((group) => (
            <Card key={group.categoria}>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">{group.categoria}</CardTitle>
                <CardDescription>
                  {group.items.length} {group.items.length === 1 ? "meta" : "metas"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.items.map((m) => (
                  <MetaRow key={m.id} meta={m} canEdit={canEdit} />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
