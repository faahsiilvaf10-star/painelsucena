import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect } from "react";
import { getBrazilNorthMidnight, getDaysUntilEventBrazilNorth } from "@/lib/timezone";

export interface Reminder {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  alert_days_before: number;
  show_on_event_day: boolean;
  mention_type: "all" | "specific" | "me";
  mentioned_users: string[];
  acknowledged_by: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ReminderInsert {
  title: string;
  description?: string;
  event_date: string;
  alert_days_before?: number;
  show_on_event_day?: boolean;
  mention_type: "all" | "specific" | "me";
  mentioned_users?: string[];
  created_by: string;
}

export const useReminders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["reminders", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .order("event_date", { ascending: true });

      if (error) throw error;
      return data as Reminder[];
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

  return useQuery({
    queryKey: ["active-reminders", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .order("event_date", { ascending: true });

      if (error) throw error;

      const reminders = data as Reminder[];
      
      // Filter reminders that should be shown based on alert_days_before or show_on_event_day
      return reminders.filter((reminder) => {
        // Use Brazil North timezone for date calculations
        const daysUntilEvent = getDaysUntilEventBrazilNorth(reminder.event_date);

        // Check if user has already acknowledged this reminder
        const hasAcknowledged = reminder.acknowledged_by?.includes(user.id);
        if (hasAcknowledged) return false;

        // Check if user should see this reminder based on mention_type
        const isRelevant =
          reminder.mention_type === "all" ||
          (reminder.mention_type === "me" && reminder.created_by === user.id) ||
          (reminder.mention_type === "specific" &&
            reminder.mentioned_users.includes(user.id));

        if (!isRelevant) return false;

        // Show if within alert_days_before range OR if it's the event day
        if (reminder.alert_days_before > 0 && daysUntilEvent <= reminder.alert_days_before && daysUntilEvent >= 0) {
          return true;
        }

        if (reminder.show_on_event_day && daysUntilEvent === 0) {
          return true;
        }

        return false;
      });
    },
    enabled: !!user?.id,
  });
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
      return data as Reminder;
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

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reminders").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["active-reminders"] });
    },
  });
};

export const useAcknowledgeReminder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      // First get the current acknowledged_by array
      const { data: reminder, error: fetchError } = await supabase
        .from("reminders")
        .select("acknowledged_by")
        .eq("id", reminderId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!reminder) throw new Error("Reminder not found");

      const currentAcknowledged = reminder.acknowledged_by || [];
      
      // Add user to acknowledged list if not already there
      if (!currentAcknowledged.includes(user.id)) {
        const { error } = await supabase
          .from("reminders")
          .update({ 
            acknowledged_by: [...currentAcknowledged, user.id] 
          })
          .eq("id", reminderId);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["active-reminders"] });
    },
  });
};
