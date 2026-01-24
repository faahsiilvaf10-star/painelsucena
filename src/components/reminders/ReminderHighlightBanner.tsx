import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, AlertCircle, Calendar, Users, User, Globe, X } from "lucide-react";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useActiveReminders, Reminder } from "@/hooks/useReminders";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export const ReminderHighlightBanner = () => {
  const { data: activeReminders, isLoading } = useActiveReminders();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visibleReminders = useMemo(() => {
    return activeReminders?.filter((r) => !dismissedIds.has(r.id)) || [];
  }, [activeReminders, dismissedIds]);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
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

  const getDaysUntilEvent = (dateStr: string) => {
    const eventDate = new Date(dateStr);
    const today = new Date();
    eventDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="h-5 w-5 text-primary animate-bounce" />
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Lembretes Ativos
        </h3>
        <Link to="/lembretes">
          <Badge variant="outline" className="ml-2 cursor-pointer hover:bg-accent">
            Ver todos
          </Badge>
        </Link>
      </div>
      
      <ScrollArea className="w-full whitespace-nowrap pb-2">
        <div className="flex gap-4">
          {visibleReminders.map((reminder) => {
            const daysUntil = getDaysUntilEvent(reminder.event_date);
            const isToday = daysUntil === 0;
            const MentionIcon = getMentionIcon(reminder.mention_type);

            return (
              <Card
                key={reminder.id}
                className={cn(
                  "flex-shrink-0 w-72 relative overflow-hidden transition-all",
                  isToday
                    ? "bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30"
                    : "bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20"
                )}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-60 hover:opacity-100"
                  onClick={() => handleDismiss(reminder.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "p-2 rounded-full flex-shrink-0",
                        isToday ? "bg-primary/20" : "bg-orange-500/20"
                      )}
                    >
                      {isToday ? (
                        <AlertCircle className="h-5 w-5 text-primary" />
                      ) : (
                        <Bell className="h-5 w-5 text-orange-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate pr-6">{reminder.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(reminder.event_date), "dd 'de' MMM", {
                            locale: ptBR,
                          })}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            isToday
                              ? "bg-primary/20 text-primary"
                              : "bg-orange-500/20 text-orange-500"
                          )}
                        >
                          {isToday ? "Hoje!" : `${daysUntil}d`}
                        </Badge>
                      </div>
                      {reminder.description && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2 whitespace-normal">
                          {reminder.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-2">
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
                </CardContent>
              </Card>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
