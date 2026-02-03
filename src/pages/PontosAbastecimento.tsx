import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Droplets, MapPin, Phone, Navigation, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface PontoAbastecimento {
  id: string;
  nome: string;
  endereco: string;
  telefone?: string;
  coordenadas?: { lat: number; lng: number };
  tipo: "agua" | "combustivel";
  observacao?: string;
}

// Lista de pontos de abastecimento de água para Pipas
const pontosAbastecimento: PontoAbastecimento[] = [
  {
    id: "1",
    nome: "Ponto Central - Base",
    endereco: "Rua Principal, 100 - Base Operacional",
    telefone: "(11) 99999-0001",
    tipo: "agua",
    observacao: "Ponto principal - disponível 24h",
  },
  {
    id: "2",
    nome: "Reservatório Norte",
    endereco: "Av. Norte, 500 - Setor Norte",
    telefone: "(11) 99999-0002",
    tipo: "agua",
    observacao: "Horário: 6h às 18h",
  },
  {
    id: "3",
    nome: "Estação Sul",
    endereco: "Rua Sul, 250 - Setor Sul",
    telefone: "(11) 99999-0003",
    tipo: "agua",
    observacao: "Verificar disponibilidade",
  },
  {
    id: "4",
    nome: "Ponto Leste",
    endereco: "Av. Leste, 800 - Setor Leste",
    tipo: "agua",
    observacao: "Horário: 7h às 17h",
  },
  {
    id: "5",
    nome: "Base Oeste",
    endereco: "Rua Oeste, 350 - Setor Oeste",
    telefone: "(11) 99999-0005",
    tipo: "agua",
  },
];

export default function PontosAbastecimento() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPontos = pontosAbastecimento.filter(
    (ponto) =>
      ponto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ponto.endereco.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCall = (telefone: string) => {
    window.location.href = `tel:${telefone.replace(/\D/g, "")}`;
  };

  const handleOpenMaps = (endereco: string) => {
    const encoded = encodeURIComponent(endereco);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b shadow-sm">
        <div className="flex items-center gap-2 p-2 sm:p-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/painel-motorista")}
            className="shrink-0 h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold truncate flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-500" />
              Pontos de Abastecimento
            </h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Locais para abastecimento de água
            </p>
          </div>
        </div>
      </header>

      <main className="p-3 sm:p-4 max-w-lg mx-auto space-y-3 pb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ponto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">
            {filteredPontos.length} ponto{filteredPontos.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Points List */}
        <div className="space-y-3">
          {filteredPontos.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Droplets className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum ponto encontrado</p>
              </CardContent>
            </Card>
          ) : (
            filteredPontos.map((ponto) => (
              <Card key={ponto.id} className="overflow-hidden">
                <CardHeader className="pb-2 pt-3 px-3 sm:px-4">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-blue-500/10">
                      <Droplets className="h-4 w-4 text-blue-500" />
                    </div>
                    <span className="truncate">{ponto.nome}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-4 pb-3 space-y-2">
                  {/* Address */}
                  <div className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span className="break-words">{ponto.endereco}</span>
                  </div>

                  {/* Observation */}
                  {ponto.observacao && (
                    <p className="text-xs text-muted-foreground bg-muted/50 px-2 py-1.5 rounded">
                      {ponto.observacao}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 text-xs"
                      onClick={() => handleOpenMaps(ponto.endereco)}
                    >
                      <Navigation className="h-3.5 w-3.5 mr-1.5" />
                      Como Chegar
                    </Button>
                    {ponto.telefone && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-xs"
                        onClick={() => handleCall(ponto.telefone!)}
                      >
                        <Phone className="h-3.5 w-3.5 mr-1.5" />
                        Ligar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
