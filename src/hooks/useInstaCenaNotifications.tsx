import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { playSoundFile } from "@/lib/sounds";

const INSTACENA_LOGO = "/instacena-logo.png";

const navigateToPost = (postId: string) => {
  const path = `/instacena?highlight=${postId}`;
  if (window.location.pathname === "/instacena") {
    // Already on the page, scroll to the post
    const el = document.getElementById(`post-${postId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary", "rounded-lg");
      setTimeout(() => el.classList.remove("ring-2", "ring-primary", "rounded-lg"), 3000);
    } else {
      window.location.href = path;
    }
  } else {
    window.location.href = path;
  }
};

const showInstaCenaToast = (title: string, description: string, postId: string) => {
  playSoundFile("/sounds/instacena-post.mp3");

  toast(title, {
    description,
    duration: 6000,
    icon: <img src={INSTACENA_LOGO} alt="InstaCena" className="h-6 w-6 rounded-full object-cover" />,
    action: {
      label: "Ver",
      onClick: () => navigateToPost(postId),
    },
  });
};

/**
 * Global hook that listens for new InstaCena posts, comments & reactions in realtime
 * and shows a toast popup when someone else interacts.
 */
export const useInstaCenaNotifications = () => {
  const { user } = useAuth();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;

    if (!initializedRef.current) {
      initializedRef.current = true;
    }

    // Listen for new posts
    const postsChannel = supabase
      .channel("instacena-toast-posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "instacena_posts" },
        (payload) => {
          const newPost = payload.new as {
            id: string;
            user_id: string;
            user_name: string;
            content: string | null;
            is_system_post: boolean;
            image_urls: string[];
          };

          if (newPost.user_id === user.id) return;
          if (newPost.is_system_post) return;

          const truncatedContent = newPost.content
            ? newPost.content.length > 80
              ? newPost.content.substring(0, 80) + "..."
              : newPost.content
            : "Nova publicação com foto";

          const hasImages = newPost.image_urls && newPost.image_urls.length > 0;

          showInstaCenaToast(
            `📢 ${newPost.user_name}`,
            `${truncatedContent}${hasImages ? " 📸" : ""}`,
            newPost.id
          );
        }
      )
      .subscribe();

    // Listen for new comments on user's posts
    const commentsChannel = supabase
      .channel("instacena-toast-comments")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "instacena_comments" },
        async (payload) => {
          const comment = payload.new as {
            id: string;
            post_id: string;
            user_id: string;
            user_name: string;
            content: string;
          };

          if (comment.user_id === user.id) return;

          // Check if the post belongs to the current user
          const { data: post } = await supabase
            .from("instacena_posts")
            .select("user_id")
            .eq("id", comment.post_id)
            .maybeSingle();

          if (!post || post.user_id !== user.id) return;

          const truncated = comment.content.length > 60
            ? comment.content.substring(0, 60) + "..."
            : comment.content;

          showInstaCenaToast(
            `💬 ${comment.user_name} comentou`,
            truncated,
            comment.post_id
          );
        }
      )
      .subscribe();

    // Listen for new reactions on user's posts
    const reactionsChannel = supabase
      .channel("instacena-toast-reactions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "instacena_reactions" },
        async (payload) => {
          const reaction = payload.new as {
            id: string;
            post_id: string;
            user_id: string;
            user_name: string;
            reaction_type: string;
          };

          if (reaction.user_id === user.id) return;

          const { data: post } = await supabase
            .from("instacena_posts")
            .select("user_id")
            .eq("id", reaction.post_id)
            .maybeSingle();

          if (!post || post.user_id !== user.id) return;

          const emojiMap: Record<string, string> = {
            like: "👍", love: "❤️", haha: "😂", wow: "😮", sad: "😢", angry: "😡",
          };
          const emoji = emojiMap[reaction.reaction_type] || "👍";

          showInstaCenaToast(
            `${emoji} ${reaction.user_name} reagiu`,
            "Reagiu à sua publicação",
            reaction.post_id
          );
        }
      )
      .subscribe();

    // Listen for DDS event photos (posted as InstaCena system posts with DDS content)
    const ddsChannel = supabase
      .channel("instacena-toast-dds")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "dds_schedule" },
        (payload) => {
          const updated = payload.new as {
            id: string;
            event_photo_url: string | null;
            theme: string;
          };
          const old = payload.old as {
            event_photo_url: string | null;
          };

          // Only trigger when event_photo_url is newly set
          if (!updated.event_photo_url || old.event_photo_url === updated.event_photo_url) return;

          playSoundFile("/sounds/instacena-post.mp3");

          toast("📋 Foto do DDS postada!", {
            description: `Tema: ${updated.theme}`,
            duration: 6000,
            icon: <img src={INSTACENA_LOGO} alt="InstaCena" className="h-6 w-6 rounded-full object-cover" />,
            action: {
              label: "Ver no InstaCena",
              onClick: () => {
                window.location.href = "/instacena";
              },
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(reactionsChannel);
      supabase.removeChannel(ddsChannel);
    };
  }, [user?.id]);
};
