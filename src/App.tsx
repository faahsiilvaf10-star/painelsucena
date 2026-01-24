import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
