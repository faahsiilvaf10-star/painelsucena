import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useAdminUsers } from "./useAdminUsers";

export type UserWithStatus = {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  cargo: string;
  isOnline: boolean;
  isCurrentUser: boolean;
  isAdmin: boolean;
  online_at?: string;
  lastSeen?: string;
  justCameOnline?: boolean;
};

export const useAllUsers = () => {
  const { user } = useAuth();
  const [allUsers, setAllUsers] = useState<UserWithStatus[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const { data: adminUserIds } = useAdminUsers();
  const [lastSeenMap, setLastSeenMap] = useState<Map<string, string>>(new Map());
  const [justOnlineIds, setJustOnlineIds] = useState<Set<string>>(new Set());
  const previousOnlineIds = useRef<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatRef = useRef<number | null>(null);

  // Define trackCurrentUser before any useEffect that uses it
  const trackCurrentUser = useCallback(
    async (presenceChannel: RealtimeChannel) => {
      if (!user) return;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.warn("Presence: erro ao buscar profile para track:", error);
      }

      const payload = profile
        ? {
            id: profile.id,
            user_id: user.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            cargo: profile.cargo,
            online_at: new Date().toISOString(),
          }
        : {
            user_id: user.id,
            online_at: new Date().toISOString(),
          };

      const trackRes = await presenceChannel.track(payload as any);
      if (trackRes === "error") {
        console.warn("Presence: track retornou erro");
      }
    },
    [user]
  );

  // Fetch all profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, avatar_url, cargo")
        .order("full_name");

      if (error) {
        console.error("Error fetching profiles:", error);
        setIsLoading(false);
        return;
      }

      setAllUsers(
        data.map((profile) => ({
          ...profile,
          isOnline: false,
          isCurrentUser: false,
          isAdmin: false,
        }))
      );
      setIsLoading(false);
    };

    fetchProfiles();
  }, []);

  // Track presence - use same channel name as useOnlineUsers for consistency
  useEffect(() => {
    if (!user) return;

    // Cleanup any previous channel/heartbeat (defensive)
    if (heartbeatRef.current) {
      window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    const presenceChannel = supabase.channel("online-users", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channelRef.current = presenceChannel;

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const onlineIds = new Set<string>();
        const onlineAtTimes = new Map<string, string>();

        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((presence) => {
            if (presence?.user_id) {
              onlineIds.add(presence.user_id);
              // Store the online_at time for each user
              if (presence.online_at) {
                onlineAtTimes.set(presence.user_id, presence.online_at);
              }
            }
          });
        });

        // Track users who just came online (weren't online before, now are)
        const newlyOnline = new Set<string>();
        onlineIds.forEach((id) => {
          if (!previousOnlineIds.current.has(id) && id !== user.id) {
            newlyOnline.add(id);
          }
        });

        if (newlyOnline.size > 0) {
          setJustOnlineIds(newlyOnline);
          // Clear the animation after 3 seconds
          setTimeout(() => {
            setJustOnlineIds(new Set());
          }, 3000);
        }

        // Persist lastSeen using functional update to avoid stale state
        // When a user goes offline, use their last online_at time as lastSeen
        // Also update lastSeen for users who are currently online (for when they go offline)
        setLastSeenMap((prev) => {
          const next = new Map(prev);
          
          // For users who just went offline, set their lastSeen to now
          previousOnlineIds.current.forEach((id) => {
            if (!onlineIds.has(id)) {
              next.set(id, new Date().toISOString());
            }
          });
          
          // For users who are online, update their lastSeen to their online_at time
          // This ensures we have a lastSeen even for users who were online before we joined
          onlineAtTimes.forEach((onlineAt, id) => {
            if (!next.has(id) || onlineIds.has(id)) {
              next.set(id, onlineAt);
            }
          });
          
          return next;
        });

        previousOnlineIds.current = onlineIds;
        setOnlineUserIds(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await trackCurrentUser(presenceChannel);

          // Heartbeat: re-track periodically to recover from transient disconnects
          heartbeatRef.current = window.setInterval(() => {
            void trackCurrentUser(presenceChannel);
          }, 25000);
        }
      });

    return () => {
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      presenceChannel.unsubscribe();
      channelRef.current = null;
    };
  }, [user, trackCurrentUser]);

  // Combine users with online status (include current user)
  const usersWithStatus: UserWithStatus[] = allUsers
    .map((u) => ({
      ...u,
      isOnline: onlineUserIds.has(u.user_id),
      isCurrentUser: u.user_id === user?.id,
      isAdmin: adminUserIds?.has(u.user_id) ?? false,
      lastSeen: lastSeenMap.get(u.user_id),
      justCameOnline: justOnlineIds.has(u.user_id),
    }))
    .sort((a, b) => {
      // Current user first, then online users, then alphabetically
      if (a.isCurrentUser) return -1;
      if (b.isCurrentUser) return 1;
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return a.full_name.localeCompare(b.full_name);
    });

  const onlineCount = usersWithStatus.filter((u) => u.isOnline).length;
  const offlineCount = usersWithStatus.filter((u) => !u.isOnline).length;

  return { 
    allUsers: usersWithStatus, 
    onlineCount, 
    offlineCount, 
    isLoading 
  };
};
