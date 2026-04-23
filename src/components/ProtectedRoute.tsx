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
  const [userCargo, setUserCargo] = useState<string | null>(null);
  const [cargoChecked, setCargoChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasAvatar, setHasAvatar] = useState<boolean | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Hook for automatic offline redirect for drivers on mobile
  useOfflineDriverRedirect();

  useEffect(() => {
    const authClient = supabase.auth as any;

    const {
      data: { subscription },
    } = authClient.onAuthStateChange((event: string, currentSession: Session | null) => {
      setSession(currentSession);
      setLoading(false);

      // Redirect to auth on sign out
      if (event === "SIGNED_OUT") {
        setUserCargo(null);
        setCargoChecked(false);
        sessionStorage.removeItem(SESSION_TAB_KEY);
        navigate("/auth", { replace: true });
      }

      // On fresh login, mark tab active and fetch cargo (no auto-logout check)
      if (event === "SIGNED_IN" && currentSession?.user) {
        sessionStorage.setItem(SESSION_TAB_KEY, "1");
        setTimeout(() => {
          fetchUserCargo(currentSession.user.id);
        }, 0);
      }
    });

    // Check for existing session on page load
    const initSession = async () => {
      try {
        const {
          data: { session: existingSession },
          error: sessionError
        } = await authClient.getSession();

        if (sessionError) throw sessionError;

        if (existingSession) {
          setSession(existingSession);
          setLoading(false);

          // Only check tab flag on initial page load (not after a fresh login)
          const tabWasActive = sessionStorage.getItem(SESSION_TAB_KEY);
          const cargoInfo = await fetchUserCargo(existingSession.user.id);
          const cargo = cargoInfo?.cargo;
          const isDriverRole = cargo && DRIVER_ROLES.includes(cargo);

          // Browser was closed & reopened with a stale session → auto-logout non-drivers
          if (!tabWasActive && !isDriverRole) {
            console.log("Browser was closed. Auto-logging out non-driver user.");
            setSession(null);
            try {
              await authClient.signOut({ scope: "local" });
            } catch {
              /* ignore */
            }
            navigate("/auth", { replace: true });
            return;
          }

          // Session is valid, mark tab as active
          sessionStorage.setItem(SESSION_TAB_KEY, "1");
        } else {
          // Try to refresh the session if no active session found
          const {
            data: { session: refreshedSession },
            error: refreshError
          } = await authClient.refreshSession();
          
          if (refreshError) throw refreshError;
          
          setSession(refreshedSession);
          setLoading(false);
          if (refreshedSession?.user) {
            await fetchUserCargo(refreshedSession.user.id);
            sessionStorage.setItem(SESSION_TAB_KEY, "1");
          } else {
            setCargoChecked(true);
          }
        }
      } catch (err) {
        console.error("Error initializing session:", err);
        setLoading(false);
        setCargoChecked(true);
      }
    };

    initSession();

    return () => subscription.unsubscribe();
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
  if (loading || !cargoChecked) {
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
