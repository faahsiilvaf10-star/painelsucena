import { Phone, Radio, PhoneCall, Heart, Flame, Leaf, Bug, MapPin, Info } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Emergencia = () => {
  return (
    <Layout>
      <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <div className="flex items-center gap-3 sm:gap-4 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-destructive" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold">Contatos de Emergência</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Procedimentos e comunicação em caso de acidentes.</p>
            </div>
          </div>
        </div>

        {/* Contact Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Comunicação Interna */}
          <Card className="border-l-4 border-l-destructive animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Radio className="w-5 h-5" />
                Comunicação Interna
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Rádio */}
              <div className="flex items-center justify-between p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Rádio Comunicador</p>
                  <p className="text-xl font-bold text-destructive">BOTÃO VERMELHO</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                  <Radio className="w-6 h-6 text-destructive" />
                </div>
              </div>
              
              {/* Telefone Fixo */}
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Telefone Fixo</p>
                  <p className="text-xl font-bold">Ramal 9100</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                  <Phone className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Celulares de Emergência */}
          <Card className="border-l-4 border-l-green-500 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-500">
                <PhoneCall className="w-5 h-5" />
                Celulares de Emergência
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Emergência 1 */}
              <a 
                href="tel:+5591992071008" 
                className="flex items-center justify-between p-4 bg-green-500/5 rounded-lg border border-green-500/20 hover:bg-green-500/10 transition-colors cursor-pointer"
              >
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Emergência 1</p>
                  <p className="text-xl font-bold">(91) 99207-1008</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <PhoneCall className="w-6 h-6 text-green-600 dark:text-green-500" />
                </div>
              </a>
              
              {/* Emergência 2 */}
              <a 
                href="tel:+5591988717520" 
                className="flex items-center justify-between p-4 bg-green-500/5 rounded-lg border border-green-500/20 hover:bg-green-500/10 transition-colors cursor-pointer"
              >
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Emergência 2</p>
                  <p className="text-xl font-bold">(91) 98871-7520</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <PhoneCall className="w-6 h-6 text-green-600 dark:text-green-500" />
                </div>
              </a>
            </CardContent>
          </Card>
        </div>

        {/* Tipos de Ocorrência */}
        <Card className="mb-6 sm:mb-8 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Tipos de Ocorrência Atendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Médica */}
              <div className="flex flex-col items-center p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-3">
                  <Heart className="w-6 h-6 text-red-500" />
                </div>
                <p className="font-semibold text-red-600 dark:text-red-400">Médica</p>
                <p className="text-xs text-muted-foreground text-center">Acidentes e Mal súbito</p>
              </div>

              {/* Incêndio */}
              <div className="flex flex-col items-center p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center mb-3">
                  <Flame className="w-6 h-6 text-orange-500" />
                </div>
                <p className="font-semibold text-orange-600 dark:text-orange-400">Incêndio</p>
                <p className="text-xs text-muted-foreground text-center">Fogo e Explosões</p>
              </div>

              {/* Ambiental */}
              <div className="flex flex-col items-center p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                  <Leaf className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">Ambiental</p>
                <p className="text-xs text-muted-foreground text-center">Vazamentos e Danos</p>
              </div>

              {/* Fauna */}
              <div className="flex flex-col items-center p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-3">
                  <Bug className="w-6 h-6 text-amber-500" />
                </div>
                <p className="font-semibold text-amber-600 dark:text-amber-400">Fauna</p>
                <p className="text-xs text-muted-foreground text-center">Captura de Animais</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ponto de Encontro */}
        <div 
          className="relative overflow-hidden rounded-xl bg-gradient-to-r from-green-600 to-green-700 p-4 sm:p-6 text-white animate-slide-up"
          style={{ animationDelay: "0.4s" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 sm:w-8 sm:h-8" />
              </div>
              <div>
                <h3 className="text-lg sm:text-2xl font-bold uppercase tracking-wide">Ponto de Encontro</h3>
                <p className="text-green-100 text-xs sm:text-base">Dirija-se a este local em caso de evacuação.</p>
              </div>
            </div>
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-white flex items-center justify-center shadow-lg shrink-0">
              <span className="text-2xl sm:text-4xl font-bold text-green-600">33</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Emergencia;
