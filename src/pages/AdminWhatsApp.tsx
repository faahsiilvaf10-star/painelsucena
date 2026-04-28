import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageCircle, Save, Send, Search, Users, Bell, Play } from "lucide-react";

const formatBR = (digits: string): string => {
  const d = (digits || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const AdminWhatsApp = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const queryClient = useQueryClient();

  const [instanceUrl, setInstanceUrl] = useState("");
  const [instanceToken, setInstanceToken] = useState("");
  const [instanceId, setInstanceId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [delaySeconds, setDelaySeconds] = useState<number>(5);
  const [groupId, setGroupId] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [sendToGroup, setSendToGroup] = useState(false);
  const [groupIdOverride, setGroupIdOverride] = useState("");
  const [ddsAutoNotify, setDdsAutoNotify] = useState(false);
  const [ddsNotifyDayBefore, setDdsNotifyDayBefore] = useState(false);
  const [autoSendReq, setAutoSendReq] = useState(false);
  const [autoSendReminders, setAutoSendReminders] = useState(false);
  const [autoSendAsoAlert, setAutoSendAsoAlert] = useState(false);
  const [autoSendMatrixAlert, setAutoSendMatrixAlert] = useState(false);
  const [autoSendForbiddenColorAlert, setAutoSendForbiddenColorAlert] = useState(false);
  const [autoSendCampaignAlert, setAutoSendCampaignAlert] = useState(false);
  const [autoSendOrderAlerts, setAutoSendOrderAlerts] = useState(false);
  const [autoSendEquipmentMovements, setAutoSendEquipmentMovements] = useState(false);
  const [autoSendPlanningAlerts, setAutoSendPlanningAlerts] = useState(false);
  const [testingPlanning, setTestingPlanning] = useState(false);
  const [testingDds, setTestingDds] = useState(false);
  const [testingDdsTomorrow, setTestingDdsTomorrow] = useState(false);
  const [testingAso, setTestingAso] = useState(false);
  const [testingMatrix, setTestingMatrix] = useState(false);
  const [testingForbiddenColor, setTestingForbiddenColor] = useState(false);
  const [testingCampaign, setTestingCampaign] = useState(false);

  const { data: cfg } = useQuery({
    queryKey: ["wapi-config"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wapi_config" as never)
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; instance_url: string; instance_token: string; instance_id: string; enabled: boolean; delay_seconds: number | null; group_id: string | null; dds_auto_notify: boolean | null; dds_notify_day_before: boolean | null; auto_send_requisitions: boolean | null; auto_send_reminders: boolean | null; auto_send_aso_alert: boolean | null; auto_send_matrix_alert: boolean | null; auto_send_forbidden_color_alert: boolean | null; auto_send_campaign_alert: boolean | null; auto_send_order_alerts: boolean | null; auto_send_equipment_movements: boolean | null; auto_send_planning_alerts: boolean | null } | null;
    },
  });

  useEffect(() => {
    if (cfg) {
      setInstanceUrl(cfg.instance_url || "");
      setInstanceToken(cfg.instance_token || "");
      setInstanceId(cfg.instance_id || "");
      setEnabled(!!cfg.enabled);
      setDelaySeconds(typeof cfg.delay_seconds === "number" ? cfg.delay_seconds : 5);
      setGroupId(cfg.group_id || "");
      setDdsAutoNotify(!!cfg.dds_auto_notify);
      setDdsNotifyDayBefore(!!cfg.dds_notify_day_before);
      setAutoSendReq(!!cfg.auto_send_requisitions);
      setAutoSendReminders(!!cfg.auto_send_reminders);
      setAutoSendAsoAlert(!!cfg.auto_send_aso_alert);
      setAutoSendMatrixAlert(!!cfg.auto_send_matrix_alert);
      setAutoSendForbiddenColorAlert(!!cfg.auto_send_forbidden_color_alert);
      setAutoSendCampaignAlert(!!cfg.auto_send_campaign_alert);
      setAutoSendOrderAlerts(!!cfg.auto_send_order_alerts);
      setAutoSendEquipmentMovements(!!cfg.auto_send_equipment_movements);
      setAutoSendPlanningAlerts(!!cfg.auto_send_planning_alerts);
    }
  }, [cfg]);

  const { data: profiles } = useQuery({
    queryKey: ["wapi-profiles"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, whatsapp_number")
        .not("whatsapp_number", "is", null)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data || []).filter((p: { whatsapp_number: string | null }) => (p.whatsapp_number || "").length >= 10);
    },
  });

  const { data: logs } = useQuery({
    queryKey: ["wapi-logs"],
    enabled: !!user && isAdmin,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wapi_message_logs" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Array<{ id: string; recipient_name: string | null; recipient_phone: string; status: string; error_message: string | null; created_at: string; message: string }>;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles || [];
    return (profiles || []).filter((p: { full_name: string | null; whatsapp_number: string | null }) =>
      (p.full_name || "").toLowerCase().includes(q) ||
      (p.whatsapp_number || "").includes(q)
    );
  }, [profiles, search]);

  const allSelected = filtered.length > 0 && filtered.every((p: { user_id: string }) => selected.has(p.user_id));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) {
      filtered.forEach((p: { user_id: string }) => next.delete(p.user_id));
    } else {
      filtered.forEach((p: { user_id: string }) => next.add(p.user_id));
    }
    setSelected(next);
  };

  const saveConfig = useMutation({
    mutationFn: async () => {
      const payload = {
        instance_url: instanceUrl.trim(),
        instance_token: instanceToken.trim(),
        instance_id: instanceId.trim(),
        group_id: groupId.trim() || null,
        enabled,
        delay_seconds: Math.max(0, Math.min(600, Math.floor(Number(delaySeconds) || 0))),
        dds_auto_notify: ddsAutoNotify,
        dds_notify_day_before: ddsNotifyDayBefore,
        auto_send_requisitions: autoSendReq,
        auto_send_reminders: autoSendReminders,
        auto_send_aso_alert: autoSendAsoAlert,
        auto_send_matrix_alert: autoSendMatrixAlert,
        auto_send_forbidden_color_alert: autoSendForbiddenColorAlert,
        auto_send_campaign_alert: autoSendCampaignAlert,
        auto_send_order_alerts: autoSendOrderAlerts,
        auto_send_equipment_movements: autoSendEquipmentMovements,
        updated_by: user?.id ?? null,
      };
      if (cfg?.id) {
        const { error } = await supabase.from("wapi_config" as never).update(payload).eq("id", cfg.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("wapi_config" as never).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Configuração salva");
      queryClient.invalidateQueries({ queryKey: ["wapi-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSend = async () => {
    if (!message.trim()) return toast.error("Escreva uma mensagem");

    const targetGroup = (groupIdOverride.trim() || groupId.trim());
    if (sendToGroup && !targetGroup) return toast.error("Informe o ID do grupo");
    if (!sendToGroup && selected.size === 0) return toast.error("Selecione ao menos um destinatário");

    const recipients = sendToGroup
      ? []
      : (profiles || [])
          .filter((p: { user_id: string }) => selected.has(p.user_id))
          .map((p: { user_id: string; full_name: string | null; whatsapp_number: string | null }) => ({
            user_id: p.user_id,
            name: p.full_name,
            phone: p.whatsapp_number || "",
          }));

    setSending(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Sessão expirada. Faça login novamente.");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-send`;
      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: message.trim(),
            recipients,
            group_id: sendToGroup ? targetGroup : null,
          }),
        });
      } catch (netErr) {
        const detail = netErr instanceof Error ? `${netErr.name}: ${netErr.message}` : String(netErr);
        toast.error(`Falha de rede ao chamar ${url}`, { description: detail, duration: 15000 });
        console.error("[wapi-send] network error", netErr);
        throw netErr;
      }

      const responseText = await response.text();
      let data: any = null;
      try { data = responseText ? JSON.parse(responseText) : null; } catch { /* keep raw */ }

      if (!response.ok) {
        const preview = (responseText || "(sem corpo)").slice(0, 500);
        toast.error(`Erro HTTP ${response.status} ${response.statusText}`, {
          description: preview,
          duration: 15000,
        });
        console.error("[wapi-send] http error", response.status, responseText);
        throw new Error(`HTTP ${response.status}: ${preview}`);
      }

      const res = data as { sent: number; total: number; errors?: any[] };
      toast.success(`${res.sent}/${res.total} enviadas`);
      if (res.errors?.length) {
        toast.error(`${res.errors.length} falha(s) no envio`, {
          description: JSON.stringify(res.errors).slice(0, 500),
          duration: 15000,
        });
      }
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["wapi-logs"] });
    } catch (e) {
      // Toast detalhado já foi emitido nos blocos acima; aqui só fallback
      const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      console.error("[wapi-send] final catch", e);
      // Evita toast duplicado se já tratado
      if (!msg.startsWith("HTTP ") && !msg.includes("Falha de rede")) {
        toast.error(msg, { duration: 15000 });
      }
    } finally {
      setSending(false);
    }
  };

  const handleTestDdsNotify = async (mode: "today" | "tomorrow" = "today") => {
    if (mode === "tomorrow") setTestingDdsTomorrow(true); else setTestingDds(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-dds-notify`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const text = await response.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* keep raw */ }

      if (!response.ok) {
        toast.error(`Erro HTTP ${response.status}`, { description: text.slice(0, 500), duration: 15000 });
        return;
      }
      if (data?.skipped) {
        toast.info("Nada a enviar", { description: data.reason || "Sem DDS encontrado", duration: 8000 });
      } else {
        toast.success(`DDS (${mode === "tomorrow" ? "amanhã" : "hoje"}): ${data?.sent ?? 0}/${data?.total ?? 0} enviadas`);
        if (Array.isArray(data?.results)) {
          const failed = data.results.filter((r: { ok: boolean }) => !r.ok);
          if (failed.length) {
            toast.error(`${failed.length} falha(s)`, { description: JSON.stringify(failed).slice(0, 500), duration: 15000 });
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: ["wapi-logs"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Falha ao executar teste", { description: msg, duration: 15000 });
    } finally {
      if (mode === "tomorrow") setTestingDdsTomorrow(false); else setTestingDds(false);
    }
  };

  const handleTestAsoNotify = async () => {
    setTestingAso(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-aso-notify`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const text = await response.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* keep raw */ }

      if (!response.ok) {
        toast.error(`Erro HTTP ${response.status}`, { description: text.slice(0, 500), duration: 15000 });
        return;
      }
      if (data?.skipped) {
        toast.info("Nada a enviar", { description: data.reason || "Nenhum ASO no alvo", duration: 8000 });
      } else if (data?.success) {
        toast.success(`Alerta de ASO enviado (${data.total} colaborador(es))`);
      } else {
        toast.error("Falha no envio", { description: data?.error || "Erro desconhecido", duration: 15000 });
      }
      queryClient.invalidateQueries({ queryKey: ["wapi-logs"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Falha ao executar teste", { description: msg, duration: 15000 });
    } finally {
      setTestingAso(false);
    }
  };

  const handleTestMatrixNotify = async () => {
    setTestingMatrix(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-matrix-notify`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const text = await response.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* keep raw */ }

      if (!response.ok) {
        toast.error(`Erro HTTP ${response.status}`, { description: text.slice(0, 500), duration: 15000 });
        return;
      }
      if (data?.skipped) {
        toast.info("Nada enviado", { description: data.reason || "—", duration: 8000 });
      } else if (data?.success) {
        if (data.totalPending === 0) {
          toast.success(`Matriz: todos preencheram! 🎉`);
        } else {
          toast.success(`Matriz enviada (${data.totalPending} pendente(s) de ${data.totalUsers})`);
        }
      } else {
        toast.error("Falha no envio", { description: data?.error || "Erro desconhecido", duration: 15000 });
      }
      queryClient.invalidateQueries({ queryKey: ["wapi-logs"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Falha ao executar teste", { description: msg, duration: 15000 });
    } finally {
      setTestingMatrix(false);
    }
  };

  const handleTestForbiddenColorNotify = async () => {
    setTestingForbiddenColor(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-forbidden-color-notify`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const text = await response.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* keep raw */ }

      if (!response.ok) {
        toast.error(`Erro HTTP ${response.status}`, { description: text.slice(0, 500), duration: 15000 });
        return;
      }
      if (data?.skipped) {
        toast.info("Nada enviado", { description: data.reason || "—", duration: 8000 });
      } else if (data?.success) {
        toast.success(`Cor proibida enviada: ${data.color} (${data.month})`);
      } else {
        toast.error("Falha no envio", { description: data?.error || "Erro desconhecido", duration: 15000 });
      }
      queryClient.invalidateQueries({ queryKey: ["wapi-logs"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Falha ao executar teste", { description: msg, duration: 15000 });
    } finally {
      setTestingForbiddenColor(false);
    }
  };

  const handleTestCampaignNotify = async () => {
    setTestingCampaign(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-campaign-notify`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const text = await response.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* keep raw */ }

      if (!response.ok) {
        toast.error(`Erro HTTP ${response.status}`, { description: text.slice(0, 500), duration: 15000 });
        return;
      }
      if (data?.skipped) {
        toast.info("Nada enviado", { description: data.reason || "—", duration: 8000 });
      } else if (data?.success) {
        toast.success(`Campanha do mês enviada: ${data.month}${data.hasImage ? " (com imagem)" : " (sem imagem)"}`);
      } else {
        toast.error("Falha no envio", { description: data?.error || "Erro desconhecido", duration: 15000 });
      }
      queryClient.invalidateQueries({ queryKey: ["wapi-logs"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Falha ao executar teste", { description: msg, duration: 15000 });
    } finally {
      setTestingCampaign(false);
    }
  };

  if (authLoading || adminLoading) return <Layout><div className="p-8">Carregando...</div></Layout>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-6xl">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">WhatsApp API (W-API)</h1>
            <p className="text-sm text-muted-foreground">Configure a instância e envie mensagens automáticas</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuração da Instância</CardTitle>
            <CardDescription>Informe a URL base da instância W-API, o ID da instância e o Token de autenticação.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>URL da Instância</Label>
                <Input
                  placeholder="https://api.w-api.app/v1"
                  value={instanceUrl}
                  onChange={(e) => setInstanceUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Instance ID</Label>
                <Input
                  placeholder="ABCDE-12345"
                  value={instanceId}
                  onChange={(e) => setInstanceId(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Token</Label>
              <Input
                type="password"
                placeholder="Bearer token da instância"
                value={instanceToken}
                onChange={(e) => setInstanceToken(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wapi-group">ID do Grupo (opcional)</Label>
              <Input
                id="wapi-group"
                placeholder="120363XXXXXXXXXXXX@g.us"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Informe o ID do grupo do WhatsApp (formato: 120363...@g.us). Será usado quando a opção "Enviar para grupo" estiver ativa.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wapi-delay">Intervalo entre envios (segundos)</Label>
              <Input
                id="wapi-delay"
                type="number"
                min={0}
                max={600}
                step={1}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Aguarda esse tempo entre cada mensagem para evitar bloqueio/banimento do número no WhatsApp. Recomendado: 5–15s.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Switch checked={enabled} onCheckedChange={setEnabled} id="wapi-enabled" />
                <Label htmlFor="wapi-enabled">Integração habilitada</Label>
              </div>
              <Button onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending}>
                <Save className="w-4 h-4 mr-2" /> Salvar Configuração
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Lembrete Automático do DDS
            </CardTitle>
            <CardDescription>
              Envia mensagens automáticas no WhatsApp do palestrante agendado, com base no horário do Pará.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="dds-auto-notify"
                  checked={ddsAutoNotify}
                  onCheckedChange={setDdsAutoNotify}
                />
                <Label htmlFor="dds-auto-notify" className="cursor-pointer">
                  Lembrete às <strong>06:00h do dia do DDS</strong> (hoje é o seu dia)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={ddsAutoNotify ? "default" : "secondary"}>
                  {ddsAutoNotify ? "Ativo" : "Desativado"}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => handleTestDdsNotify("today")} disabled={testingDds}>
                  <Play className="w-4 h-4 mr-1" />
                  {testingDds ? "..." : "Testar"}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="dds-notify-day-before"
                  checked={ddsNotifyDayBefore}
                  onCheckedChange={setDdsNotifyDayBefore}
                />
                <Label htmlFor="dds-notify-day-before" className="cursor-pointer">
                  Aviso <strong>1 dia antes às 16:00h</strong> (você palestra amanhã)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={ddsNotifyDayBefore ? "default" : "secondary"}>
                  {ddsNotifyDayBefore ? "Ativo" : "Desativado"}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => handleTestDdsNotify("tomorrow")} disabled={testingDdsTomorrow}>
                  <Play className="w-4 h-4 mr-1" />
                  {testingDdsTomorrow ? "..." : "Testar"}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Requisitos: integração W-API habilitada, palestrante com usuário interno cadastrado e número de WhatsApp preenchido no perfil.
              Lembre-se de salvar a configuração após alterar estes botões.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Envio Automático de Requisições
            </CardTitle>
            <CardDescription>
              Quando habilitado, ao finalizar uma requisição (EPI ou Material) o sistema envia automaticamente
              para o <strong>grupo configurado</strong> uma mensagem com os detalhes dos itens e a <strong>imagem da requisição</strong>,
              respeitando o intervalo de segurança configurado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-req"
                  checked={autoSendReq}
                  onCheckedChange={setAutoSendReq}
                />
                <Label htmlFor="auto-send-req" className="cursor-pointer">
                  Ativar envio automático ao finalizar uma requisição
                </Label>
              </div>
              <Badge variant={autoSendReq ? "default" : "secondary"}>
                {autoSendReq ? "Ativo" : "Desativado"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada e ID do grupo preenchido. Lembre-se de salvar a configuração após alterar este botão.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Envio Automático de Lembretes
            </CardTitle>
            <CardDescription>
              Quando habilitado, o sistema envia automaticamente os lembretes <strong>respeitando o agendamento</strong>:
              <br />• Lembretes <strong>com horário definido</strong> são enviados no horário escolhido (Pará UTC-4).
              <br />• Lembretes <strong>sem horário</strong> são enviados às <strong>06:00h</strong> da manhã.
              <br />• Se houver <strong>aviso antecipado</strong> (ex: 1 dia antes), também é enviado às 06:00h naqueles dias.
              <br />• Lembretes <strong>recorrentes</strong> (dias da semana) são enviados no horário configurado.
              <br />• Se mencionar <strong>todos</strong> → vai para o <strong>grupo configurado</strong>; senão → vai no <strong>privado</strong> do criador e dos usuários mencionados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-reminders"
                  checked={autoSendReminders}
                  onCheckedChange={setAutoSendReminders}
                />
                <Label htmlFor="auto-send-reminders" className="cursor-pointer">
                  Ativar envio automático de lembretes no horário agendado
                </Label>
              </div>
              <Badge variant={autoSendReminders ? "default" : "secondary"}>
                {autoSendReminders ? "Ativo" : "Desativado"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada, ID do grupo preenchido (para lembretes de "todos") e usuários com WhatsApp cadastrado (para envios privados). Lembre-se de salvar a configuração após alterar este botão.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Alerta Automático de ASO (10 dias antes)
            </CardTitle>
            <CardDescription>
              Quando habilitado, o sistema envia automaticamente uma mensagem para o <strong>grupo configurado</strong> quando
              faltarem <strong>10 dias</strong> para o vencimento do ASO de algum colaborador. A verificação roda <strong>diariamente às 06:00h</strong> (Pará UTC-4)
              e cada alerta é enviado apenas <strong>uma vez por colaborador/vencimento</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-aso"
                  checked={autoSendAsoAlert}
                  onCheckedChange={setAutoSendAsoAlert}
                />
                <Label htmlFor="auto-send-aso" className="cursor-pointer">
                  Ativar alerta automático de ASO no grupo
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={autoSendAsoAlert ? "default" : "secondary"}>
                  {autoSendAsoAlert ? "Ativo" : "Desativado"}
                </Badge>
                <Button variant="outline" size="sm" onClick={handleTestAsoNotify} disabled={testingAso}>
                  <Play className="w-4 h-4 mr-1" />
                  {testingAso ? "..." : "Testar"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada e ID do grupo preenchido. O botão "Testar" envia o alerta imediatamente,
              ignorando o filtro de duplicidade.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Alerta Automático da Matriz (toda Quinta às 10:00h)
            </CardTitle>
            <CardDescription>
              Quando habilitado, o sistema envia automaticamente para o <strong>grupo configurado</strong> uma mensagem
              listando os colaboradores que <strong>ainda não preencheram</strong> a Matriz de Responsabilidades do mês,
              com os detalhes de quais tarefas estão pendentes. Se <strong>todos</strong> tiverem preenchido, será enviada uma
              mensagem de <strong>parabéns</strong> à equipe. Execução semanal: <strong>toda Quinta-feira às 10:00h</strong> (Pará UTC-4),
              sempre atualizada conforme o sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-matrix"
                  checked={autoSendMatrixAlert}
                  onCheckedChange={setAutoSendMatrixAlert}
                />
                <Label htmlFor="auto-send-matrix" className="cursor-pointer">
                  Ativar envio automático do alerta da Matriz no grupo
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={autoSendMatrixAlert ? "default" : "secondary"}>
                  {autoSendMatrixAlert ? "Ativo" : "Desativado"}
                </Badge>
                <Button variant="outline" size="sm" onClick={handleTestMatrixNotify} disabled={testingMatrix}>
                  <Play className="w-4 h-4 mr-1" />
                  {testingMatrix ? "..." : "Testar"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada e ID do grupo preenchido. O botão "Testar" envia a mensagem imediatamente.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Alerta da Cor Proibida do Mês (todo dia 1º às 07:00h)
            </CardTitle>
            <CardDescription>
              Quando habilitado, o sistema envia automaticamente para o <strong>grupo configurado</strong> uma mensagem
              avisando qual é a <strong>cor proibida do novo mês</strong>, sempre no dia da virada (todo dia 1º) às
              <strong> 07:00h (Pará UTC-4)</strong>. A mensagem inclui o mês de referência, a cor proibida e um alerta
              de atenção para que ninguém utilize itens, vestimentas ou EPIs nessa cor durante o mês.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-forbidden-color"
                  checked={autoSendForbiddenColorAlert}
                  onCheckedChange={setAutoSendForbiddenColorAlert}
                />
                <Label htmlFor="auto-send-forbidden-color" className="cursor-pointer">
                  Ativar envio automático da cor proibida do mês no grupo
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={autoSendForbiddenColorAlert ? "default" : "secondary"}>
                  {autoSendForbiddenColorAlert ? "Ativo" : "Desativado"}
                </Badge>
                <Button variant="outline" size="sm" onClick={handleTestForbiddenColorNotify} disabled={testingForbiddenColor}>
                  <Play className="w-4 h-4 mr-1" />
                  {testingForbiddenColor ? "..." : "Testar"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada e ID do grupo preenchido. O botão "Testar" envia a mensagem imediatamente,
              ignorando a regra de "somente no dia 1º".
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Campanha do Mês (todo dia 1º às 09:00h)
            </CardTitle>
            <CardDescription>
              Quando habilitado, o sistema envia automaticamente para o <strong>grupo configurado</strong> a
              <strong> campanha do mês vigente</strong> (Janeiro Branco, Outubro Rosa, etc.) com a
              <strong> imagem da campanha</strong> em anexo, no <strong>dia 1º de cada mês às 09:00h (Pará UTC-4)</strong>.
              A legenda inclui o nome de todas as campanhas do mês, suas cores e descrições.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-campaign"
                  checked={autoSendCampaignAlert}
                  onCheckedChange={setAutoSendCampaignAlert}
                />
                <Label htmlFor="auto-send-campaign" className="cursor-pointer">
                  Ativar envio automático da campanha do mês no grupo
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={autoSendCampaignAlert ? "default" : "secondary"}>
                  {autoSendCampaignAlert ? "Ativo" : "Desativado"}
                </Badge>
                <Button variant="outline" size="sm" onClick={handleTestCampaignNotify} disabled={testingCampaign}>
                  <Play className="w-4 h-4 mr-1" />
                  {testingCampaign ? "..." : "Testar"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada, ID do grupo preenchido e banner do mês carregado em
              <code className="mx-1 px-1 rounded bg-muted">announcements/campaign-banners/campanha-{`{mês}`}.png</code>.
              Se a imagem não existir, será enviado apenas o texto.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Alertas de Pedidos no WhatsApp
            </CardTitle>
            <CardDescription>
              Quando habilitado, ao criar um pedido, o <strong>usuário encaminhado (mencionado)</strong> recebe no WhatsApp
              cadastrado todos os detalhes do pedido (itens, quantidades, descrições, data esperada e solicitante).
              A cada <strong>mudança de status</strong>, o <strong>solicitante</strong> também recebe automaticamente
              uma mensagem com o status anterior, o novo status e quem alterou.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-order-alerts"
                  checked={autoSendOrderAlerts}
                  onCheckedChange={setAutoSendOrderAlerts}
                />
                <Label htmlFor="auto-send-order-alerts" className="cursor-pointer">
                  Ativar envio automático de alertas de pedidos no WhatsApp
                </Label>
              </div>
              <Badge variant={autoSendOrderAlerts ? "default" : "secondary"}>
                {autoSendOrderAlerts ? "Ativo" : "Desativado"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada e usuários com WhatsApp cadastrado no perfil. As mensagens são
              enviadas diretamente para o número pessoal de cada usuário (não para o grupo).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Movimentação de Equipamentos no Grupo
            </CardTitle>
            <CardDescription>
              Quando habilitado, a cada <strong>entrada ou saída de equipamento</strong> registrada no sistema,
              o <strong>grupo do WhatsApp configurado</strong> recebe automaticamente uma mensagem com
              equipamento, placa, data, horário, motivo (no caso de saída), descrição do problema, observação e quem registrou.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-equipment-movements"
                  checked={autoSendEquipmentMovements}
                  onCheckedChange={setAutoSendEquipmentMovements}
                />
                <Label htmlFor="auto-send-equipment-movements" className="cursor-pointer">
                  Ativar envio automático de movimentações no grupo
                </Label>
              </div>
              <Badge variant={autoSendEquipmentMovements ? "default" : "secondary"}>
                {autoSendEquipmentMovements ? "Ativo" : "Desativado"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada e <strong>ID do grupo</strong> preenchido. Cada movimentação registrada
              dispara um envio imediato.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Envio de Mensagem</CardTitle>
            <CardDescription>Selecione os usuários e escreva a mensagem. Apenas usuários com WhatsApp cadastrado aparecem.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Digite a mensagem..."
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={4000}
            />
            <div className="text-xs text-muted-foreground text-right">{message.length}/4000</div>

            <Separator />

            <div className="flex items-center gap-3 rounded-md border p-3 bg-muted/30">
              <Switch id="send-to-group" checked={sendToGroup} onCheckedChange={setSendToGroup} />
              <Label htmlFor="send-to-group" className="cursor-pointer">Enviar para grupo do WhatsApp</Label>
            </div>

            {sendToGroup ? (
              <div className="space-y-2">
                <Label htmlFor="group-override">ID do Grupo</Label>
                <Input
                  id="group-override"
                  placeholder={groupId || "120363XXXXXXXXXXXX@g.us"}
                  value={groupIdOverride}
                  onChange={(e) => setGroupIdOverride(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Deixe em branco para usar o grupo padrão configurado acima ({groupId || "nenhum"}).
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou número..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                  />
                  <Badge variant="secondary" className="ml-auto">
                    <Users className="w-3 h-3 mr-1" /> {selected.size} selecionado(s)
                  </Badge>
                </div>

                <div className="border rounded-md max-h-80 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                        </TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>WhatsApp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                            Nenhum usuário com WhatsApp cadastrado
                          </TableCell>
                        </TableRow>
                      )}
                      {filtered.map((p: { user_id: string; full_name: string | null; whatsapp_number: string | null }) => (
                        <TableRow key={p.user_id}>
                          <TableCell>
                            <Checkbox
                              checked={selected.has(p.user_id)}
                              onCheckedChange={(v) => {
                                const next = new Set(selected);
                                if (v) next.add(p.user_id); else next.delete(p.user_id);
                                setSelected(next);
                              }}
                            />
                          </TableCell>
                          <TableCell>{p.full_name || "—"}</TableCell>
                          <TableCell className="font-mono text-sm">{formatBR(p.whatsapp_number || "")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}

            <div className="flex justify-end">
              <Button onClick={handleSend} disabled={sending || !enabled}>
                <Send className="w-4 h-4 mr-2" />
                {sending
                  ? "Enviando..."
                  : sendToGroup
                  ? "Enviar para o grupo"
                  : `Enviar para ${selected.size}`}
              </Button>
            </div>
            {!enabled && (
              <p className="text-xs text-amber-600">Habilite a integração para enviar mensagens.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Envios</CardTitle>
            <CardDescription>Últimas 50 mensagens enviadas via W-API</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mensagem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(logs || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        Nenhum envio registrado
                      </TableCell>
                    </TableRow>
                  )}
                  {(logs || []).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-sm">{l.recipient_name || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{l.recipient_phone}</TableCell>
                      <TableCell>
                        <Badge variant={l.status === "sent" ? "default" : "destructive"}>
                          {l.status === "sent" ? "Enviado" : "Falhou"}
                        </Badge>
                        {l.error_message && (
                          <div className="text-[10px] text-destructive mt-1">{l.error_message}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate">{l.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminWhatsApp;
