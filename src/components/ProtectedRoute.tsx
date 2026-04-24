import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOfflineDriverRedirect } from "@/hooks/useOfflineDriverRedirect";
import { getStoredEnvironment } from "@/hooks/useEnvironment";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

type Session = any;

// Driver roles that should be redirected to the driver panel
const DRIVER_ROLES = ["motorista_pipa", "motorista_munk"];

const SESSION_TAB_KEY = "session_tab_active";

// Minimal loading fallback consistent with App.tsx
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex gap-1.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  </div>
);

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [cargoChecked, setCargoChecked] = useState(false);
  const [forceLoad, setForceLoad] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setForceLoad(true), 10000); // 10s safety timeout
    return () => clearTimeout(timer);
  }, []);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasAvatar, setHasAvatar] = useState<boolean | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Hook for automatic offline redirect for drivers on mobile
  useOfflineDriverRedirect();

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (currentSession) {
          setSession(currentSession);
          sessionStorage.setItem(SESSION_TAB_KEY, "1");
          await fetchUserCargo(currentSession.user.id);
        } else {
          setLoading(false);
          setCargoChecked(true);
        }
      } catch (err) {
        console.error("Error initializing auth:", err);
        if (mounted) {
          setLoading(false);
          setCargoChecked(true);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!mounted) return;

      setSession(currentSession);
      
      if (event === "SIGNED_OUT") {
        setUserCargo(null);
        setCargoChecked(false);
        sessionStorage.removeItem(SESSION_TAB_KEY);
        navigate("/auth", { replace: true });
      }

      if (event === "SIGNED_IN" && currentSession?.user) {
        sessionStorage.setItem(SESSION_TAB_KEY, "1");
        fetchUserCargo(currentSession.user.id);
      }
      
      setLoading(false);
    });

    initAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const fetchUserCargo = async (userId: string) => {
    try {
      const [profileResult, roleResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("cargo, avatar_url")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .in("role", ["admin", "moderator"])
          .maybeSingle()
      ]);

      const cargo = profileResult.data?.cargo || null;
      const admin = !!roleResult.data;
      const avatarUrl = profileResult.data?.avatar_url;

      setUserCargo(cargo);
      setIsAdmin(admin);
      setHasAvatar(!!avatarUrl && avatarUrl.trim().length > 0);

      return { cargo, admin };
    } catch (err) {
      console.error("Error fetching user cargo:", err);
      return { cargo: null, admin: false };
    } finally {
      setCargoChecked(true);
    }
  };

  // Show loader while loading session or checking cargo instead of blank page
  if ((loading || !cargoChecked) && !forceLoad) {
    return <PageLoader />;
  }

  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  const isDriver = userCargo && DRIVER_ROLES.includes(userCargo);

  // Pages that drivers are allowed to access
  const DRIVER_ALLOWED_PATHS = ['/selecao-veiculo', '/painel-motorista', '/registro-movimento-motorista', '/hora-extra', '/equipamentos-motorista', '/relatorios-motorista', '/pontos-abastecimento', '/lembretes'];

  // Check if driver has selected a vehicle
  const hasSelectedVehicle = localStorage.getItem("selectedVehicleId");

  // Environment gate: non-drivers must pick an environment after login.
  // Drivers go straight to their dedicated flow (vehicle selection / driver panel).
  if (!isDriver) {
    const environment = getStoredEnvironment();
    if (!environment && location.pathname !== "/selecao-ambiente") {
      return <Navigate to="/selecao-ambiente" replace />;
    }
  }

  // If user is a driver
  if (isDriver && !isAdmin) {
    // If no vehicle selected and not already on vehicle selection page, redirect to vehicle selection
    if (!hasSelectedVehicle && location.pathname !== '/selecao-veiculo') {
      return <Navigate to="/selecao-veiculo" replace />;
    }
    
    // If vehicle is selected but on selection page, redirect to panel
    if (hasSelectedVehicle && location.pathname === '/selecao-veiculo') {
      return <Navigate to="/painel-motorista" replace />;
    }
    
    // If trying to access a page not in allowed list, redirect to driver panel
    if (!DRIVER_ALLOWED_PATHS.includes(location.pathname)) {
      return <Navigate to="/painel-motorista" replace />;
    }
  }

  // If user is NOT a driver and NOT an admin, trying to access driver panel, redirect to home
  if (!isDriver && !isAdmin && location.pathname === '/painel-motorista') {
    return <Navigate to="/" replace />;
  }

  // Block users without profile photo - redirect to settings (drivers are exempt)
  if (hasAvatar === false && !isDriver && location.pathname !== '/configuracoes') {
    return <Navigate to="/configuracoes" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
