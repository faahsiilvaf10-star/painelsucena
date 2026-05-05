import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, LogOut, Loader2, Lock, Factory, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEnvironment, ENVIRONMENTS, type EnvironmentId } from "@/hooks/useEnvironment";
import { useMyEnvironmentAccess } from "@/hooks/useEnvironmentAccess";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface UserSummary {
  fullName: string;
  avatarUrl: string | null;
}

type EnvVisual = {
  Icon: typeof Factory;
  iconColor: string;
  iconBg: string;
  iconRing: string;
  badgeLabel: string;
  badgeBg: string;
  ctaBg: string;
  ctaHover: string;
  illustrationColor: string;
};

const ENV_VISUAL: Record<EnvironmentId, EnvVisual> = {
  barcarena: {
    Icon: Factory,
    iconColor: "text-blue-600",
    iconBg: "bg-white",
    iconRing: "ring-blue-100",
    badgeLabel: "SISTEMA ATUAL",
    badgeBg: "bg-blue-600 text-white",
    ctaBg: "bg-blue-600",
    ctaHover: "group-hover:bg-blue-700",
    illustrationColor: "text-blue-100",
  },
  paragominas: {
    Icon: Building2,
    iconColor: "text-emerald-600",
    iconBg: "bg-white",
    iconRing: "ring-emerald-100",
    badgeLabel: "NOVA OPERAÇÃO",
    badgeBg: "bg-emerald-600 text-white",
    ctaBg: "bg-emerald-600",
    ctaHover: "group-hover:bg-emerald-700",
    illustrationColor: "text-emerald-100",
  },
};

// Decorative SVG illustration of buildings (industrial / city)
function FactoryIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 200" fill="currentColor" className={className} aria-hidden>
      <path d="M30 180 V90 L70 110 V70 L120 100 V60 H160 V180 Z" opacity="0.45" />
      <rect x="150" y="30" width="14" height="50" opacity="0.45" />
      <rect x="80" y="120" width="10" height="14" fill="white" opacity="0.7" />
      <rect x="100" y="120" width="10" height="14" fill="white" opacity="0.7" />
      <rect x="130" y="90" width="10" height="14" fill="white" opacity="0.7" />
      <rect x="130" y="115" width="10" height="14" fill="white" opacity="0.7" />
    </svg>
  );
}

function CityIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 200" fill="currentColor" className={className} aria-hidden>
      <rect x="40" y="60" width="50" height="120" opacity="0.45" />
      <rect x="100" y="30" width="50" height="150" opacity="0.45" />
      <rect x="160" y="80" width="40" height="100" opacity="0.45" />
      {[0, 1, 2, 3, 4, 5].map((row) =>
        [0, 1].map((col) => (
          <rect
            key={`a-${row}-${col}`}
            x={50 + col * 18}
            y={75 + row * 18}
            width="10"
            height="10"
            fill="white"
            opacity="0.7"
          />
        )),
      )}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((row) =>
        [0, 1].map((col) => (
          <rect
            key={`b-${row}-${col}`}
            x={110 + col * 18}
            y={45 + row * 16}
            width="10"
            height="9"
            fill="white"
            opacity="0.7"
          />
        )),
      )}
      {[0, 1, 2, 3, 4].map((row) =>
        [0, 1].map((col) => (
          <rect
            key={`c-${row}-${col}`}
            x={168 + col * 14}
            y={92 + row * 16}
            width="8"
            height="9"
            fill="white"
            opacity="0.7"
          />
        )),
      )}
    </svg>
  );
}

const ILLUSTRATIONS: Record<EnvironmentId, (props: { className?: string }) => JSX.Element> = {
  barcarena: FactoryIllustration,
  paragominas: CityIllustration,
};

