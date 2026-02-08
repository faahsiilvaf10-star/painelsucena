import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { RadioProvider } from "@/contexts/RadioContext";
import { PersistentFooter } from "@/components/layout/PersistentFooter";
import { PersistentSidebar } from "@/components/layout/PersistentSidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { LoginTransitionGate } from "@/components/auth/LoginTransitionGate";
import { LogoutTransitionGate } from "@/components/auth/LogoutTransitionGate";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import ErrorBoundary from "@/components/ErrorBoundary";

import Index from "./pages/Index";
import RH from "./pages/RH";
import Presenca from "./pages/Presenca";
import RelatorioPresenca from "./pages/RelatorioPresenca";
import Matriz from "./pages/Matriz";
import Emergencia from "./pages/Emergencia";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Configuracoes from "./pages/Configuracoes";
import DDS from "./pages/DDS";

import Lembretes from "./pages/Lembretes";
import RDO from "./pages/RDO";
import Campanhas from "./pages/Campanhas";
import Pedidos from "./pages/Pedidos";
import Estoque from "./pages/Estoque";
import Documentos from "./pages/Documentos";
import Atividades from "./pages/Atividades";
import AtividadesII from "./pages/AtividadesII";
import Metas from "./pages/Metas";
import VistoriasEquipamentos from "./pages/VistoriasEquipamentos";
import Homologados from "./pages/Homologados";
import VistoriaCintas from "./pages/VistoriaCintas";
import EntradaSaidaEquipamentos from "./pages/EntradaSaidaEquipamentos";
import HoraExtra from "./pages/HoraExtra";
import ArquivosSeguranca from "./pages/ArquivosSeguranca";
import PainelMotorista from "./pages/PainelMotorista";
import RegistroMovimentoMotorista from "./pages/RegistroMovimentoMotorista";
import SelecaoVeiculo from "./pages/SelecaoVeiculo";
import EquipamentosMotorista from "./pages/EquipamentosMotorista";
import RelatoriosMotorista from "./pages/RelatoriosMotorista";
import PontosAbastecimento from "./pages/PontosAbastecimento";
import ParteDiaria from "./pages/ParteDiaria";
import ConsumoAbastecimento from "./pages/ConsumoAbastecimento";
import MaintenancePlan from "./pages/MaintenancePlan";
import Slides from "./pages/Slides";
import NotFound from "./pages/NotFound";

// Configure QueryClient with robust error handling and caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry failed requests up to 3 times with exponential backoff
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Keep data fresh but don't refetch too aggressively
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      // Don't refetch on window focus to prevent unnecessary requests
      refetchOnWindowFocus: false,
      // Refetch on reconnect to ensure fresh data after network issues
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations once on network errors
      retry: 1,
      retryDelay: 1000,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <RadioProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <InstallPrompt />
            
            <BrowserRouter>
              <LoginTransitionGate />
              <LogoutTransitionGate />
              <PersistentSidebar>
                <ErrorBoundary>
                  <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                    <Route path="/rh" element={<ProtectedRoute><RH /></ProtectedRoute>} />
                    <Route path="/presenca" element={<ProtectedRoute><Presenca /></ProtectedRoute>} />
                    <Route path="/relatorio-presenca" element={<ProtectedRoute><RelatorioPresenca /></ProtectedRoute>} />
                    <Route path="/matriz" element={<ProtectedRoute><Matriz /></ProtectedRoute>} />
                    <Route path="/emergencia" element={<ProtectedRoute><Emergencia /></ProtectedRoute>} />
                    <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                    <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
                    <Route path="/dds" element={<ProtectedRoute><DDS /></ProtectedRoute>} />
                    <Route path="/lembretes" element={<ProtectedRoute><Lembretes /></ProtectedRoute>} />
                    
                    <Route path="/rdo" element={<ProtectedRoute><RDO /></ProtectedRoute>} />
                    <Route path="/campanhas" element={<ProtectedRoute><Campanhas /></ProtectedRoute>} />
                    <Route path="/pedidos" element={<ProtectedRoute><Pedidos /></ProtectedRoute>} />
                    <Route path="/estoque" element={<ProtectedRoute><Estoque /></ProtectedRoute>} />
                    <Route path="/documentos" element={<ProtectedRoute><Documentos /></ProtectedRoute>} />
                    <Route path="/atividades" element={<ProtectedRoute><Atividades /></ProtectedRoute>} />
                    <Route path="/atividades-ii" element={<ProtectedRoute><AtividadesII /></ProtectedRoute>} />
                    <Route path="/metas" element={<ProtectedRoute><Metas /></ProtectedRoute>} />
                    <Route path="/vistorias-equipamentos" element={<ProtectedRoute><VistoriasEquipamentos /></ProtectedRoute>} />
                    <Route path="/homologados" element={<ProtectedRoute><Homologados /></ProtectedRoute>} />
                    <Route path="/vistoria-cintas" element={<ProtectedRoute><VistoriaCintas /></ProtectedRoute>} />
                    <Route path="/entrada-saida-equipamentos" element={<ProtectedRoute><EntradaSaidaEquipamentos /></ProtectedRoute>} />
                    <Route path="/hora-extra" element={<ProtectedRoute><HoraExtra /></ProtectedRoute>} />
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
                    <Route path="/slides" element={<ProtectedRoute><Slides /></ProtectedRoute>} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </ErrorBoundary>
                <PersistentFooter />
              </PersistentSidebar>
            </BrowserRouter>
          </TooltipProvider>
        </RadioProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
