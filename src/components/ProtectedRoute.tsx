import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Driver roles that should be redirected to the driver panel
const DRIVER_ROLES = ['motorista_pipa', 'motorista_munk'];

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userCargo, setUserCargo] = useState<string | null>(null);
  const [cargoChecked, setCargoChecked] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setLoading(false);
        
        // Redirect to auth on sign out
        if (event === 'SIGNED_OUT') {
          setUserCargo(null);
          setCargoChecked(false);
          navigate('/auth', { replace: true });
        }
        
        // Fetch cargo when signed in
        if (event === 'SIGNED_IN' && currentSession?.user) {
          setTimeout(() => {
            fetchUserCargo(currentSession.user.id);
          }, 0);
        }
      }
    );

    // Try to get existing session, with refresh attempt if needed
    const initSession = async () => {
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      
      if (existingSession) {
        setSession(existingSession);
        setLoading(false);
        fetchUserCargo(existingSession.user.id);
      } else {
        // Try to refresh the session if no active session found
        const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
        setSession(refreshedSession);
        setLoading(false);
        if (refreshedSession?.user) {
          fetchUserCargo(refreshedSession.user.id);
        } else {
          setCargoChecked(true);
        }
      }
    };

    initSession();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserCargo = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("cargo")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data) {
        setUserCargo(data.cargo);
      }
    } catch (err) {
      console.error("Error fetching user cargo:", err);
    } finally {
      setCargoChecked(true);
    }
  };

  // Show nothing while loading session or checking cargo
  if (loading || !cargoChecked) {
    return null;
  }

  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  const isDriver = userCargo && DRIVER_ROLES.includes(userCargo);

  // If user is a driver and trying to access "/" (home), redirect to driver panel
  if (isDriver && location.pathname === '/') {
    return <Navigate to="/painel-motorista" replace />;
  }

  // If user is NOT a driver and trying to access driver panel, redirect to home
  if (!isDriver && location.pathname === '/painel-motorista') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
