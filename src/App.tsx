import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/query-core";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import { WhatsAppGate } from "@/components/auth/WhatsAppGate";

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
const AdminWhatsApp = lazy(() => import("./pages/AdminWhatsApp"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const DDS = lazy(() => import("./pages/DDS"));
const Lembretes = lazy(() => import("./pages/Lembretes"));
const Reunioes = lazy(() => import("./pages/Reunioes"));
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
const ControleTreinamento = lazy(() => import("./pages/ControleTreinamento"));
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

const App = () => (
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
              <WhatsAppGate />
              <PersistentSidebar>
                <VisualizadorProvider>
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/selecao-ambiente" element={<ProtectedRoute><SelecaoAmbiente /></ProtectedRoute>} />
                      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                      <Route path="/rh" element={<ProtectedRoute><RH /></ProtectedRoute>} />
                      <Route path="/presenca" element={<ProtectedRoute><Presenca /></ProtectedRoute>} />
                      <Route path="/relatorio-presenca" element={<ProtectedRoute><RelatorioPresenca /></ProtectedRoute>} />
                      <Route path="/matriz" element={<ProtectedRoute><Matriz /></ProtectedRoute>} />
                      <Route path="/emergencia" element={<ProtectedRoute><Emergencia /></ProtectedRoute>} />
                      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                      <Route path="/admin/whatsapp" element={<ProtectedRoute><AdminWhatsApp /></ProtectedRoute>} />
                      <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
                      <Route path="/dds" element={<ProtectedRoute><DDS /></ProtectedRoute>} />
                      <Route path="/lembretes" element={<ProtectedRoute><Lembretes /></ProtectedRoute>} />
                      <Route path="/reunioes" element={<ProtectedRoute><Reunioes /></ProtectedRoute>} />
                      <Route path="/rdo" element={<ProtectedRoute><RDO /></ProtectedRoute>} />
                      <Route path="/campanhas" element={<ProtectedRoute><Campanhas /></ProtectedRoute>} />
                      <Route path="/pedidos" element={<ProtectedRoute><Pedidos /></ProtectedRoute>} />
                      <Route path="/estoque" element={<ProtectedRoute><Estoque /></ProtectedRoute>} />
                      <Route path="/documentos" element={<ProtectedRoute><Documentos /></ProtectedRoute>} />
                      <Route path="/atividades" element={<ProtectedRoute><Atividades /></ProtectedRoute>} />
                      <Route path="/atividades-ii" element={<ProtectedRoute><AtividadesII /></ProtectedRoute>} />
                      <Route path="/vistorias-equipamentos" element={<ProtectedRoute><VistoriasEquipamentos /></ProtectedRoute>} />
                      <Route path="/homologados" element={<ProtectedRoute><Homologados /></ProtectedRoute>} />
                      <Route path="/vistoria-cintas" element={<ProtectedRoute><VistoriaCintas /></ProtectedRoute>} />
                      <Route path="/entrada-saida-equipamentos" element={<ProtectedRoute><EntradaSaidaEquipamentos /></ProtectedRoute>} />
                      <Route path="/arquivos-seguranca" element={<ProtectedRoute><ArquivosSeguranca /></ProtectedRoute>} />
                      <Route path="/parte-diaria" element={<ProtectedRoute><ParteDiaria /></ProtectedRoute>} />
                      <Route path="/selecao-veiculo" element={<ProtectedRoute><SelecaoVeiculo /></ProtectedRoute>} />
                      <Route path="/painel-motorista" element={<ProtectedRoute><PainelMotorista /></ProtectedRoute>} />
                      <Route path="/registro-movimento-motorista" element={<ProtectedRoute><RegistroMovimentoMotorista /></ProtectedRoute>} />
                      <Route path="/equipamentos-motorista" element={<ProtectedRoute><EquipamentosMotorista /></ProtectedRoute>} />
                      <Route path="/relatorios-motorista" element={<ProtectedRoute><RelatoriosMotorista /></ProtectedRoute>} />
                      <Route path="/pontos-abastecimento" element={<ProtectedRoute><PontosAbastecimento /></ProtectedRoute>} />
                      <Route path="/consumo-abastecimento" element={<ProtectedRoute><ConsumoAbastecimento /></ProtectedRoute>} />
                      <Route path="/plano-manutencao" element={<ProtectedRoute><MaintenancePlan /></ProtectedRoute>} />
                      <Route path="/instacena" element={<ProtectedRoute><InstaCena /></ProtectedRoute>} />
                      <Route path="/inspecao-canteiro" element={<ProtectedRoute><InspecaoCanteiro /></ProtectedRoute>} />
                      <Route path="/calendario-hydro" element={<ProtectedRoute><CalendarioHydro /></ProtectedRoute>} />
                      <Route path="/games" element={<ProtectedRoute><Games /></ProtectedRoute>} />
                      <Route path="/desvios" element={<ProtectedRoute><Desvios /></ProtectedRoute>} />
                      
                      <Route path="/notas-fiscais" element={<ProtectedRoute><NotasFiscais /></ProtectedRoute>} />
                      <Route path="/troca-epi" element={<ProtectedRoute><TrocaEpi /></ProtectedRoute>} />
                      <Route path="/inspecao-extintores" element={<ProtectedRoute><InspecaoExtintores /></ProtectedRoute>} />
                      <Route path="/meio-ambiente" element={<ProtectedRoute><MeioAmbiente /></ProtectedRoute>} />
                      <Route path="/pos-chuva" element={<ProtectedRoute><PosChuva /></ProtectedRoute>} />
                      <Route path="/seguranca" element={<ProtectedRoute><Seguranca /></ProtectedRoute>} />
                      <Route path="/controle-treinamento" element={<ProtectedRoute><ControleTreinamento /></ProtectedRoute>} />
                      <Route path="/recursos-humanos" element={<ProtectedRoute><RecursosHumanos /></ProtectedRoute>} />
                      <Route path="/relatorio-diario-obra" element={<ProtectedRoute><RelatorioDiarioObra /></ProtectedRoute>} />
                      <Route path="/almoxarifado" element={<ProtectedRoute><Almoxarifado /></ProtectedRoute>} />
                      <Route path="/equipamentos" element={<ProtectedRoute><Equipamentos /></ProtectedRoute>} />
                      <Route path="/planejamento" element={<ProtectedRoute><Planejamento /></ProtectedRoute>} />
                      <Route path="/status-geral-equipamentos" element={<ProtectedRoute><StatusGeralEquipamentos /></ProtectedRoute>} />
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

export default App;
