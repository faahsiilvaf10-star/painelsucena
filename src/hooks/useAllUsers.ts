import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useAdminUsers } from "./useAdminUsers";
import { playSoundFile } from "@/lib/sounds";
import { toast } from "sonner";

export type UserWithStatus = {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  cargo: string;
  frame_color?: string | null;
  neon_color?: string | null;
  frame_animation?: string | null;
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
  frame_color?: string | null;
  neon_color?: string | null;
  frame_animation?: string | null;
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

  const cachedProfileRef = useRef<ProfileData | null>(null);

  // Track current user in presence channel
  const trackCurrentUser = useCallback(
    async (presenceChannel: RealtimeChannel) => {
      if (!user) return;

      // Cache profile to avoid re-fetching on every heartbeat
      if (!cachedProfileRef.current) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, user_id, full_name, avatar_url, cargo, frame_color, neon_color, frame_animation")
          .eq("user_id", user.id)
          .maybeSingle();
        if (profile) {
          cachedProfileRef.current = profile;
        }
      }

      const now = new Date().toISOString();
      const cached = cachedProfileRef.current;
      const payload = cached
        ? {
            id: cached.id,
            user_id: user.id,
            full_name: cached.full_name,
            avatar_url: cached.avatar_url,
            cargo: cached.cargo,
            frame_color: cached.frame_color,
            neon_color: cached.neon_color,
            frame_animation: cached.frame_animation,
            online_at: now,
          }
        : {
            user_id: user.id,
            online_at: now,
          };

      try {
        await presenceChannel.track(payload as any);
      } catch (err) {
        console.warn("Presence track failed, will retry on next heartbeat:", err);
      }
    },
    [user]
  );

  // Fetch all profiles once
  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, avatar_url, cargo, frame_color, neon_color, frame_animation")
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

    // Reset cached profile when user changes
    cachedProfileRef.current = null;

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

      // Always include current user as online
      currentOnlineIds.add(user.id);

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

        // Play online sound
        playSoundFile("/sounds/online.mp3");

        // Show toast for each newly online user
        const profileMap = new Map(profiles.map(p => [p.user_id, p]));
        newlyOnline.forEach((uid) => {
          const profile = profileMap.get(uid);
          if (profile) {
            toast(`🟢 ${profile.full_name} está online!`, {
              duration: 3000,
              position: "bottom-right",
            });
          }
        });

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
        
        // Update lastSeen for currently online users
        onlineAtTimes.forEach((onlineAt, id) => {
          next.set(id, onlineAt);
        });
        
        return next;
      });

      // Update refs and state
      previousOnlineIdsRef.current = currentOnlineIds;
      setOnlineUserIds(new Set(currentOnlineIds));
    };

    // Immediately mark current user as online before channel connects
    setOnlineUserIds((prev) => {
      const next = new Set(prev);
      next.add(user.id);
      return next;
    });

    presenceChannel
      .on("presence", { event: "sync" }, handlePresenceSync)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await trackCurrentUser(presenceChannel);

          // Heartbeat every 15s (more frequent for reliability)
          heartbeatRef.current = window.setInterval(() => {
            void trackCurrentUser(presenceChannel);
          }, 15000);
        }
      });

    // Handle visibility change - re-track when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && channelRef.current) {
        void trackCurrentUser(channelRef.current);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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
      const isCurrentUser = profile.user_id === user?.id;
      // Current logged-in user is ALWAYS online
      const isOnline = isCurrentUser || onlineUserIds.has(profile.user_id);
      const lastSeen = lastSeenMap.get(profile.user_id);
      
      return {
        ...profile,
        isOnline,
        isCurrentUser,
        isAdmin: adminUserIds?.has(profile.user_id) ?? false,
        lastSeen: isOnline ? undefined : lastSeen,
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
