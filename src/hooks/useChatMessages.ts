import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { playIOSNotificationSound } from "@/lib/sounds";
import type { Tables } from "@/integrations/supabase/types";

export type ChatMessage = Tables<"chat_messages">;

export const useChatMessages = (otherUserId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastMessageIdRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);

  // Fetch messages between current user and selected user
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["chat-messages", user?.id, otherUserId],
    queryFn: async () => {
      if (!user?.id || !otherUserId) return [];

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!otherUserId,
  });

  // Track initial load to prevent sound on first load
  useEffect(() => {
    if (messages.length > 0 && isInitialLoadRef.current) {
      lastMessageIdRef.current = messages[messages.length - 1]?.id || null;
      isInitialLoadRef.current = false;
    }
  }, [messages]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!user?.id || !otherUserId) return;

    const channel = supabase
      .channel(`chat-${user.id}-${otherUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          // Only process if it's relevant to this conversation
          if (
            (newMessage.sender_id === user.id && newMessage.receiver_id === otherUserId) ||
            (newMessage.sender_id === otherUserId && newMessage.receiver_id === user.id)
          ) {
            // Play sound only for incoming messages (not sent by current user)
            if (newMessage.sender_id === otherUserId && newMessage.id !== lastMessageIdRef.current) {
              playIOSNotificationSound();
            }
            
            lastMessageIdRef.current = newMessage.id;
            
            queryClient.invalidateQueries({
              queryKey: ["chat-messages", user.id, otherUserId],
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, otherUserId, queryClient]);

  // Reset initial load flag when conversation changes
  useEffect(() => {
    isInitialLoadRef.current = true;
    lastMessageIdRef.current = null;
  }, [otherUserId]);

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({
      content,
      imageUrl,
    }: {
      content?: string;
      imageUrl?: string;
    }) => {
      if (!user?.id || !otherUserId) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          sender_id: user.id,
          receiver_id: otherUserId,
          content: content || null,
          image_url: imageUrl || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["chat-messages", user?.id, otherUserId],
      });
    },
  });

  // Upload image
  const uploadImage = async (file: File): Promise<string> => {
    if (!user?.id) throw new Error("User not authenticated");

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("chat-images")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("chat-images")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const clearConversation = async () => {
    if (!user?.id || !otherUserId) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("chat_messages")
      .delete()
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
      );

    if (error) throw error;

    queryClient.invalidateQueries({
      queryKey: ["chat-messages", user.id, otherUserId],
    });
  };

  return {
    messages,
    isLoading,
    sendMessage,
    uploadImage,
    clearConversation,
  };
};
