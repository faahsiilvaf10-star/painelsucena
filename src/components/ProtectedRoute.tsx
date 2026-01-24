import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we're coming from a login transition
    const transitionInProgress = sessionStorage.getItem("loginTransitionInProgress");
    if (transitionInProgress === "true") {
      setIsTransitioning(true);
      // Clean up after a delay to ensure transition completes
      const cleanup = () => {
        sessionStorage.removeItem("loginTransitionInProgress");
        setIsTransitioning(false);
      };
      
      // Listen for when transition completes
      const checkTransition = setInterval(() => {
        const stillTransitioning = sessionStorage.getItem("loginTransitionInProgress");
        if (stillTransitioning !== "true") {
          setIsTransitioning(false);
          clearInterval(checkTransition);
        }
      }, 100);

      return () => clearInterval(checkTransition);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setLoading(false);
        
        // Redirect to auth on sign out
        if (event === 'SIGNED_OUT') {
          navigate('/auth', { replace: true });
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Show loading while checking session or during transition
  if (loading || isTransitioning) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
