import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, User, Lock, Mail, UserCircle } from "lucide-react";
import { z } from "zod";
import { AuthBackground } from "@/components/auth/AuthBackground";

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
          if (rememberMe) {
            localStorage.setItem("rememberedEmail", email);
            localStorage.setItem("rememberedPassword", password);
          } else {
            localStorage.removeItem("rememberedEmail");
            localStorage.removeItem("rememberedPassword");
          }
        }
      } else {
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
    <div className="h-screen relative overflow-hidden flex items-center justify-center">
      {/* Gradient background */}
      <AuthBackground />

      {/* Login form */}
      <div className="relative z-10 w-full max-w-sm px-6 animate-fade-in">
        {/* Avatar icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <User className="w-10 h-10 text-white/70" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full name field (signup only) */}
          {!isLogin && (
            <div className="space-y-1">
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
                <Input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Nome Completo"
                  className="pl-11 h-11 bg-white border-0 text-gray-800 placeholder:text-gray-400 rounded-md shadow-sm focus:ring-2 focus:ring-blue-400"
                />
              </div>
              {errors.fullName && <p className="text-red-300 text-xs pl-2">{errors.fullName}</p>}
            </div>
          )}

          {/* Email field */}
          <div className="space-y-1">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                className="pl-11 h-11 bg-white border-0 text-gray-800 placeholder:text-gray-400 rounded-md shadow-sm focus:ring-2 focus:ring-blue-400"
              />
            </div>
            {errors.email && <p className="text-red-300 text-xs pl-2">{errors.email}</p>}
          </div>

          {/* Password field */}
          <div className="space-y-1">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Senha"
                className="pl-11 pr-11 h-11 bg-white border-0 text-gray-800 placeholder:text-gray-400 rounded-md shadow-sm focus:ring-2 focus:ring-blue-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="text-red-300 text-xs pl-2">{errors.password}</p>}
          </div>

          {/* Cargo field (signup only) */}
          {!isLogin && (
            <div className="space-y-1">
              <Select 
                value={cargo} 
                onValueChange={value => {
                  if (!occupiedCargos.includes(value)) {
                    setCargo(value as CargoType);
                  }
                }}
              >
                <SelectTrigger className="h-11 bg-white border-0 text-gray-800 rounded-md shadow-sm focus:ring-2 focus:ring-blue-400">
                  <SelectValue placeholder="Selecione seu cargo" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {cargoOptions.map(option => {
                    const isOccupied = occupiedCargos.includes(option.value);
                    return (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        disabled={isOccupied}
                        className={`${isOccupied 
                          ? "text-gray-400 cursor-not-allowed line-through" 
                          : "text-gray-800 hover:bg-gray-100 focus:bg-gray-100"
                        }`}
                      >
                        {option.label} {isOccupied && "(Ocupado)"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.cargo && <p className="text-red-300 text-xs pl-2">{errors.cargo}</p>}
            </div>
          )}

          {/* Remember me and forgot password row (login only) */}
          {isLogin && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-blue-600 h-4 w-4"
                />
                <label 
                  htmlFor="rememberMe" 
                  className="text-white/80 text-xs cursor-pointer select-none"
                >
                  Lembrar-me
                </label>
              </div>
              <button
                type="button"
                className="text-white/60 hover:text-white/90 text-xs transition-colors"
              >
                Esqueceu a senha?
              </button>
            </div>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-md shadow-lg transition-all duration-200 mt-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? "LOGIN" : "CADASTRAR"}
          </Button>
        </form>

        {/* Toggle login/signup */}
        <div className="mt-6 text-center">
          <p className="text-white/70 text-sm">
            {isLogin ? "Novo por aqui?" : "Já tem uma conta?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
              }}
              className="text-white font-medium hover:underline"
            >
              {isLogin ? "Cadastre-se" : "Faça login"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
