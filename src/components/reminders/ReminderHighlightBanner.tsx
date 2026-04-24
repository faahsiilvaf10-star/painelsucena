import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, AlertCircle, Calendar, Users, User, Globe, Check, X, AlertTriangle, UserCircle, Clock } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useActiveReminders, useAcknowledgeReminder, useDeleteReminder, useSnoozeReminder, Reminder } from "@/hooks/useReminders";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { getDaysUntilEventBrazilNorth, parseDateForBrazilNorth } from "@/lib/timezone";
import { toast } from "sonner";
import { ReminderDetailDialog } from "./ReminderDetailDialog";
import { playSoundFile } from "@/lib/sounds";

// Play alert sound for today's reminders
const playAlertSound = () => {
  try {
    const audio = new Audio("/sounds/notification.mp3");
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch (error) {
    console.error("Error playing alert sound:", error);
  }
};

export const ReminderHighlightBanner = () => {
  const { user } = useAuth();
  const { data: activeReminders, isLoading } = useActiveReminders();
  const acknowledgeReminder = useAcknowledgeReminder();
  const deleteReminder = useDeleteReminder();
  const snoozeReminder = useSnoozeReminder();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [hasPlayedSound, setHasPlayedSound] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [snoozeOpenId, setSnoozeOpenId] = useState<string | null>(null);

  const visibleReminders = useMemo(() => {
    return activeReminders?.filter((r) => !dismissedIds.has(r.id)) || [];
  }, [activeReminders, dismissedIds]);

  // Use Brazil North timezone for date calculations
  const getDaysUntilEvent = (dateStr: string) => {
    return getDaysUntilEventBrazilNorth(dateStr);
  };

  // Check if a reminder is active "today" (either regular reminder for today OR recurring on current day)
  const isReminderForToday = (reminder: Reminder): boolean => {
    // Recurring reminders that passed the filter are always "today"
    if (!!reminder.is_recurring && (reminder.recurring_days?.length ?? 0) > 0) {
      return true;
    }
    // Regular reminders check event_date
    return getDaysUntilEvent(reminder.event_date) === 0;
  };

  // Separate today's reminders from upcoming ones
  const todayReminders = useMemo(() => {
    return visibleReminders.filter((r) => isReminderForToday(r));
  }, [visibleReminders]);

  const upcomingReminders = useMemo(() => {
    return visibleReminders.filter((r) => !isReminderForToday(r) && getDaysUntilEvent(r.event_date) > 0);
  }, [visibleReminders]);

  // Play sound once when there are today's reminders
  useEffect(() => {
    if (todayReminders.length > 0 && !hasPlayedSound) {
      playAlertSound();
      setHasPlayedSound(true);
    }
  }, [todayReminders.length, hasPlayedSound]);

  const handleAcknowledge = async (reminder: Reminder) => {
    try {
      await acknowledgeReminder.mutateAsync(reminder);
      setDismissedIds((prev) => new Set([...prev, reminder.id]));
      setDetailDialogOpen(false);
      setSelectedReminder(null);
      toast.success("Lembrete marcado como visto!");
    } catch (error: any) {
      console.error("Erro ao marcar lembrete como visto:", error?.message || error);
      toast.error("Erro ao marcar lembrete como visto");
    }
  };

  const handleCancel = async (reminder: Reminder) => {
    if (user?.id !== reminder.created_by) {
      toast.error("Apenas o criador pode cancelar este lembrete");
      return;
    }
    try {
      await deleteReminder.mutateAsync(reminder);
      setDetailDialogOpen(false);
      setSelectedReminder(null);
      toast.success("Lembrete cancelado!");
    } catch (error) {
      toast.error("Erro ao cancelar lembrete");
    }
  };

  const handleOpenDetail = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    setDetailDialogOpen(true);
    playSoundFile("/sounds/pop.mp3");
  };

  const handleSnooze = async (reminderId: string, date: Date) => {
    try {
      const snoozedUntil = format(date, "yyyy-MM-dd");
      await snoozeReminder.mutateAsync({ reminderId, snoozedUntil });
      setDismissedIds((prev) => new Set([...prev, reminderId]));
      setSnoozeOpenId(null);
      toast.success(`Lembrete adiado até ${format(date, "dd/MM/yyyy")}`);
    } catch (error) {
      toast.error("Erro ao adiar lembrete");
    }
  };

  if (isLoading || visibleReminders.length === 0) {
    return null;
  }

  const getMentionIcon = (type: string) => {
    switch (type) {
      case "all":
        return Globe;
      case "specific":
        return Users;
      default:
        return User;
    }
  };

  return (
    <div className="space-y-4 mb-6">
      {/* TODAY'S REMINDERS - Soft Peach Style */}
      {todayReminders.length > 0 && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
          <div
            className="rounded-2xl overflow-hidden shadow-lg reminder-today-glow"
            style={{
              background:
                "linear-gradient(135deg, hsl(35 100% 96%) 0%, hsl(30 100% 92%) 50%, hsl(28 100% 88%) 100%)",
            }}
          >
            {/* Header Bar */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-orange-200/50 bg-white/40 backdrop-blur-sm">
              <Bell className="h-5 w-5 text-orange-500" />
              <h3 className="font-bold text-base text-orange-950">Lembretes de Hoje!</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-orange-200/70 text-orange-700 text-xs font-semibold">
                {todayReminders.length} {todayReminders.length === 1 ? "lembrete" : "lembretes"}
              </span>
            </div>

            {/* Reminder Cards */}
            <div className="p-4 space-y-3">
              {todayReminders.map((reminder) => {
                const MentionIcon = getMentionIcon(reminder.mention_type);
                const isCreator = user?.id === reminder.created_by;
                return (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white shadow-sm hover:shadow-md transition-all cursor-pointer border border-orange-100/50"
                    onClick={() => handleOpenDetail(reminder)}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-orange-950 uppercase tracking-wide">
                          {reminder.title}
                        </p>
                        {reminder.description && (
                          <p className="text-sm text-orange-900/70 mt-0.5 line-clamp-2">
                            {reminder.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {reminder.event_time && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-orange-500" />
                              <span className="text-xs text-orange-900/80">
                                às <span className="font-semibold text-orange-700">{reminder.event_time.slice(0, 5)}</span>
                              </span>
                            </div>
                          )}
                          {reminder.event_time && <span className="text-orange-300">•</span>}
                          {(reminder.mention_type === "all" || reminder.mention_type === "specific") && reminder.creator_name && (
                            <>
                              <div className="flex items-center gap-1.5">
                                <UserCircle className="h-3.5 w-3.5 text-orange-500" />
                                <span className="text-xs text-orange-900/80">
                                  Criado por: <span className="font-semibold text-orange-700">{reminder.creator_name}</span>
                                </span>
                              </div>
                              <span className="text-orange-300">•</span>
                            </>
                          )}
                          <div className="flex items-center gap-1.5">
                            <MentionIcon className="h-3.5 w-3.5 text-orange-500" />
                            <span className="text-xs text-orange-900/80">
                              {reminder.mention_type === "all"
                                ? "Todos"
                                : reminder.mention_type === "me"
                                ? "Pessoal"
                                : "Mencionado"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Popover open={snoozeOpenId === reminder.id} onOpenChange={(open) => setSnoozeOpenId(open ? reminder.id : null)}>
                        <PopoverTrigger asChild>
                          <Button
                            size="sm"
                            className="h-9 px-4 gap-1.5 rounded-full bg-white border border-orange-200 text-orange-900 hover:bg-orange-50 shadow-sm font-medium"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Clock className="h-4 w-4" />
                            Adiar
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end" onClick={(e) => e.stopPropagation()}>
                          <CalendarComponent
                            mode="single"
                            selected={undefined}
                            onSelect={(date) => { if (date) handleSnooze(reminder.id, date); }}
                            disabled={(date) => date <= new Date()}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                      <Button
                        size="sm"
                        className="h-9 px-4 gap-1.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-sm font-medium border-0"
                        onClick={(e) => { e.stopPropagation(); handleAcknowledge(reminder); }}
                        disabled={acknowledgeReminder.isPending}
                      >
                        <Check className="h-4 w-4" />
                        Visto
                      </Button>
                      {isCreator && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-9 w-9 p-0 rounded-full text-orange-900/60 hover:text-red-500 hover:bg-red-50"
                          onClick={(e) => { e.stopPropagation(); handleCancel(reminder); }}
                          disabled={deleteReminder.isPending}
                          title="Cancelar lembrete"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* UPCOMING REMINDERS - Horizontal scroll cards with Neon Effect */}
      {upcomingReminders.length > 0 && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-5 w-5 text-green-400" />
            <h3 className="font-semibold text-sm text-foreground uppercase tracking-wide">
              Próximos Lembretes
            </h3>
            <Link to="/lembretes">
              <Badge variant="outline" className="ml-2 cursor-pointer hover:bg-green-500/20 border-green-500/50 text-green-400">
                Ver todos
              </Badge>
            </Link>
          </div>

          <ScrollArea className="w-full whitespace-nowrap pb-2">
            <div className="flex gap-4">
              {upcomingReminders.map((reminder) => {
                const daysUntil = getDaysUntilEvent(reminder.event_date);
                const MentionIcon = getMentionIcon(reminder.mention_type);
                const isUrgent = daysUntil <= 1; // Amanhã ou hoje
                const isWarning = daysUntil <= 3 && daysUntil > 1; // 2-3 dias

                // Determine colors based on urgency
                const borderColor = isUrgent 
                  ? "border-red-500/60" 
                  : isWarning 
                    ? "border-orange-500/50" 
                    : "border-green-500/40";
                const glowClass = isUrgent 
                  ? "neon-glow-border-urgent" 
                  : isWarning 
                    ? "neon-glow-border-warning" 
                    : "neon-glow-border";
                const hoverClass = isUrgent 
                  ? "reminder-card-hover-urgent" 
                  : isWarning 
                    ? "reminder-card-hover-warning" 
                    : "reminder-card-hover";
                const accentColor = isUrgent 
                  ? "text-red-400" 
                  : isWarning 
                    ? "text-orange-400" 
                    : "text-green-400";
                const bgAccent = isUrgent 
                  ? "bg-red-500/20" 
                  : isWarning 
                    ? "bg-orange-500/20" 
                    : "bg-green-500/20";

                return (
                  <Card
                    key={reminder.id}
                    className={cn(
                      "flex-shrink-0 w-72 relative overflow-hidden transition-all snow-bg rounded-xl cursor-pointer",
                      borderColor,
                      glowClass,
                      hoverClass
                    )}
                    onClick={() => handleOpenDetail(reminder)}
                  >
                    <div className="absolute top-2 right-2 flex gap-1 z-10">
                      <Popover open={snoozeOpenId === `card-${reminder.id}`} onOpenChange={(open) => setSnoozeOpenId(open ? `card-${reminder.id}` : null)}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full opacity-60 hover:opacity-100 hover:bg-orange-500/20 text-orange-400"
                            onClick={(e) => e.stopPropagation()}
                            title="Adiar lembrete"
                          >
                            <Clock className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-50" align="end" onClick={(e) => e.stopPropagation()}>
                          <CalendarComponent
                            mode="single"
                            selected={undefined}
                            onSelect={(date) => { if (date) handleSnooze(reminder.id, date); }}
                            disabled={(date) => date <= new Date()}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-6 w-6 rounded-full opacity-60 hover:opacity-100", bgAccent, accentColor)}
                        onClick={(e) => { e.stopPropagation(); handleAcknowledge(reminder); }}
                        disabled={acknowledgeReminder.isPending}
                        title="Marcar como visto"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      {user?.id === reminder.created_by && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full opacity-60 hover:opacity-100 hover:bg-red-500/20 text-red-400"
                          onClick={(e) => { e.stopPropagation(); handleCancel(reminder); }}
                          disabled={deleteReminder.isPending}
                          title="Cancelar lembrete"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "p-2 rounded-full flex-shrink-0",
                            bgAccent,
                            (isUrgent || isWarning) && "animate-pulse"
                          )}
                        >
                          <Bell className={cn("h-5 w-5", accentColor)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate pr-6 text-white">{reminder.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className={cn("h-3 w-3 flex-shrink-0", accentColor, "opacity-70")} />
                            <span className="text-xs text-gray-400">
                              {format(parseDateForBrazilNorth(reminder.event_date), "dd 'de' MMM", {
                                locale: ptBR,
                              })}
                              {reminder.event_time && <span className={cn("ml-1", accentColor.replace("text-", "text-").replace("-400", "-300"))}>às {reminder.event_time.slice(0, 5)}</span>}
                            </span>
                            <Badge
                              className={cn(
                                "text-xs border-0",
                                isUrgent
                                  ? "bg-red-500 text-white font-bold animate-pulse"
                                  : isWarning
                                    ? "bg-orange-500 text-black font-bold animate-pulse"
                                    : "bg-green-500/20 text-green-400"
                              )}
                            >
                              {daysUntil === 1 ? "Amanhã" : `${daysUntil}d`}
                            </Badge>
                          </div>
                          {reminder.description && (
                            <p className="text-xs text-gray-400 mt-2 line-clamp-2 whitespace-normal">
                              {reminder.description}
                            </p>
                          )}
                          <div className="flex flex-col gap-1 mt-2">
                            {(reminder.mention_type === "all" || reminder.mention_type === "specific") && reminder.creator_name && (
                              <div className="flex items-center gap-1">
                                <UserCircle className={cn("h-3 w-3 opacity-70", accentColor)} />
                                <span className="text-xs text-gray-400 truncate">
                                  {reminder.creator_name}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <MentionIcon className={cn("h-3 w-3 opacity-70", accentColor)} />
                              <span className="text-xs text-gray-400 capitalize">
                                {reminder.mention_type === "all"
                                  ? "Todos"
                                  : reminder.mention_type === "me"
                                  ? "Pessoal"
                                  : "Mencionado"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* Reminder Detail Dialog */}
      <ReminderDetailDialog
        reminder={selectedReminder}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onAcknowledge={handleAcknowledge}
        onCancel={handleCancel}
        isAcknowledging={acknowledgeReminder.isPending}
        isCanceling={deleteReminder.isPending}
        isCreator={selectedReminder ? user?.id === selectedReminder.created_by : false}
      />
    </div>
  );
};