export default function SelecaoAmbiente() {
  const navigate = useNavigate();
  const { setEnvironment } = useEnvironment();
  const { toast } = useToast();
  const { environments: allowedEnvs, isLoading: accessLoading, isAdmin } = useMyEnvironmentAccess();
  const [user, setUser] = useState<UserSummary | null>(null);
  const [selecting, setSelecting] = useState<EnvironmentId | null>(null);

  useEffect(() => {
    if (accessLoading) return;
    if (!isAdmin) {
      // Se tiver apenas 1 acesso, redireciona direto
      if (allowedEnvs.length === 1) {
        setEnvironment(allowedEnvs[0]);
        window.location.replace("/");
      }
      // Se não tiver acesso nenhum, manda para o primeiro por padrão (Barcarena) ou redireciona para auth
      else if (allowedEnvs.length === 0) {
        navigate("/auth", { replace: true });
      }
      // Se tiver mais de um, deixa o usuário escolher nesta tela
    } else if (allowedEnvs.length === 1) {
      // Admin com apenas 1 ambiente também pode ser redirecionado direto se desejado, 
      // mas admins geralmente podem ver todos. 
      // O hook useMyEnvironmentAccess retorna todos os ambientes para admin.
      setEnvironment(allowedEnvs[0]);
      window.location.replace("/");
    }
  }, [accessLoading, allowedEnvs, isAdmin, setEnvironment]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const u = data.user;
      if (!u) {
        navigate("/auth", { replace: true });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", u.id)
        .maybeSingle();
      if (!mounted) return;
      setUser({
        fullName: profile?.full_name || u.email?.split("@")[0] || "Usuário",
        avatarUrl: profile?.avatar_url || null,
      });
    })();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const handleSelect = async (envId: EnvironmentId) => {
    setSelecting(envId);
    setEnvironment(envId);
    toast({
      title: `Ambiente selecionado`,
      description: ENVIRONMENTS[envId].label,
    });
    setTimeout(() => {
      window.location.replace("/");
    }, 250);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* ignore */
    }
    navigate("/auth", { replace: true });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-white">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col px-6 py-8 md:px-10 md:py-10">
        {/* Header */}
        <header className="mb-10 flex items-center justify-between md:mb-14">
          <div className="flex items-center gap-3">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-200"
              />
            ) : (
              <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                {user?.fullName?.[0]?.toUpperCase() ?? "U"}
              </div>
            )}
            <div className="leading-tight">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                Bem-vindo
              </p>
              <p className="text-base font-semibold text-slate-900">
                {user?.fullName ?? "..."}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </header>

        {/* Title */}
        <div className="mb-10 text-center md:mb-14">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
            Selecione o ambiente
          </h1>
          <p className="mt-3 text-base text-slate-500">
            Escolha qual operação você deseja acessar agora.
          </p>
        </div>

        {/* Cards */}
        <div className="grid flex-1 gap-6 md:grid-cols-2 md:gap-8">
          {(Object.keys(ENVIRONMENTS) as EnvironmentId[]).map((id) => {
            const env = ENVIRONMENTS[id];
            const visual = ENV_VISUAL[id];
            const Illustration = ILLUSTRATIONS[id];
            const isLoading = selecting === id;
            const hasAccess = allowedEnvs.includes(id);
            const isLocked = !accessLoading && !hasAccess;

            return (
              <div
                key={id}
                className={[
                  "group relative flex flex-col overflow-hidden rounded-3xl bg-white p-7 md:p-8",
                  "border border-slate-200/80",
                  "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]",
                  "transition-all duration-300",
                  isLocked ? "opacity-70" : "hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(15,23,42,0.06),0_18px_40px_-18px_rgba(15,23,42,0.18)]",
                ].join(" ")}
              >
                {/* Lock badge */}
                {isLocked && (
                  <div className="absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-full bg-slate-900/85 px-3 py-1 text-[11px] font-medium text-white">
                    <Lock className="h-3 w-3" />
                    Bloqueado
                  </div>
                )}

                {/* Decorative illustration */}
                <Illustration
                  className={`pointer-events-none absolute -right-2 top-6 h-44 w-56 ${visual.illustrationColor}`}
                />

                {/* Icon tile */}
                <div
                  className={[
                    "relative z-10 grid h-16 w-16 place-items-center rounded-full ring-8",
                    visual.iconBg,
                    visual.iconRing,
                  ].join(" ")}
                >
                  <visual.Icon className={`h-8 w-8 ${visual.iconColor}`} strokeWidth={2.2} />
                </div>

                {/* Title + desc */}
                <h2 className="relative z-10 mt-8 text-2xl font-bold tracking-tight text-slate-900">
                  {env.label}
                </h2>
                <p className="relative z-10 mt-2 max-w-[20rem] text-[15px] leading-relaxed text-slate-500">
                  {env.description}
                </p>

                {/* Pill badge */}
                <div className="relative z-10 mt-5">
                  <span
                    className={[
                      "inline-flex items-center rounded-full px-3.5 py-1 text-[11px] font-semibold tracking-wider",
                      visual.badgeBg,
                    ].join(" ")}
                  >
                    {visual.badgeLabel}
                  </span>
                </div>

                {/* Bottom CTA bar */}
                <button
                  onClick={() => {
                    if (isLocked) {
                      toast({
                        title: "Acesso bloqueado",
                        description: "Solicite ao administrador acesso a este ambiente.",
                        variant: "destructive",
                      });
                      return;
                    }
                    handleSelect(id);
                  }}
                  disabled={selecting !== null || isLocked}
                  className={[
                    "relative z-10 mt-8 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-3 pl-5 text-left transition-colors",
                    isLocked ? "cursor-not-allowed" : "hover:border-slate-300",
                  ].join(" ")}
                >
                  <span className="truncate text-[15px] font-semibold text-slate-900">
                    Acessar {env.label}
                  </span>
                  <span
                    className={[
                      "grid h-11 w-12 shrink-0 place-items-center rounded-xl text-white transition-colors",
                      isLocked ? "bg-slate-400" : `${visual.ctaBg} ${visual.ctaHover}`,
                    ].join(" ")}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : isLocked ? (
                      <Lock className="h-5 w-5" />
                    ) : (
                      <ArrowRight className="h-5 w-5" />
                    )}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <footer className="mt-10 text-center text-xs text-slate-400">
          Sua escolha permanece ativa até o próximo logout.
        </footer>
      </div>
    </div>
  );
}
