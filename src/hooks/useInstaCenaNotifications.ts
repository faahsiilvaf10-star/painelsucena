import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { playSoundFile } from "@/lib/sounds";

/**
 * Global hook that listens for new InstaCena posts in realtime
 * and shows a toast popup when someone else creates a post.
 */
export const useInstaCenaNotifications = () => {
  const { user } = useAuth();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;

    // Skip the first render to avoid showing toasts for existing data
    if (!initializedRef.current) {
      initializedRef.current = true;
    }

    const channel = supabase
      .channel("instacena-new-post-notification")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "instacena_posts" },
        (payload) => {
          const newPost = payload.new as {
            user_id: string;
            user_name: string;
            content: string | null;
            is_system_post: boolean;
            image_urls: string[];
          };

          // Don't notify the user about their own posts
          if (newPost.user_id === user.id) return;

          // Skip system posts (they already have their own log style)
          if (newPost.is_system_post) return;

          const truncatedContent = newPost.content
            ? newPost.content.length > 80
              ? newPost.content.substring(0, 80) + "..."
              : newPost.content
            : "Nova publicação com foto";

          const hasImages = newPost.image_urls && newPost.image_urls.length > 0;

          playSoundFile("/sounds/instacena-post.mp3");

          toast(`📢 ${newPost.user_name}`, {
            description: `${truncatedContent}${hasImages ? " 📸" : ""}`,
            duration: 5000,
            action: {
              label: "Ver",
              onClick: () => {
                window.location.href = "/instacena";
              },
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
};
