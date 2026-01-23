import { useState, useMemo } from "react";
import { format, parse, isWeekend, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Shuffle, Calendar, Save, Trash2, Edit2, Sun, Shield, ChevronLeft, ChevronRight, Mail, Loader2, AtSign } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";
import {
  useDDSSchedule,
  useCreateDDSSchedule,
  useUpdateDDSSchedule,
  useDeleteDDSSchedule,
  useClearMonthDDS,
  useAllProfiles,
  getWeekdaysInMonth,
  DDSScheduleItem,
  useTomorrowDDS,
} from "@/hooks/useDDSSchedule";
import { useCreateNotification } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";

const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function DDS() {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: allProfiles } = useAllProfiles();

  // Current month state
  const [currentDate, setCurrentDate] = useState(new Date());
  const monthYear = format(currentDate, "yyyy-MM");

  // Data hooks
  const { data: scheduleData, isLoading } = useDDSSchedule(monthYear);
  const { data: tomorrowDDS } = useTomorrowDDS();
  const createSchedule = useCreateDDSSchedule();
  const updateSchedule = useUpdateDDSSchedule();
  const deleteSchedule = useDeleteDDSSchedule();
  const clearMonth = useClearMonthDDS();
  const createNotification = useCreateNotification();

  // Edit modal state
  const [editingItem, setEditingItem] = useState<DDSScheduleItem | null>(null);
  const [editPresenter, setEditPresenter] = useState("");
  const [editTheme, setEditTheme] = useState("");
  
  // Notification state
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  // Helper to create DDS mention notification
  const notifyPresenter = async (userId: string, date: string, theme: string) => {
    const formattedDate = format(new Date(date), "dd 'de' MMMM", { locale: ptBR });
    try {
      await createNotification.mutateAsync({
        user_id: userId,
        type: "dds_mention",
        title: "📢 Você foi mencionado como palestrante!",
        message: `Você foi designado para apresentar o DDS do dia ${formattedDate}. Tema: "${theme}"`,
        reference_type: "dds_schedule",
      });
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  };

  // Check if user can edit (tecnico_seguranca and weekday, OR admin)
  const today = new Date();
  const isWeekday = !isWeekend(today);
  const isTecnicoSeguranca = profile?.cargo === "tecnico_seguranca_i" || profile?.cargo === "tecnico_seguranca_ii";
  const canEdit = isAdmin || (isTecnicoSeguranca && isWeekday);

  // Schedule map for quick lookup
  const scheduleMap = useMemo(() => {
    const map = new Map<string, DDSScheduleItem>();
    scheduleData?.forEach(item => {
      map.set(item.scheduled_date, item);
    });
    return map;
  }, [scheduleData]);

  // Get weekdays for current month
  const weekdays = useMemo(() => getWeekdaysInMonth(currentDate), [currentDate]);

  const getInitials = (name: string) => {
    const names = name.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handlePreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleRandomAssign = async () => {
    if (!allProfiles || allProfiles.length === 0) {
      toast.error("Não há usuários cadastrados para atribuir");
      return;
    }

    // Clear existing schedule first
    try {
      await clearMonth.mutateAsync(monthYear);
    } catch (error) {
      console.error("Error clearing month:", error);
    }

    // Create random assignments
    const shuffledProfiles = [...allProfiles].sort(() => Math.random() - 0.5);
    const defaultThemes = [
      "Segurança no Trabalho",
      "Uso de EPIs",
      "Prevenção de Acidentes",
      "Ergonomia",
      "Saúde Mental",
      "Meio Ambiente",
      "5S no Ambiente de Trabalho",
      "Comunicação Efetiva",
      "Trabalho em Equipe",
      "Qualidade de Vida",
      "Primeiros Socorros",
      "Prevenção de Incêndios",
    ];

    const assignments = weekdays.map((day, index) => ({
      month_year: monthYear,
      scheduled_date: format(day, "yyyy-MM-dd"),
      presenter_user_id: shuffledProfiles[index % shuffledProfiles.length].user_id,
      theme: defaultThemes[index % defaultThemes.length],
    }));

    try {
      await createSchedule.mutateAsync(assignments);
      
      // Send notifications to all assigned presenters
      for (const assignment of assignments) {
        await notifyPresenter(
          assignment.presenter_user_id,
          assignment.scheduled_date,
          assignment.theme
        );
      }
      
      toast.success("Escala gerada e palestrantes notificados!");
    } catch (error) {
      console.error("Error creating schedule:", error);
      toast.error("Erro ao gerar escala aleatória");
    }
  };

  const handleEdit = (item: DDSScheduleItem) => {
    setEditingItem(item);
    setEditPresenter(item.presenter_user_id);
    setEditTheme(item.theme);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    const presenterChanged = editPresenter !== editingItem.presenter_user_id;

    try {
      await updateSchedule.mutateAsync({
        id: editingItem.id,
        presenter_user_id: editPresenter,
        theme: editTheme,
      });

      // Notify new presenter if changed
      if (presenterChanged) {
        await notifyPresenter(editPresenter, editingItem.scheduled_date, editTheme);
        toast.success("Palestrante atualizado e notificado!");
      } else {
        toast.success("Agendamento atualizado!");
      }
      
      setEditingItem(null);
    } catch (error) {
      console.error("Error updating:", error);
      toast.error("Erro ao atualizar agendamento");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSchedule.mutateAsync({ id, monthYear });
      toast.success("Agendamento removido!");
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Erro ao remover agendamento");
    }
  };

  const handleSendNotification = async () => {
    if (!tomorrowDDS) {
      toast.error("Não há DDS agendado para amanhã");
      return;
    }

    setIsSendingNotification(true);
    try {
      // Send email notification
      const { data, error } = await supabase.functions.invoke("notify-dds-presenter");

      if (error) throw error;

      // Also create in-app notification for the presenter
      if (data?.sent && tomorrowDDS.presenter_user_id) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const formattedDate = format(tomorrow, "dd 'de' MMMM", { locale: ptBR });
        
        await createNotification.mutateAsync({
          user_id: tomorrowDDS.presenter_user_id,
          type: "dds_reminder",
          title: "🔔 Lembrete: DDS de Amanhã!",
          message: `Você foi notificado que é o palestrante do DDS de amanhã (${formattedDate}). Tema: "${tomorrowDDS.theme}"`,
          reference_type: "dds_schedule",
        });
        
        toast.success(`Notificação enviada para ${tomorrowDDS.presenter?.full_name || "o palestrante"}!`);
      } else {
        toast.info(data?.message || "Nenhuma notificação enviada");
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Erro ao enviar notificação");
    } finally {
      setIsSendingNotification(false);
    }
  };

  if (profileLoading || adminLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Sun className="h-8 w-8 text-amber-500" />
              DDS - Diálogo Diário de Segurança
            </h1>
            <p className="text-muted-foreground mt-1">
              Escala de palestrantes para o mês de {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 py-2 bg-muted rounded-lg font-medium min-w-[160px] text-center">
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </div>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Permission Notice */}
        {!canEdit && (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Shield className="h-5 w-5" />
                <span>
                  {!isTecnicoSeguranca
                    ? "Apenas Técnicos de Segurança podem editar a escala."
                    : "Edições só são permitidas de segunda a sexta-feira."}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {canEdit && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Ações Rápidas</CardTitle>
              <CardDescription>Gerencie a escala do mês</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
                    <Shuffle className="h-4 w-4 mr-2" />
                    Definir Aleatoriamente
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Gerar escala aleatória?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso irá substituir toda a escala atual do mês de{" "}
                      {format(currentDate, "MMMM", { locale: ptBR })} por uma nova escala aleatória.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRandomAssign}>Confirmar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpar Mês
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Limpar toda a escala?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso irá remover todos os agendamentos do mês de{" "}
                      {format(currentDate, "MMMM", { locale: ptBR })}. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => clearMonth.mutateAsync(monthYear).then(() => toast.success("Escala limpa!"))}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Limpar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                variant="outline"
                onClick={handleSendNotification}
                disabled={isSendingNotification || !tomorrowDDS}
                className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
              >
                {isSendingNotification ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Notificar Palestrante de Amanhã
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Schedule Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Escala do Mês
            </CardTitle>
            <CardDescription>
              {weekdays.length} dias úteis • {scheduleData?.length || 0} agendamentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">Carregando escala...</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Data</TableHead>
                      <TableHead className="w-[80px]">Dia</TableHead>
                      <TableHead>Palestrante</TableHead>
                      <TableHead>Tema</TableHead>
                      {canEdit && <TableHead className="w-[100px] text-right">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weekdays.map(day => {
                      const dateStr = format(day, "yyyy-MM-dd");
                      const schedule = scheduleMap.get(dateStr);
                      const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

                      return (
                        <TableRow
                          key={dateStr}
                          className={isToday ? "bg-amber-50 dark:bg-amber-950/20" : ""}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {isToday && (
                                <Badge variant="default" className="bg-amber-500 text-xs">
                                  Hoje
                                </Badge>
                              )}
                              {format(day, "dd/MM")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">
                              {dayNames[getDay(day)]}
                            </span>
                          </TableCell>
                          <TableCell>
                            {schedule?.presenter ? (
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={schedule.presenter.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                    {getInitials(schedule.presenter.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">{schedule.presenter.full_name}</p>
                                  <p className="text-xs text-muted-foreground capitalize">
                                    {schedule.presenter.cargo?.replace(/_/g, " ")}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm italic">
                                Não definido
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {schedule?.theme ? (
                              <span className="text-sm">{schedule.theme}</span>
                            ) : (
                              <span className="text-muted-foreground text-sm italic">—</span>
                            )}
                          </TableCell>
                          {canEdit && (
                            <TableCell className="text-right">
                              {schedule && (
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleEdit(schedule)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(schedule.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Agendamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data</label>
                <Input
                  value={
                    editingItem
                      ? format(parse(editingItem.scheduled_date, "yyyy-MM-dd", new Date()), "dd/MM/yyyy")
                      : ""
                  }
                  disabled
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Palestrante</label>
                <Select value={editPresenter} onValueChange={setEditPresenter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um palestrante" />
                  </SelectTrigger>
                  <SelectContent>
                    {allProfiles?.map(p => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={p.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(p.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          {p.full_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tema</label>
                <Input
                  value={editTheme}
                  onChange={e => setEditTheme(e.target.value)}
                  placeholder="Digite o tema do DDS"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={!editPresenter || !editTheme}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
