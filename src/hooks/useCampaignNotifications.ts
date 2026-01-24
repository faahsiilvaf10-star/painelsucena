import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentMonthCampaigns } from "@/data/campaignData";

const CAMPAIGN_NOTIFICATION_KEY = "last_campaign_notification_month";

export const useCampaignNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const checkAndCreateNotification = async () => {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const dayOfMonth = new Date().getDate();
      
      // Only notify in the first 5 days of the month
      if (dayOfMonth > 5) return;

      const notificationKey = `${currentYear}-${currentMonth}`;
      const lastNotified = localStorage.getItem(CAMPAIGN_NOTIFICATION_KEY);
      
      // Already notified this month
      if (lastNotified === notificationKey) return;

      const monthData = getCurrentMonthCampaigns();
      if (!monthData) return;

      const campaignNames = monthData.campaigns.map(c => c.name).join(", ");
      const campaignColors = monthData.campaigns.map(c => c.colorName).join(" e ");

      // Create notification in database
      const { error } = await supabase.from("notifications").insert({
        user_id: user.id,
        title: `🎗️ Campanhas de ${monthData.monthName}`,
        message: `Este mês celebramos: ${campaignNames}. As cores são ${campaignColors}. Clique para saber mais sobre cada campanha.`,
        type: "campaign",
        reference_type: "campaign",
        reference_id: notificationKey,
      });

      if (!error) {
        localStorage.setItem(CAMPAIGN_NOTIFICATION_KEY, notificationKey);
      }
    };

    checkAndCreateNotification();
  }, [user]);
};
