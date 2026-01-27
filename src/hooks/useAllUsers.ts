import { useState, useEffect, useRef } from "react";
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

  // Track presence
  useEffect(() => {
    if (!user) return;

    const presenceChannel = supabase.channel("all-users-presence", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const onlineIds = new Set<string>();
        const newLastSeenMap = new Map(lastSeenMap);
        
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((presence) => {
            onlineIds.add(presence.user_id);
          });
        });
        
        // Track users who just came online (weren't online before, now are)
        const newlyOnline = new Set<string>();
        onlineIds.forEach((id) => {
          if (!previousOnlineIds.current.has(id) && id !== user.id) {
            newlyOnline.add(id);
          }
        });
        
        // Track users who just went offline - save their lastSeen
        previousOnlineIds.current.forEach((id) => {
          if (!onlineIds.has(id)) {
            newLastSeenMap.set(id, new Date().toISOString());
          }
        });
        
        if (newlyOnline.size > 0) {
          setJustOnlineIds(newlyOnline);
          // Clear the animation after 3 seconds
          setTimeout(() => {
            setJustOnlineIds(new Set());
          }, 3000);
        }
        
        setLastSeenMap(newLastSeenMap);
        previousOnlineIds.current = onlineIds;
        setOnlineUserIds(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
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

    return () => {
      presenceChannel.unsubscribe();
    };
  }, [user]);

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
