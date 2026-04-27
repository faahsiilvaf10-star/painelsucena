import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Global hook that creates bell notifications when:
 * 1. Someone reacts to your post
 * 2. Someone comments on your post
 * 3. Someone mentions you in a comment or post
 */
export const useInstaCenaBellNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    // Listen for new reactions on user's posts
    const reactionsChannel = supabase
      .channel("instacena-bell-reactions")
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

          // Don't notify yourself
          if (reaction.user_id === user.id) return;

          // Check if the post belongs to the current user
          const { data: post } = await supabase
            .from("instacena_posts")
            .select("user_id, content")
            .eq("id", reaction.post_id)
            .maybeSingle();

          if (!post || post.user_id !== user.id) return;

          const emojiMap: Record<string, string> = {
            like: "👍", love: "❤️", haha: "😂", wow: "😮", sad: "😢", angry: "😡",
          };
          const emoji = emojiMap[reaction.reaction_type] || "👍";
          const preview = post.content
            ? post.content.length > 40 ? post.content.substring(0, 40) + "..." : post.content
            : "sua publicação";

          await supabase.from("notifications").insert({
            user_id: user.id,
            type: "instacena_reaction",
            title: `${emoji} ${reaction.user_name} reagiu`,
            message: `Reagiu ao seu post: "${preview}"`,
            reference_id: reaction.post_id,
            reference_type: "instacena_post",
          });
        }
      )
      .subscribe();

    // Listen for new comments on user's posts + mentions in comments
    const commentsChannel = supabase
      .channel("instacena-bell-comments")
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

          // Don't notify yourself
          if (comment.user_id === user.id) return;

          // Check if user is mentioned in the comment (direct or via @todos)
          const mentionPattern = new RegExp(`@\\[[^\\]]+\\]\\(${user.id}\\)`);
          const mentionsAll = /@\[[^\]]+\]\(ALL\)/.test(comment.content);
          const isMentioned = mentionPattern.test(comment.content) || mentionsAll;

          if (isMentioned) {
            await supabase.from("notifications").insert({
              user_id: user.id,
              type: "instacena_mention",
              title: mentionsAll ? `📣 ${comment.user_name} mencionou todos` : `📢 ${comment.user_name} mencionou você`,
              message: `Em um comentário: "${comment.content.length > 50 ? comment.content.substring(0, 50) + "..." : comment.content}"`,
              reference_id: comment.post_id,
              reference_type: "instacena_post",
            });
            return; // Don't send duplicate "commented" notification
          }

          // Check if the post belongs to the current user
          const { data: post } = await supabase
            .from("instacena_posts")
            .select("user_id")
            .eq("id", comment.post_id)
            .maybeSingle();

          if (!post || post.user_id !== user.id) return;

          await supabase.from("notifications").insert({
            user_id: user.id,
            type: "instacena_comment",
            title: `💬 ${comment.user_name} comentou`,
            message: `"${comment.content.length > 60 ? comment.content.substring(0, 60) + "..." : comment.content}"`,
            reference_id: comment.post_id,
            reference_type: "instacena_post",
          });
        }
      )
      .subscribe();

    // Listen for mentions in new posts
    const postsChannel = supabase
      .channel("instacena-bell-post-mentions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "instacena_posts" },
        async (payload) => {
          const post = payload.new as {
            id: string;
            user_id: string;
            user_name: string;
            content: string | null;
            is_system_post: boolean;
          };

          if (post.user_id === user.id || post.is_system_post || !post.content) return;

          const mentionPattern = new RegExp(`@\\[[^\\]]+\\]\\(${user.id}\\)`);
          const mentionsAll = /@\[[^\]]+\]\(ALL\)/.test(post.content);
          if (!mentionPattern.test(post.content) && !mentionsAll) return;

          await supabase.from("notifications").insert({
            user_id: user.id,
            type: "instacena_mention",
            title: mentionsAll ? `📣 ${post.user_name} mencionou todos` : `📢 ${post.user_name} mencionou você`,
            message: `Em uma publicação: "${post.content.length > 50 ? post.content.substring(0, 50) + "..." : post.content}"`,
            reference_id: post.id,
            reference_type: "instacena_post",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reactionsChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(postsChannel);
    };
  }, [user?.id]);
};
