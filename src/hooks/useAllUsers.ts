import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
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

type ProfileData = {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  cargo: string;
};

export const useAllUsers = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const { data: adminUserIds } = useAdminUsers();
  const [lastSeenMap, setLastSeenMap] = useState<Map<string, string>>(new Map());
  const [justOnlineIds, setJustOnlineIds] = useState<Set<string>>(new Set());
  const previousOnlineIdsRef = useRef<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const justOnlineTimeoutRef = useRef<number | null>(null);

  // Track current user in presence channel
  const trackCurrentUser = useCallback(
    async (presenceChannel: RealtimeChannel) => {
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const now = new Date().toISOString();
      const payload = profile
        ? {
            id: profile.id,
            user_id: user.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            cargo: profile.cargo,
            online_at: now,
          }
        : {
            user_id: user.id,
            online_at: now,
          };

      await presenceChannel.track(payload as any);
    },
    [user]
  );

  // Fetch all profiles once
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

      setProfiles(data || []);
      setIsLoading(false);
    };

    fetchProfiles();
  }, []);

  // Presence tracking
  useEffect(() => {
    if (!user) return;

    // Cleanup previous resources
    if (heartbeatRef.current) {
      window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    if (justOnlineTimeoutRef.current) {
      window.clearTimeout(justOnlineTimeoutRef.current);
      justOnlineTimeoutRef.current = null;
    }

    const presenceChannel = supabase.channel("online-users", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channelRef.current = presenceChannel;

    const handlePresenceSync = () => {
      const state = presenceChannel.presenceState();
      const currentOnlineIds = new Set<string>();
      const onlineAtTimes = new Map<string, string>();

      // Extract online user IDs and their online_at times
      Object.values(state).forEach((presences: any[]) => {
        presences.forEach((presence) => {
          if (presence?.user_id) {
            currentOnlineIds.add(presence.user_id);
            if (presence.online_at) {
              onlineAtTimes.set(presence.user_id, presence.online_at);
            }
          }
        });
      });

      // Detect users who just came online
      const newlyOnline = new Set<string>();
      currentOnlineIds.forEach((id) => {
        if (!previousOnlineIdsRef.current.has(id) && id !== user.id) {
          newlyOnline.add(id);
        }
      });

      // Trigger animation for newly online users
      if (newlyOnline.size > 0) {
        setJustOnlineIds(newlyOnline);
        if (justOnlineTimeoutRef.current) {
          window.clearTimeout(justOnlineTimeoutRef.current);
        }
        justOnlineTimeoutRef.current = window.setTimeout(() => {
          setJustOnlineIds(new Set());
        }, 3000);
      }

      // Update lastSeen map
      setLastSeenMap((prev) => {
        const next = new Map(prev);
        
        // Set lastSeen to now for users who just went offline
        previousOnlineIdsRef.current.forEach((id) => {
          if (!currentOnlineIds.has(id)) {
            next.set(id, new Date().toISOString());
          }
        });
        
        // Update lastSeen for currently online users (used when they go offline)
        onlineAtTimes.forEach((onlineAt, id) => {
          next.set(id, onlineAt);
        });
        
        return next;
      });

      // Update refs and state
      previousOnlineIdsRef.current = currentOnlineIds;
      setOnlineUserIds(new Set(currentOnlineIds));
    };

    presenceChannel
      .on("presence", { event: "sync" }, handlePresenceSync)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await trackCurrentUser(presenceChannel);

          // Heartbeat to maintain presence
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
      if (justOnlineTimeoutRef.current) {
        window.clearTimeout(justOnlineTimeoutRef.current);
        justOnlineTimeoutRef.current = null;
      }
      presenceChannel.unsubscribe();
      channelRef.current = null;
    };
  }, [user, trackCurrentUser]);

  // Build the final users list with status
  const allUsers: UserWithStatus[] = profiles
    .map((profile) => {
      const isOnline = onlineUserIds.has(profile.user_id);
      const lastSeen = lastSeenMap.get(profile.user_id);
      
      return {
        ...profile,
        isOnline,
        isCurrentUser: profile.user_id === user?.id,
        isAdmin: adminUserIds?.has(profile.user_id) ?? false,
        lastSeen: isOnline ? undefined : lastSeen, // Only show lastSeen for offline users
        justCameOnline: justOnlineIds.has(profile.user_id),
      };
    })
    .sort((a, b) => {
      if (a.isCurrentUser) return -1;
      if (b.isCurrentUser) return 1;
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return a.full_name.localeCompare(b.full_name);
    });

  const onlineCount = allUsers.filter((u) => u.isOnline).length;
  const offlineCount = allUsers.filter((u) => !u.isOnline).length;

  return { 
    allUsers, 
    onlineCount, 
    offlineCount, 
    isLoading 
  };
};
