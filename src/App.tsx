import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PersistentFooter } from "@/components/layout/PersistentFooter";
import { PersistentSidebar } from "@/components/layout/PersistentSidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { LoginTransitionGate } from "@/components/auth/LoginTransitionGate";
import { LogoutTransitionGate } from "@/components/auth/LogoutTransitionGate";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import ErrorBoundary from "@/components/ErrorBoundary";
import { VisualizadorProvider } from "@/contexts/VisualizadorContext";
import { EditModeProvider } from "@/contexts/EditModeContext";

// Lazy-load ALL pages — only the current route's code is downloaded
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const SelecaoAmbiente = lazy(() => import("./pages/SelecaoAmbiente"));
const RH = lazy(() => import("./pages/RH"));
const Presenca = lazy(() => import("./pages/Presenca"));
const RelatorioPresenca = lazy(() => import("./pages/RelatorioPresenca"));
const Matriz = lazy(() => import("./pages/Matriz"));
const Emergencia = lazy(() => import("./pages/Emergencia"));
const Admin = lazy(() => import("./pages/Admin"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const DDS = lazy(() => import("./pages/DDS"));
const Lembretes = lazy(() => import("./pages/Lembretes"));
const RDO = lazy(() => import("./pages/RDO"));
const Campanhas = lazy(() => import("./pages/Campanhas"));
const Pedidos = lazy(() => import("./pages/Pedidos"));
const Estoque = lazy(() => import("./pages/Estoque"));
const Documentos = lazy(() => import("./pages/Documentos"));
const Atividades = lazy(() => import("./pages/Atividades"));
const AtividadesII = lazy(() => import("./pages/AtividadesII"));
const VistoriasEquipamentos = lazy(() => import("./pages/VistoriasEquipamentos"));
const Homologados = lazy(() => import("./pages/Homologados"));
const VistoriaCintas = lazy(() => import("./pages/VistoriaCintas"));
const EntradaSaidaEquipamentos = lazy(() => import("./pages/EntradaSaidaEquipamentos"));
const ArquivosSeguranca = lazy(() => import("./pages/ArquivosSeguranca"));
const PainelMotorista = lazy(() => import("./pages/PainelMotorista"));
const RegistroMovimentoMotorista = lazy(() => import("./pages/RegistroMovimentoMotorista"));
const SelecaoVeiculo = lazy(() => import("./pages/SelecaoVeiculo"));
const EquipamentosMotorista = lazy(() => import("./pages/EquipamentosMotorista"));
const RelatoriosMotorista = lazy(() => import("./pages/RelatoriosMotorista"));
const PontosAbastecimento = lazy(() => import("./pages/PontosAbastecimento"));
const ParteDiaria = lazy(() => import("./pages/ParteDiaria"));
const ConsumoAbastecimento = lazy(() => import("./pages/ConsumoAbastecimento"));
const MaintenancePlan = lazy(() => import("./pages/MaintenancePlan"));
const InstaCena = lazy(() => import("./pages/InstaCena"));
const InspecaoCanteiro = lazy(() => import("./pages/InspecaoCanteiro"));
const CalendarioHydro = lazy(() => import("./pages/CalendarioHydro"));
const Games = lazy(() => import("./pages/Games"));
const Desvios = lazy(() => import("./pages/Desvios"));
const StatusGeralEquipamentos = lazy(() => import("./pages/StatusGeralEquipamentos"));

const NotasFiscais = lazy(() => import("./pages/NotasFiscais"));
const TrocaEpi = lazy(() => import("./pages/TrocaEpi"));
const InspecaoExtintores = lazy(() => import("./pages/InspecaoExtintores"));
const MeioAmbiente = lazy(() => import("./pages/MeioAmbiente"));
const PosChuva = lazy(() => import("./pages/PosChuva"));
const Seguranca = lazy(() => import("./pages/Seguranca"));
const RecursosHumanos = lazy(() => import("./pages/RecursosHumanos"));
const RelatorioDiarioObra = lazy(() => import("./pages/RelatorioDiarioObra"));
const Almoxarifado = lazy(() => import("./pages/Almoxarifado"));
const Equipamentos = lazy(() => import("./pages/Equipamentos"));
const Planejamento = lazy(() => import("./pages/Planejamento"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Minimal loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
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

// QueryClient with robust error handling
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Limpa todo o cache de queries quando o ambiente é trocado para evitar
// que dados do ambiente anterior fiquem visíveis.
if (typeof window !== "undefined") {
  window.addEventListener("environment-changed", () => {
    queryClient.clear();
  });
}

const App = () => {
  return (
    <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
            <Toaster />
            <Sonner />
            <InstallPrompt />
            
            <BrowserRouter>
              <LoginTransitionGate />
              <LogoutTransitionGate />


              <EditModeProvider>
              <PersistentSidebar>
                <VisualizadorProvider>
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/auth" element={<Auth />} />
                      
                      {/* Authenticated Routes */}
                      <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
                        <Route path="/selecao-ambiente" element={<SelecaoAmbiente />} />
                        <Route path="/" element={<Index />} />
                        <Route path="/rh" element={<RH />} />
                        <Route path="/presenca" element={<Presenca />} />
                        <Route path="/relatorio-presenca" element={<RelatorioPresenca />} />
                        <Route path="/matriz" element={<Matriz />} />
                        <Route path="/emergencia" element={<Emergencia />} />
                        <Route path="/admin" element={<Admin />} />
                        <Route path="/configuracoes" element={<Configuracoes />} />
                        <Route path="/dds" element={<DDS />} />
                        <Route path="/lembretes" element={<Lembretes />} />
                        <Route path="/rdo" element={<RDO />} />
                        <Route path="/campanhas" element={<Campanhas />} />
                        <Route path="/pedidos" element={<Pedidos />} />
                        <Route path="/estoque" element={<Estoque />} />
                        <Route path="/documentos" element={<Documentos />} />
                        <Route path="/atividades" element={<Atividades />} />
                        <Route path="/atividades-ii" element={<AtividadesII />} />
                        <Route path="/vistorias-equipamentos" element={<VistoriasEquipamentos />} />
                        <Route path="/homologados" element={<Homologados />} />
                        <Route path="/vistoria-cintas" element={<VistoriaCintas />} />
                        <Route path="/entrada-saida-equipamentos" element={<EntradaSaidaEquipamentos />} />
                        <Route path="/arquivos-seguranca" element={<ArquivosSeguranca />} />
                        <Route path="/parte-diaria" element={<ParteDiaria />} />
                        <Route path="/selecao-veiculo" element={<SelecaoVeiculo />} />
                        <Route path="/painel-motorista" element={<PainelMotorista />} />
                        <Route path="/registro-movimento-motorista" element={<RegistroMovimentoMotorista />} />
                        <Route path="/equipamentos-motorista" element={<EquipamentosMotorista />} />
                        <Route path="/relatorios-motorista" element={<RelatoriosMotorista />} />
                        <Route path="/pontos-abastecimento" element={<PontosAbastecimento />} />
                        <Route path="/consumo-abastecimento" element={<ConsumoAbastecimento />} />
                        <Route path="/plano-manutencao" element={<MaintenancePlan />} />
                        <Route path="/instacena" element={<InstaCena />} />
                        <Route path="/inspecao-canteiro" element={<InspecaoCanteiro />} />
                        <Route path="/calendario-hydro" element={<CalendarioHydro />} />
                        <Route path="/games" element={<Games />} />
                        <Route path="/desvios" element={<Desvios />} />
                        <Route path="/notas-fiscais" element={<NotasFiscais />} />
                        <Route path="/troca-epi" element={<TrocaEpi />} />
                        <Route path="/inspecao-extintores" element={<InspecaoExtintores />} />
                        <Route path="/meio-ambiente" element={<MeioAmbiente />} />
                        <Route path="/pos-chuva" element={<PosChuva />} />
                        <Route path="/seguranca" element={<Seguranca />} />
                        <Route path="/recursos-humanos" element={<RecursosHumanos />} />
                        <Route path="/relatorio-diario-obra" element={<RelatorioDiarioObra />} />
                        <Route path="/almoxarifado" element={<Almoxarifado />} />
                        <Route path="/equipamentos" element={<Equipamentos />} />
                        <Route path="/planejamento" element={<Planejamento />} />
                        <Route path="/status-geral-equipamentos" element={<StatusGeralEquipamentos />} />
                      </Route>
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
                </VisualizadorProvider>
                <PersistentFooter />
              </PersistentSidebar>
              </EditModeProvider>
            </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
  );
};



export default App;
