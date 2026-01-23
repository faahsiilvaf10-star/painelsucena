import { useEffect, useState, useCallback } from "react";

export const useBrowserNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if browser supports notifications
    if ("Notification" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      console.log("Browser does not support notifications");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!isSupported || permission !== "granted") {
        return null;
      }

      // Only show if page is not visible (in background)
      if (document.visibilityState === "hidden") {
        try {
          const notification = new Notification(title, {
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: "painel-sucena-notification",
            ...options,
          });

          // Focus window when notification is clicked
          notification.onclick = () => {
            window.focus();
            notification.close();
          };

          // Auto close after 5 seconds
          setTimeout(() => notification.close(), 5000);

          return notification;
        } catch (error) {
          console.error("Error showing notification:", error);
          return null;
        }
      }

      return null;
    },
    [isSupported, permission]
  );

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    isGranted: permission === "granted",
    isDenied: permission === "denied",
  };
};
