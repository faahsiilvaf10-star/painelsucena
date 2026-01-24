import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { z } from "zod";
import logoSucena from "@/assets/logo-sucena.png";
import { AuthBackground } from "@/components/auth/AuthBackground";

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
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [occupiedCargos, setOccupiedCargos] = useState<string[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch occupied cargos
  useEffect(() => {
    const fetchOccupiedCargos = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("cargo");
      
      if (!error && data) {
        const occupied = data.map(p => p.cargo).filter(Boolean);
        setOccupiedCargos(occupied);
      }
    };

    fetchOccupiedCargos();
  }, []);

  // Load saved credentials on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedPassword = localStorage.getItem("rememberedPassword");
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

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
        } else {
          // Save or clear credentials based on "Remember Me" checkbox
          if (rememberMe) {
            localStorage.setItem("rememberedEmail", email);
            localStorage.setItem("rememberedPassword", password);
          } else {
            localStorage.removeItem("rememberedEmail");
            localStorage.removeItem("rememberedPassword");
          }
        }
      } else {
        // Check if cargo is already occupied
        if (occupiedCargos.includes(cargo)) {
          const cargoLabel = cargoOptions.find(c => c.value === cargo)?.label || cargo;
          toast({
            title: "Cargo já ocupado",
            description: `Já existe um usuário cadastrado como ${cargoLabel}.`,
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

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
            // Update occupied cargos list
            setOccupiedCargos(prev => [...prev, cargo]);
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
    <div className="h-screen bg-black relative overflow-hidden flex flex-col">
      {/* Photo-based background with animations */}
      <AuthBackground />

      {/* Header */}
      <header className="relative z-10 p-2 md:p-3 flex flex-col items-center shrink-0">
        <img 
          src={logoSucena} 
          alt="Logo Sucena" 
          className="h-10 md:h-12 mb-1 transition-all duration-500 ease-out hover:scale-110 hover:brightness-110 cursor-pointer drop-shadow-[0_0_25px_hsl(43,96%,56%)] [filter:_drop-shadow(0_0_15px_rgba(245,165,36,0.6))_drop-shadow(0_0_30px_rgba(245,165,36,0.4))_drop-shadow(0_0_45px_rgba(245,165,36,0.2))] hover:drop-shadow-[0_0_40px_hsl(43,96%,56%)] animate-pulse" 
        />
        <h1 className="text-lg md:text-xl font-bold text-primary tracking-tight text-center drop-shadow-[0_4px_15px_rgba(0,0,0,0.9)] [text-shadow:_0_2px_20px_rgba(0,0,0,0.8),_0_0_40px_rgba(0,0,0,0.6)]">CONTROLE OPERACIONAL</h1>
        <p className="text-gray-300 text-[10px] md:text-xs mt-0.5 text-center max-w-md drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] [text-shadow:_0_2px_15px_rgba(0,0,0,0.9)]">
          Sistema de controle operacional para gestão eficiente
        </p>
      </header>
      {/* Main content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-2 overflow-hidden">
        <div className="w-full max-w-md animate-fade-in">
          <div className="bg-black/80 backdrop-blur-md rounded-lg p-4 md:p-5 shadow-2xl border border-primary/20">
            <h2 className="text-xl font-bold text-white mb-3">
              {isLogin ? "Entrar" : "Cadastrar"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-2">
              {!isLogin && (
                <div className="space-y-1">
                  <Label htmlFor="fullName" className="text-gray-300 text-sm">
                    Nome Completo
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-10 focus:border-primary focus:ring-primary"
                  />
                  {errors.fullName && <p className="text-red-500 text-xs">{errors.fullName}</p>}
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="email" className="text-gray-300 text-sm">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-10 focus:border-primary focus:ring-primary"
                />
                {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-gray-300 text-sm">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-10 pr-12 focus:border-primary focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
              </div>

              {isLogin && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    className="border-zinc-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary h-4 w-4"
                  />
                  <Label 
                    htmlFor="rememberMe" 
                    className="text-gray-300 text-xs cursor-pointer select-none"
                  >
                    Lembrar meu email e senha
                  </Label>
                </div>
              )}

              {!isLogin && (
                <div className="space-y-1">
                  <Label htmlFor="cargo" className="text-gray-300 text-sm">
                    Cargo
                  </Label>
                  <Select 
                    value={cargo} 
                    onValueChange={value => {
                      if (!occupiedCargos.includes(value)) {
                        setCargo(value as CargoType);
                      }
                    }}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-10 focus:border-primary focus:ring-primary">
                      <SelectValue placeholder="Selecione seu cargo" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {cargoOptions.map(option => {
                        const isOccupied = occupiedCargos.includes(option.value);
                        return (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            disabled={isOccupied}
                            className={`${isOccupied 
                              ? "text-zinc-500 cursor-not-allowed line-through" 
                              : "text-white hover:bg-zinc-700 focus:bg-zinc-700"
                            }`}
                          >
                            {option.label} {isOccupied && "(Ocupado)"}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-zinc-500">
                    Cada cargo permite apenas 1 cadastro
                  </p>
                  {errors.cargo && <p className="text-red-500 text-xs">{errors.cargo}</p>}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 bg-primary hover:bg-primary/90 text-white font-semibold text-sm mt-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isLogin ? "Entrar" : "Cadastrar"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-gray-400 text-sm">
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
      <footer className="relative z-10 p-1 text-center text-gray-400 text-[10px] italic shrink-0">
        <p>"{bibleVerses[new Date().getDate() % bibleVerses.length]}"</p>
      </footer>
    </div>
  );
};

export default Auth;
