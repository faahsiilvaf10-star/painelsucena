// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEnvironment } from "./useEnvironment";
import { useEffect } from "react";
import { getBrazilNorthMidnight, getDaysUntilEventBrazilNorth } from "@/lib/timezone";

export interface Reminder {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null; // HH:mm format
  alert_days_before: number;
  show_on_event_day: boolean;
  mention_type: "all" | "specific" | "me";
  mentioned_users: string[];
  acknowledged_by: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  is_recurring: boolean | null;
  recurring_days: number[] | null; // 0=Sunday, 1=Monday, ..., 6=Saturday
  creator_name?: string; // Nome do criador (joined from profiles)
}

export interface ReminderInsert {
  title: string;
  description?: string;
  event_date: string;
  event_time?: string | null;
  alert_days_before?: number;
  show_on_event_day?: boolean;
  mention_type: "all" | "specific" | "me";
  mentioned_users?: string[];
  created_by: string;
  is_recurring?: boolean;
  recurring_days?: number[];
}

export const useReminders = () => {
  const { user } = useAuth();
  const { environment } = useEnvironment();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["reminders", user?.id, environment],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .order("event_date", { ascending: true });

      if (error) throw error;
      
      // Fetch creator names
      const creatorIds = [...new Set((data || []).map(r => r.created_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", creatorIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      return (data || []).map(r => ({
        ...r,
        creator_name: profileMap.get(r.created_by) || "Desconhecido",
      })) as Reminder[];
    },
    enabled: !!user?.id,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`reminders-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reminders",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["reminders", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
};

export const useActiveReminders = () => {
  const { user } = useAuth();
  const { environment } = useEnvironment();

  return useQuery({
    queryKey: ["active-reminders", user?.id, environment],
    queryFn: async () => {
      if (!user?.id) return [];

      const todayStart = getBrazilNorthMidnight();
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      const todayDateStr = todayStart.toISOString().split("T")[0];

      // Fetch acknowledgements made today (used for recurring reminders)
      const { data: todayAcknowledgements } = await supabase
        .from("reminder_history")
        .select("reminder_id")
        .eq("action", "acknowledged")
        .eq("action_by", user.id)
        .gte("created_at", todayStart.toISOString())
        .lt("created_at", todayEnd.toISOString());

      const acknowledgedTodayReminderIds = new Set(
        (todayAcknowledgements || []).map((a) => a.reminder_id)
      );

      // Fetch active snoozes for this user (snoozed_until > today)
      const { data: snoozeData } = await supabase
        .from("reminder_snoozes" as any)
        .select("reminder_id, snoozed_until")
        .eq("user_id", user.id);

      const snoozedMap = new Map<string, string>();
      (snoozeData || []).forEach((s: any) => {
        snoozedMap.set(s.reminder_id, s.snoozed_until);
      });

      // Fetch reminders with creator profile
      const { data, error } = await supabase
        .from("reminders")
        .select(`
          *,
          profiles!reminders_created_by_fkey(full_name)
        `)
        .order("event_date", { ascending: true });

      if (error) {
        // Fallback if foreign key doesn't exist
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("reminders")
          .select("*")
          .order("event_date", { ascending: true });

        if (fallbackError) throw fallbackError;

        const creatorIds = [...new Set((fallbackData || []).map(r => r.created_by))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", creatorIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

        const reminders = (fallbackData || []).map(r => ({
          ...r,
          creator_name: profileMap.get(r.created_by) || "Desconhecido",
        })) as Reminder[];

        return filterActiveReminders(reminders, user.id, acknowledgedTodayReminderIds, snoozedMap, todayDateStr);
      }

      const reminders = (data || []).map(r => ({
        ...r,
        creator_name: (r.profiles as any)?.full_name || "Desconhecido",
      })) as Reminder[];
      
      return filterActiveReminders(reminders, user.id, acknowledgedTodayReminderIds, snoozedMap, todayDateStr);
    },
    enabled: !!user?.id,
  });
};

// Helper function to filter active reminders
const filterActiveReminders = (
  reminders: Reminder[],
  userId: string,
  acknowledgedTodayReminderIds: Set<string>,
  snoozedMap: Map<string, string>,
  todayDateStr: string
): Reminder[] => {
  // Get current day of week in Brazil North timezone (0=Sunday, 6=Saturday)
  const nowBrazil = getBrazilNorthMidnight();
  const currentDayOfWeek = nowBrazil.getDay();
  
  return reminders.filter((reminder) => {
    // Check if snoozed until a future date
    const snoozedUntil = snoozedMap.get(reminder.id);
    if (snoozedUntil && snoozedUntil > todayDateStr) {
      return false; // Still snoozed
    }

    // For recurring reminders, hide only if acknowledged TODAY via history
    const isRecurring = !!reminder.is_recurring && (reminder.recurring_days?.length ?? 0) > 0;
    if (isRecurring) {
      if (acknowledgedTodayReminderIds.has(reminder.id)) return false;
    } else {
      const hasAcknowledged = reminder.acknowledged_by?.includes(userId);
      if (hasAcknowledged) return false;
    }

    // Check if user should see this reminder based on mention_type
    const isCreator = reminder.created_by === userId;
    const isRelevant =
      isCreator ||
      reminder.mention_type === "all" ||
      (reminder.mention_type === "me" && reminder.created_by === userId) ||
      (reminder.mention_type === "specific" &&
        reminder.mentioned_users.includes(userId));

    if (!isRelevant) return false;

    // Handle recurring reminders (by day of week)
    if (!!reminder.is_recurring && (reminder.recurring_days?.length ?? 0) > 0) {
      return (reminder.recurring_days || []).includes(currentDayOfWeek);
    }

    // Handle regular (non-recurring) reminders
    const daysUntilEvent = getDaysUntilEventBrazilNorth(reminder.event_date);

    if (reminder.alert_days_before > 0 && daysUntilEvent <= reminder.alert_days_before && daysUntilEvent >= 0) {
      return true;
    }

    if (reminder.show_on_event_day && daysUntilEvent === 0) {
      return true;
    }

    return false;
  });
};

const WEEKDAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const buildReminderMessage = (r: Reminder, creatorName: string): string => {
  const lines: string[] = [];
  lines.push(`🔔 *Novo Lembrete*`);
  lines.push("");
  lines.push(`📌 *Título:* ${r.title}`);
  if (r.description && r.description.trim().length > 0) {
    lines.push(`📝 *Descrição:* ${r.description}`);
  }
  if (r.is_recurring && (r.recurring_days?.length ?? 0) > 0) {
    const days = (r.recurring_days || []).map((d) => WEEKDAY_LABELS[d]).join(", ");
    lines.push(`🔁 *Recorrente:* ${days}`);
  } else if (r.event_date) {
    const [y, m, d] = r.event_date.split("-");
    lines.push(`📅 *Data:* ${d}/${m}/${y}`);
  }
  if (r.event_time) {
    lines.push(`⏰ *Hora:* ${r.event_time}`);
  }
  if (r.alert_days_before && r.alert_days_before > 0) {
    lines.push(`⏳ *Aviso:* ${r.alert_days_before} dia(s) antes`);
  }
  lines.push("");
  lines.push(`👤 _Criado por: ${creatorName}_`);
  lines.push(`_Mensagem automática - Sucena_`);
  return lines.join("\n");
};

const dispatchReminderWhatsApp = async (reminder: Reminder, creatorId: string) => {
  try {
    // Verifica config: só envia se enabled E auto_send_reminders ativos
    const { data: cfg } = await supabase
      .from("wapi_config" as any)
      .select("enabled, auto_send_reminders, group_id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!cfg || !(cfg as any).enabled || !(cfg as any).auto_send_reminders) return;

    // Nome do criador
    const { data: creatorProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", creatorId)
      .maybeSingle();
    const creatorName = creatorProfile?.full_name || "Sistema";

    const message = buildReminderMessage(reminder, creatorName);

    if (reminder.mention_type === "all") {
      // Envia para o grupo
      if (!(cfg as any).group_id) {
        console.warn("[reminders] auto-send: grupo não configurado");
        return;
      }
      await supabase.functions.invoke("wapi-send", {
        body: { send_to_group: true, message },
      });
    } else {
      // Envio privado: criador + mencionados (deduplicados)
      const targets = new Set<string>();
      targets.add(creatorId);
      if (reminder.mention_type === "specific") {
        (reminder.mentioned_users || []).forEach((u) => targets.add(u));
      }
      const userIds = Array.from(targets);
      if (userIds.length === 0) return;
      await supabase.functions.invoke("wapi-send", {
        body: { user_ids: userIds, message },
      });
    }
  } catch (e) {
    console.error("[reminders] auto-send falhou", e);
  }
};

export const useCreateReminder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (reminder: Omit<ReminderInsert, "created_by">) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("reminders")
        .insert({
          ...reminder,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      const created = data as Reminder;

      // Dispara WhatsApp em background (não bloqueia retorno)
      dispatchReminderWhatsApp(created, user.id);

      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["active-reminders"] });
    },
  });
};

export const useUpdateReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Reminder> & { id: string }) => {
      const { error } = await supabase
        .from("reminders")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["active-reminders"] });
    },
  });
};

export const useDeleteReminder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (reminder: Reminder) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Save to history before deleting
      await supabase.from("reminder_history").insert({
        reminder_id: reminder.id,
        reminder_title: reminder.title,
        reminder_description: reminder.description,
        event_date: reminder.event_date,
        action: "cancelled",
        action_by: user.id,
        original_created_by: reminder.created_by,
        mention_type: reminder.mention_type,
      });

      const { error } = await supabase.from("reminders").delete().eq("id", reminder.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["active-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["reminder-history"] });
    },
  });
};

export const useAcknowledgeReminder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (reminder: Reminder) => {
      if (!user?.id) throw new Error("User not authenticated");

      // First get the current acknowledged_by array
      const { data: currentReminder, error: fetchError } = await supabase
        .from("reminders")
        .select("acknowledged_by")
        .eq("id", reminder.id)
        .maybeSingle();

      if (fetchError) {
        console.error("Acknowledge fetch error:", fetchError);
        throw fetchError;
      }
      if (!currentReminder) throw new Error("Reminder not found");

      const currentAcknowledged = currentReminder.acknowledged_by || [];
      
      // For recurring reminders, persist daily acknowledgement in history only
      const isRecurring = !!reminder.is_recurring && (reminder.recurring_days?.length ?? 0) > 0;
      const ackKey = user.id;
      
      // Add user to acknowledged list if not already there (non-recurring)
      if (!currentAcknowledged.includes(ackKey) || isRecurring) {
        // Save to history
        const { error: historyError } = await supabase.from("reminder_history").insert({
          reminder_id: reminder.id,
          reminder_title: reminder.title,
          reminder_description: reminder.description,
          event_date: reminder.event_date,
          action: "acknowledged",
          action_by: user.id,
          original_created_by: reminder.created_by,
          mention_type: reminder.mention_type,
        });

        if (historyError) {
          console.error("Acknowledge history insert error:", historyError);
          // Don't throw - still allow the acknowledge to proceed
        }

        // Recurring reminders should not update acknowledged_by (uuid[]) with date-keys
        if (isRecurring) return;

        const { error } = await supabase
          .from("reminders")
          .update({ 
            acknowledged_by: [...currentAcknowledged, ackKey] 
          })
          .eq("id", reminder.id);

        if (error) {
          console.error("Acknowledge update error:", error);
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["active-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["reminder-history"] });
    },
  });
};

export interface ReminderHistory {
  id: string;
  reminder_id: string;
  reminder_title: string;
  reminder_description: string | null;
  event_date: string;
  action: "acknowledged" | "cancelled";
  action_by: string;
  original_created_by: string;
  mention_type: string;
  created_at: string;
}

export const useReminderHistory = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reminder-history", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("reminder_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as ReminderHistory[];
    },
    enabled: !!user?.id,
  });
};

export const useSnoozeReminder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ reminderId, snoozedUntil }: { reminderId: string; snoozedUntil: string }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("reminder_snoozes" as any)
        .upsert(
          { reminder_id: reminderId, user_id: user.id, snoozed_until: snoozedUntil } as any,
          { onConflict: "reminder_id,user_id" }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-reminders"] });
    },
  });
};
