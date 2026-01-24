import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // Clear local state first
    setSession(null);
    setUser(null);
    
    try {
      // Use 'local' scope to avoid 403 when session doesn't exist on server
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      // Even if signOut fails, we've already cleared local state
      console.log("SignOut completed (local cleanup)");
    }
  };

  return { user, session, loading, signOut };
};
