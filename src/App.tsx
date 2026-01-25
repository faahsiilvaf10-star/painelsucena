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
import Equipamentos from "./pages/Equipamentos";
import Lembretes from "./pages/Lembretes";
import RDO from "./pages/RDO";
import Campanhas from "./pages/Campanhas";
import Pedidos from "./pages/Pedidos";
import Estoque from "./pages/Estoque";
import Documentos from "./pages/Documentos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <RadioProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <LoginTransitionGate />
            <LogoutTransitionGate />
            <PersistentSidebar>
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
                <Route path="/equipamentos" element={<ProtectedRoute><Equipamentos /></ProtectedRoute>} />
                <Route path="/rdo" element={<ProtectedRoute><RDO /></ProtectedRoute>} />
                <Route path="/campanhas" element={<ProtectedRoute><Campanhas /></ProtectedRoute>} />
                <Route path="/pedidos" element={<ProtectedRoute><Pedidos /></ProtectedRoute>} />
                <Route path="/estoque" element={<ProtectedRoute><Estoque /></ProtectedRoute>} />
                <Route path="/documentos" element={<ProtectedRoute><Documentos /></ProtectedRoute>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <PersistentFooter />
            </PersistentSidebar>
          </BrowserRouter>
        </TooltipProvider>
      </RadioProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
