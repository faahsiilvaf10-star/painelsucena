import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ClipboardCheck, AlertTriangle, Send, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useEquipment } from "@/hooks/useEquipment";
import { toast } from "sonner";

const formatDateTime = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Belem",
    });
  } catch {
    return iso;
  }
};

const ChecklistMotorista = () => {
  const navigate = useNavigate();
  const { setTheme, theme } = useTheme();
  const { data: profile } = useProfile();
  const { data: equipment = [] } = useEquipment();
  const queryClient = useQueryClient();

  const selectedVehicleId = localStorage.getItem("selectedVehicleId");
  const selectedVehicle = equipment.find((eq) => eq.id === selectedVehicleId);

  const [problem, setProblem] = useState("");
  const [observation, setObservation] = useState("");
  const [saving, setSaving] = useState(false);

  // Force light theme
  useEffect(() => {
    const prev = theme;
    setTheme("light");
    return () => {
      if (prev) setTheme(prev);
    };
  }, []);

  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ["driver-checklists", selectedVehicleId],
    queryFn: async () => {
      if (!selectedVehicleId) return [];
      const { data, error } = await supabase
        .from("driver_vehicle_checklists")
        .select("*")
        .eq("equipment_id", selectedVehicleId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedVehicleId,
  });

  const handleSubmit = async () => {
    if (!problem.trim()) {
      toast.error("Descreva o problema antes de registrar.");
      return;
    }
    if (!selectedVehicle) {
      toast.error("Nenhum equipamento selecionado.");
      return;
    }
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("driver_vehicle_checklists").insert({
        equipment_id: selectedVehicle.id,
        equipment_name: selectedVehicle.name,
        plate: selectedVehicle.plate,
        driver_name: profile?.full_name || null,
        problem_description: problem.trim(),
        created_by: user?.id || null,
      });
      if (error) throw error;
      toast.success("Problema registrado e enviado ao grupo");
      setProblem("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["driver-checklists", selectedVehicleId] });
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao registrar: " + (e?.message || "tente novamente"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Button variant="ghost" size="icon" onClick={() => navigate("/painel-motorista")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <ClipboardCheck className="w-5 h-5 text-amber-600" />
          <h1 className="text-base font-semibold">Check List do Veículo</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-3 py-4 space-y-4">
        {selectedVehicle && (
          <Card className="border-amber-300 bg-amber-50/50">
            <CardContent className="p-3 text-sm">
              <div className="font-semibold text-amber-900">{selectedVehicle.name}</div>
              <div className="text-amber-700">Placa: {selectedVehicle.plate}</div>
            </CardContent>
          </Card>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white">
              <Plus className="w-5 h-5 mr-2" />
              Registrar Problema no Veículo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Novo Problema
              </DialogTitle>
              <DialogDescription>
                Descreva o problema observado. A mensagem será enviada automaticamente ao grupo do WhatsApp.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Ex: Pneu dianteiro direito com pressão baixa..."
              rows={5}
              className="resize-none"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white">
                {saving ? "Registrando..." : "Registrar e Enviar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">
            Histórico de Observações
          </h2>
          {isLoading && <p className="text-sm text-muted-foreground px-1">Carregando...</p>}
          {!isLoading && checklists.length === 0 && (
            <Card>
              <CardContent className="p-4 text-center text-sm text-muted-foreground">
                Nenhum problema registrado ainda.
              </CardContent>
            </Card>
          )}
          {checklists.map((c: any) => (
            <Card key={c.id} className="border-l-4 border-l-amber-500">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDateTime(c.created_at)}
                  {c.driver_name && (
                    <span className="ml-auto font-medium text-foreground">
                      {c.driver_name}
                    </span>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{c.problem_description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ChecklistMotorista;
