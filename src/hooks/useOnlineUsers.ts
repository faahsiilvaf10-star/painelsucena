import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { RealtimeChannel } from "@supabase/supabase-js";

export type OnlineUser = {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  cargo: string;
  online_at: string;
};

export const useOnlineUsers = () => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user) return;

    // Create presence channel
    const presenceChannel = supabase.channel("online-users", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const users: OnlineUser[] = [];
        
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((presence) => {
            if (presence.user_id !== user.id) {
              users.push(presence as OnlineUser);
            }
          });
        });
        
        setOnlineUsers(users);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("User joined:", key, newPresences);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("User left:", key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Get profile data to track
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (profile) {
            await presenceChannel.track({
              id: profile.id,
              user_id: user.id,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
              cargo: profile.cargo,
              online_at: new Date().toISOString(),
            });
          }
        }
      });

    setChannel(presenceChannel);

    return () => {
      presenceChannel.unsubscribe();
    };
  }, [user]);

  return { onlineUsers };
};
