import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, TreePine, ArrowRight, LogOut, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEnvironment, ENVIRONMENTS, type EnvironmentId } from "@/hooks/useEnvironment";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface UserSummary {
  fullName: string;
  avatarUrl: string | null;
}

const ENV_VISUAL: Record<EnvironmentId, { icon: typeof Building2; gradient: string; ring: string }> = {
  barcarena: {
    icon: Building2,
    gradient: "from-sky-500/20 via-sky-500/5 to-transparent",
    ring: "ring-sky-500/40 hover:ring-sky-400",
  },
  paragominas: {
    icon: TreePine,
    gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    ring: "ring-emerald-500/40 hover:ring-emerald-400",
  },
};

export default function SelecaoAmbiente() {
  const navigate = useNavigate();
  const { setEnvironment } = useEnvironment();
  const { toast } = useToast();
  const [user, setUser] = useState<UserSummary | null>(null);
  const [selecting, setSelecting] = useState<EnvironmentId | null>(null);

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
    // Recarrega a página para garantir que todos os hooks/queries usem
    // o novo header x-environment desde a primeira chamada.
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
    <div className="fixed inset-0 z-50 overflow-auto bg-background">
      {/* Backdrop accents */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-full max-w-5xl flex-col px-6 py-10">
        {/* Header */}
        <header className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                className="h-12 w-12 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
                {user?.fullName?.[0]?.toUpperCase() ?? "U"}
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Bem-vindo</p>
              <p className="text-base font-medium">{user?.fullName ?? "..."}</p>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </header>

        {/* Title */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Selecione o ambiente
          </h1>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            Escolha qual operação você deseja acessar agora.
          </p>
        </div>

        {/* Cards */}
        <div className="grid flex-1 gap-5 md:grid-cols-2">
          {(Object.keys(ENVIRONMENTS) as EnvironmentId[]).map((id) => {
            const env = ENVIRONMENTS[id];
            const visual = ENV_VISUAL[id];
            const Icon = visual.icon;
            const isLoading = selecting === id;

            return (
              <button
                key={id}
                onClick={() => handleSelect(id)}
                disabled={selecting !== null}
                className={[
                  "group relative flex flex-col items-start overflow-hidden rounded-2xl",
                  "border bg-card p-7 text-left shadow-sm transition-all",
                  "ring-1 ring-transparent",
                  visual.ring,
                  "hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed",
                ].join(" ")}
              >
                {/* gradient backdrop */}
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${visual.gradient}`}
                />

                <div className="relative z-10 flex w-full flex-col gap-5">
                  <div className="flex items-center justify-between">
                    <div className="grid h-14 w-14 place-items-center rounded-xl bg-background/80 backdrop-blur ring-1 ring-border">
                      <Icon className="h-7 w-7" />
                    </div>
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <ArrowRight className="h-5 w-5 -translate-x-1 text-muted-foreground transition-all group-hover:translate-x-0 group-hover:text-foreground" />
                    )}
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">{env.label}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{env.description}</p>
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                    {id === "barcarena" ? "Sistema atual" : "Nova operação"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <footer className="mt-10 text-center text-xs text-muted-foreground">
          Sua escolha permanece ativa até o próximo logout.
        </footer>
      </div>
    </div>
  );
}
