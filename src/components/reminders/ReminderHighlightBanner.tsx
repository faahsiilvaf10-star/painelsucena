import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, AlertCircle, Calendar, Users, User, Globe, Check, X, AlertTriangle, UserCircle } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useActiveReminders, useAcknowledgeReminder, useDeleteReminder, Reminder } from "@/hooks/useReminders";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { getDaysUntilEventBrazilNorth } from "@/lib/timezone";
import { toast } from "sonner";

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
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [hasPlayedSound, setHasPlayedSound] = useState(false);

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
      toast.success("Lembrete marcado como visto!");
    } catch (error) {
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
      toast.success("Lembrete cancelado!");
    } catch (error) {
      toast.error("Erro ao cancelar lembrete");
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
      {/* TODAY'S REMINDERS - Fixed Alert Banner with Neon Effect */}
      {todayReminders.length > 0 && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
          <Alert className="border-2 border-green-500/60 bg-black/95 shadow-lg neon-glow-border rounded-xl">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-green-500/20 animate-pulse">
                <AlertTriangle className="h-6 w-6 text-green-400" />
              </div>
              <div className="flex-1">
                <AlertTitle className="text-lg font-bold text-green-400 flex items-center gap-2">
                  <Bell className="h-5 w-5 animate-bounce text-green-400" />
                  <span className="text-white">Lembretes de Hoje!</span>
                  <Badge className="ml-2 animate-pulse bg-green-500 text-black font-bold border-0">
                    {todayReminders.length} {todayReminders.length === 1 ? "lembrete" : "lembretes"}
                  </Badge>
                </AlertTitle>
                <AlertDescription className="mt-3">
                  <div className="space-y-3">
                    {todayReminders.map((reminder) => {
                      const MentionIcon = getMentionIcon(reminder.mention_type);
                      const isCreator = user?.id === reminder.created_by;
                      return (
                        <div
                          key={reminder.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-black/60 border border-green-500/30"
                        >
                          <div className="flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                            <div>
                              <p className="font-semibold text-white">{reminder.title}</p>
                              {reminder.description && (
                                <p className="text-sm text-gray-300 line-clamp-1">
                                  {reminder.description}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                {reminder.event_time && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3 text-green-400/70" />
                                    <span className="text-xs text-gray-400">
                                      às <span className="font-medium text-green-300">{reminder.event_time.slice(0, 5)}</span>
                                    </span>
                                  </div>
                                )}
                                {(reminder.mention_type === "all" || reminder.mention_type === "specific") && (
                                  <div className="flex items-center gap-1">
                                    <UserCircle className="h-3 w-3 text-green-400/70" />
                                    <span className="text-xs text-gray-400">
                                      Criado por: <span className="font-medium text-green-300">{reminder.creator_name}</span>
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <MentionIcon className="h-3 w-3 text-green-400/70" />
                                  <span className="text-xs text-gray-400">
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
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 border-green-500/50 text-green-400 bg-green-500/10 hover:bg-green-500/20 hover:text-green-300"
                              onClick={() => handleAcknowledge(reminder)}
                              disabled={acknowledgeReminder.isPending}
                            >
                              <Check className="h-4 w-4" />
                              Visto
                            </Button>
                            {isCreator && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 border-red-500/50 text-red-400 bg-red-500/10 hover:bg-red-500/20 hover:text-red-300"
                                onClick={() => handleCancel(reminder)}
                                disabled={deleteReminder.isPending}
                              >
                                <X className="h-4 w-4" />
                                Cancelar
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AlertDescription>
              </div>
            </div>
          </Alert>
        </div>
      )}

      {/* UPCOMING REMINDERS - Horizontal scroll cards */}
      {upcomingReminders.length > 0 && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-5 w-5 text-orange-500" />
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Próximos Lembretes
            </h3>
            <Link to="/lembretes">
              <Badge variant="outline" className="ml-2 cursor-pointer hover:bg-accent">
                Ver todos
              </Badge>
            </Link>
          </div>

          <ScrollArea className="w-full whitespace-nowrap pb-2">
            <div className="flex gap-4">
              {upcomingReminders.map((reminder) => {
                const daysUntil = getDaysUntilEvent(reminder.event_date);
                const MentionIcon = getMentionIcon(reminder.mention_type);
                const isUrgent = daysUntil <= 3;

                return (
                  <Card
                    key={reminder.id}
                    className={cn(
                      "flex-shrink-0 w-72 relative overflow-hidden transition-all",
                      isUrgent
                        ? "bg-gradient-to-br from-orange-500/15 to-orange-500/5 border-orange-500/30"
                        : "bg-gradient-to-br from-muted/50 to-muted/20 border-border"
                    )}
                  >
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full opacity-60 hover:opacity-100 hover:bg-green-500/20 text-green-600"
                        onClick={() => handleAcknowledge(reminder)}
                        disabled={acknowledgeReminder.isPending}
                        title="Marcar como visto"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      {user?.id === reminder.created_by && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full opacity-60 hover:opacity-100 hover:bg-destructive/20 text-destructive"
                          onClick={() => handleCancel(reminder)}
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
                            isUrgent ? "bg-orange-500/20" : "bg-muted"
                          )}
                        >
                          <Bell className={cn("h-5 w-5", isUrgent ? "text-orange-500" : "text-muted-foreground")} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate pr-6">{reminder.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(reminder.event_date), "dd 'de' MMM", {
                                locale: ptBR,
                              })}
                              {reminder.event_time && ` às ${reminder.event_time.slice(0, 5)}`}
                            </span>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-xs",
                                isUrgent
                                  ? "bg-orange-500/20 text-orange-500"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {daysUntil === 1 ? "Amanhã" : `${daysUntil}d`}
                            </Badge>
                          </div>
                          {reminder.description && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2 whitespace-normal">
                              {reminder.description}
                            </p>
                          )}
                          <div className="flex flex-col gap-1 mt-2">
                            {(reminder.mention_type === "all" || reminder.mention_type === "specific") && reminder.creator_name && (
                              <div className="flex items-center gap-1">
                                <UserCircle className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground truncate">
                                  {reminder.creator_name}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <MentionIcon className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground capitalize">
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
    </div>
  );
};
