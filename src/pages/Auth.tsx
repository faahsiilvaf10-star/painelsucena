import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { z } from "zod";
import logoSucena from "@/assets/logo-sucena.png";

const bibleVerses = [
  "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito. - João 3:16",
  "O Senhor é o meu pastor; nada me faltará. - Salmos 23:1",
  "Tudo posso naquele que me fortalece. - Filipenses 4:13",
  "Confie no Senhor de todo o seu coração. - Provérbios 3:5",
  "O Senhor é a minha luz e a minha salvação. - Salmos 27:1",
  "Porque sou eu que conheço os planos que tenho para vocês. - Jeremias 29:11",
  "Seja forte e corajoso! - Josué 1:9"
];

const cargoOptions = [
  { value: "preposto", label: "Preposto" },
  { value: "encarregado_geral", label: "Encarregado Geral" },
  { value: "encarregado_i", label: "Encarregado I" },
  { value: "encarregado_ii", label: "Encarregado II" },
  { value: "tecnico_seguranca_i", label: "Técnico de Segurança I" },
  { value: "tecnico_seguranca_ii", label: "Técnico de Segurança II" },
  { value: "tecnico_meio_ambiente", label: "Técnico Meio Ambiente" },
  { value: "aux_administrativo", label: "Aux. Administrativo" },
  { value: "aux_almoxarifado", label: "Aux. Almoxarifado" },
  { value: "planejador", label: "Planejador" }
] as const;

type CargoType = typeof cargoOptions[number]["value"];

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres")
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cargo: z.string().min(1, "Selecione um cargo")
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [cargo, setCargo] = useState<CargoType | "">("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate("/");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateForm = () => {
    setErrors({});
    try {
      if (isLogin) {
        loginSchema.parse({ email, password });
      } else {
        signupSchema.parse({ email, password, fullName, cargo });
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Erro no login",
              description: "Email ou senha incorretos",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Erro no login",
              description: error.message,
              variant: "destructive"
            });
          }
        }
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl
          }
        });

        if (error) {
          if (error.message.includes("User already registered")) {
            toast({
              title: "Erro no cadastro",
              description: "Este email já está cadastrado. Tente fazer login.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Erro no cadastro",
              description: error.message,
              variant: "destructive"
            });
          }
          return;
        }

        if (data.user) {
          const { error: profileError } = await supabase.from("profiles").insert({
            user_id: data.user.id,
            full_name: fullName,
            cargo: cargo as CargoType
          });

          if (profileError) {
            toast({
              title: "Erro ao criar perfil",
              description: profileError.message,
              variant: "destructive"
            });
          } else {
            toast({
              title: "Conta criada com sucesso!",
              description: "Você será redirecionado..."
            });
          }
        }
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated neon lights */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-neon-float-1 -top-20 -left-20" />
        <div className="absolute w-[400px] h-[400px] bg-red-600/15 rounded-full blur-[100px] animate-neon-float-2 top-1/2 -right-32" />
        <div className="absolute w-[300px] h-[300px] bg-primary/25 rounded-full blur-[80px] animate-neon-float-3 bottom-0 left-1/3" />
        <div className="absolute w-[200px] h-[200px] bg-red-500/20 rounded-full blur-[60px] animate-neon-pulse top-1/4 right-1/4" />
      </div>

      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />
      
      {/* Netflix-style background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6 flex flex-col items-center">
        <img 
          src={logoSucena} 
          alt="Logo Sucena" 
          className="h-16 md:h-20 mb-4 transition-all duration-500 ease-out hover:scale-110 hover:drop-shadow-[0_0_25px_hsl(0,85%,50%)] hover:brightness-110 cursor-pointer" 
        />
        <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight text-center">CONTROLE OPERACIONAL</h1>
        <p className="text-gray-400 text-sm md:text-base mt-2 text-center max-w-md">
          Sistema de controle operacional para gestão eficiente de empresas
        </p>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-black/75 backdrop-blur-sm rounded-lg p-8 md:p-12 shadow-2xl border border-white/10">
            <h2 className="text-3xl font-bold text-white mb-8">
              {isLogin ? "Entrar" : "Cadastrar"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-gray-300">
                    Nome Completo
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12 focus:border-primary focus:ring-primary"
                  />
                  {errors.fullName && <p className="text-red-500 text-sm">{errors.fullName}</p>}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12 focus:border-primary focus:ring-primary"
                />
                {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12 pr-12 focus:border-primary focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="cargo" className="text-gray-300">
                    Cargo
                  </Label>
                  <Select value={cargo} onValueChange={value => setCargo(value as CargoType)}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-12 focus:border-primary focus:ring-primary">
                      <SelectValue placeholder="Selecione seu cargo" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {cargoOptions.map(option => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.cargo && <p className="text-red-500 text-sm">{errors.cargo}</p>}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold text-base"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? "Entrar" : "Cadastrar"}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-gray-400">
                {isLogin ? "Novo por aqui?" : "Já tem uma conta?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setErrors({});
                  }}
                  className="text-white hover:underline font-medium"
                >
                  {isLogin ? "Cadastre-se agora" : "Faça login"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-6 text-center text-gray-400 text-sm italic">
        <p>"{bibleVerses[new Date().getDate() % bibleVerses.length]}"</p>
      </footer>
    </div>
  );
};

export default Auth;
