import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import { useEffect } from "react";

export interface InstaCenaPost {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar_url: string | null;
  content: string | null;
  image_urls: string[];
  created_at: string;
  updated_at: string;
  user_cargo?: string | null;
}

export interface InstaCenaComment {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  user_avatar_url: string | null;
  content: string;
  created_at: string;
}

export interface InstaCenaReaction {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  reaction_type: string;
  created_at: string;
}

export const useInstaCenaPosts = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["instacena-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instacena_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch admin status for post authors from user_roles
      const userIds = [...new Set((data || []).map((p) => p.user_id))];
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("user_id", userIds)
        .eq("role", "admin");
      const adminSet = new Set(adminRoles?.map((r) => r.user_id) || []);

      return (data || []).map((post) => ({
        ...post,
        user_cargo: adminSet.has(post.user_id) ? "admin" : null,
      })) as InstaCenaPost[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("instacena-posts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "instacena_posts" }, () => {
        queryClient.invalidateQueries({ queryKey: ["instacena-posts"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
};

export const useInstaCenaComments = (postId: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["instacena-comments", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instacena_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as InstaCenaComment[];
    },
    enabled: !!postId,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`instacena-comments-${postId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "instacena_comments", filter: `post_id=eq.${postId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["instacena-comments", postId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient, postId]);

  return query;
};

export const useInstaCenaReactions = (postId: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["instacena-reactions", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instacena_reactions")
        .select("*")
        .eq("post_id", postId);
      if (error) throw error;
      return data as InstaCenaReaction[];
    },
    enabled: !!postId,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`instacena-reactions-${postId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "instacena_reactions", filter: `post_id=eq.${postId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["instacena-reactions", postId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient, postId]);

  return query;
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async ({ content, imageUrls }: { content: string; imageUrls?: string[] }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("instacena_posts").insert({
        user_id: user.id,
        user_name: profile?.full_name || "Usuário",
        user_avatar_url: profile?.avatar_url || null,
        content,
        image_urls: imageUrls || [],
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instacena-posts"] });
    },
  });
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("instacena_posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instacena-posts"] });
    },
  });
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("instacena_comments").insert({
        post_id: postId,
        user_id: user.id,
        user_name: profile?.full_name || "Usuário",
        user_avatar_url: profile?.avatar_url || null,
        content,
      });
      if (error) throw error;
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["instacena-comments", postId] });
    },
  });
};

export const useToggleReaction = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async ({ postId, reactionType }: { postId: string; reactionType: string }) => {
      if (!user) throw new Error("Not authenticated");

      // Check if user already reacted to this post
      const { data: existing } = await supabase
        .from("instacena_reactions")
        .select("id, reaction_type")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        if (existing.reaction_type === reactionType) {
          // Remove reaction
          await supabase.from("instacena_reactions").delete().eq("id", existing.id);
        } else {
          // Update reaction type
          await supabase.from("instacena_reactions").update({ reaction_type: reactionType }).eq("id", existing.id);
        }
      } else {
        // Insert new reaction
        const { error } = await supabase.from("instacena_reactions").insert({
          post_id: postId,
          user_id: user.id,
          user_name: profile?.full_name || "Usuário",
          reaction_type: reactionType,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["instacena-reactions", postId] });
    },
  });
};
