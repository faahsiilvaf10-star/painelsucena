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
import { MessageCircle, Save, Send, Search, Users } from "lucide-react";

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
      return data as { id: string; instance_url: string; instance_token: string; instance_id: string; enabled: boolean; delay_seconds: number | null; group_id: string | null } | null;
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
      const { data, error } = await supabase.functions.invoke("wapi-send", {
        body: {
          message: message.trim(),
          recipients,
          group_id: sendToGroup ? targetGroup : null,
        },
      });
      if (error) throw error;
      const res = data as { sent: number; total: number };
      toast.success(`${res.sent}/${res.total} enviadas`);
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["wapi-logs"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao enviar";
      toast.error(msg);
    } finally {
      setSending(false);
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

            <div className="flex justify-end">
              <Button onClick={handleSend} disabled={sending || !enabled}>
                <Send className="w-4 h-4 mr-2" /> {sending ? "Enviando..." : `Enviar para ${selected.size}`}
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
