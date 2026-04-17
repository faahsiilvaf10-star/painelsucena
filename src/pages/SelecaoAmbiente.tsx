import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, LogOut, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEnvironment, ENVIRONMENTS, type EnvironmentId } from "@/hooks/useEnvironment";
import { useMyEnvironmentAccess } from "@/hooks/useEnvironmentAccess";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface UserSummary {
  fullName: string;
  avatarUrl: string | null;
}

interface EnvVisual {
  emoji: string;
  cardGradient: string;
  badgeBg: string;
  badgeText: string;
  badgeLabel: string;
  ctaBg: string;
  ctaHover: string;
}

const ENV_VISUAL: Record<EnvironmentId, EnvVisual> = {
  barcarena: {
    emoji: "🏭",
    cardGradient: "from-sky-100/90 via-sky-50/80 to-blue-50/60",
    badgeBg: "bg-gradient-to-r from-sky-500 to-blue-500",
    badgeText: "text-white",
    badgeLabel: "SISTEMA ATUAL",
    ctaBg: "bg-gradient-to-br from-sky-400 to-blue-500",
    ctaHover: "group-hover:from-sky-500 group-hover:to-blue-600",
  },
  paragominas: {
    emoji: "🏭",
    cardGradient: "from-emerald-50/90 via-green-50/70 to-stone-50/60",
    badgeBg: "bg-gradient-to-r from-emerald-500 to-green-500",
    badgeText: "text-white",
    badgeLabel: "NOVA OPERAÇÃO",
    ctaBg: "bg-gradient-to-br from-emerald-400 to-green-500",
    ctaHover: "group-hover:from-emerald-500 group-hover:to-green-600",
  },
};

export default function SelecaoAmbiente() {
  const navigate = useNavigate();
  const { setEnvironment } = useEnvironment();
  const { toast } = useToast();
  const { environments: allowedEnvs, isLoading: accessLoading } = useMyEnvironmentAccess();
  const [user, setUser] = useState<UserSummary | null>(null);
  const [selecting, setSelecting] = useState<EnvironmentId | null>(null);

  // Auto-seleciona se o usuário só tem 1 ambiente liberado
  useEffect(() => {
    if (accessLoading) return;
    if (allowedEnvs.length === 1) {
      setEnvironment(allowedEnvs[0]);
      window.location.replace("/");
    }
  }, [accessLoading, allowedEnvs, setEnvironment]);

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
    <div className="fixed inset-0 z-50 overflow-auto">
      {/* Animated gradient background */}
      <div className="absolute inset-0 animated-env-bg" />
      {/* Soft mountain mist at bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-white/50 via-white/20 to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-full max-w-6xl flex-col px-6 py-10">
        {/* Header */}
        <header className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                className="h-12 w-12 rounded-full object-cover ring-2 ring-white/60 shadow-md"
              />
            ) : (
              <div className="grid h-12 w-12 place-items-center rounded-full bg-white/70 text-slate-600 shadow-md ring-2 ring-white/60 backdrop-blur">
                {user?.fullName?.[0]?.toUpperCase() ?? "U"}
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Bem-vindo</p>
              <p className="text-base font-medium text-slate-800">{user?.fullName ?? "..."}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-2 text-slate-700 hover:bg-white/40 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </header>

        {/* Title */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Selecione o ambiente
          </h1>
          <p className="mt-3 text-base text-slate-600">
            Escolha qual operação você deseja acessar agora.
          </p>
        </div>

        {/* Cards */}
        <div className="grid flex-1 gap-8 md:grid-cols-2">
          {(Object.keys(ENVIRONMENTS) as EnvironmentId[]).map((id) => {
            const env = ENVIRONMENTS[id];
            const visual = ENV_VISUAL[id];
            const isLoading = selecting === id;

            return (
              <button
                key={id}
                onClick={() => handleSelect(id)}
                disabled={selecting !== null}
                className={[
                  "group relative flex flex-col overflow-hidden rounded-3xl text-left",
                  "border border-white/60 p-8 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)]",
                  "backdrop-blur-xl transition-all duration-500",
                  "bg-gradient-to-br",
                  visual.cardGradient,
                  "hover:-translate-y-1 hover:shadow-[0_30px_80px_-20px_rgba(15,23,42,0.35)]",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                ].join(" ")}
              >
                {/* Emoji icon tile */}
                <div className="mb-8 grid h-20 w-20 place-items-center rounded-2xl bg-white shadow-lg ring-1 ring-white/80">
                  <span className="text-4xl leading-none" aria-hidden>
                    {visual.emoji}
                  </span>
                </div>

                {/* Title + desc */}
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  {env.label}
                </h2>
                <p className="mt-3 text-base leading-relaxed text-slate-600">
                  {env.description}
                </p>

                {/* Pill badge */}
                <div className="mt-6">
                  <span
                    className={[
                      "inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider shadow-md",
                      visual.badgeBg,
                      visual.badgeText,
                    ].join(" ")}
                  >
                    {visual.badgeLabel}
                  </span>
                </div>

                {/* Bottom CTA card */}
                <div className="mt-8 flex items-center justify-between rounded-2xl bg-white/70 p-5 shadow-inner ring-1 ring-white/80 backdrop-blur">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="truncate text-lg font-semibold text-slate-900">
                      {env.label}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-600 line-clamp-2">
                      {env.description}
                    </p>
                  </div>
                  <div
                    className={[
                      "grid h-12 w-14 shrink-0 place-items-center rounded-xl text-white shadow-lg transition-all duration-300",
                      visual.ctaBg,
                      visual.ctaHover,
                      "group-hover:translate-x-0.5",
                    ].join(" ")}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ArrowRight className="h-5 w-5" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <footer className="mt-10 text-center text-xs text-slate-500">
          Sua escolha permanece ativa até o próximo logout.
        </footer>
      </div>

      {/* Animated gradient styles */}
      <style>{`
        .animated-env-bg {
          background: linear-gradient(
            125deg,
            #eaf3ff 0%,
            #f4f8ff 18%,
            #fff8ec 36%,
            #f0fbf2 54%,
            #eaf3ff 72%,
            #f7efff 88%,
            #fff8ec 100%
          );
          background-size: 320% 320%;
          animation: env-gradient-shift 22s ease infinite;
        }
        @keyframes env-gradient-shift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
