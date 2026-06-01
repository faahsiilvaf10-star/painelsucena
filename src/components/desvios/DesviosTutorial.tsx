import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, ChevronRight, ChevronLeft } from "lucide-react";

const tutorialSteps = [
  {
    title: "Visualizar Desvios",
    description: "Na tela principal, você tem um dashboard com o resumo dos desvios (Total, Abertos, Em Tratamento, Concluídos e Atrasados). Clique nos cards para filtrar a lista.",
    gifUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=500", // Placeholder for visual reference
  },
  {
    title: "Criar Novo Desvio",
    description: "Clique no botão '+ Novo Desvio'. Preencha a descrição, anexe fotos ou vídeos, defina a tratativa (instruções), escolha o responsável e o prazo.",
    gifUrl: "https://images.unsplash.com/photo-1454165833767-027ffea9e77b?auto=format&fit=crop&q=80&w=500",
  },
  {
    title: "Tratativa e Correção",
    description: "O responsável recebe o desvio e pode preencher a 'Correção Realizada'. Usuários master podem aprovar, reprovar ou encerrar o desvio após a correção.",
    gifUrl: "https://images.unsplash.com/photo-1484417894907-623942c8ee29?auto=format&fit=crop&q=80&w=500",
  },
  {
    title: "Exportar e Compartilhar",
    description: "Dentro de um desvio, use os botões no rodapé para imprimir em PDF, enviar via WhatsApp ou E-mail.",
    gifUrl: "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&q=80&w=500",
  }
];

export function DesviosTutorial() {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full shadow-sm hover:bg-primary hover:text-white transition-all">
          <HelpCircle className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            Tutorial: Como usar a página de Desvios
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
            <img 
              src={tutorialSteps[currentStep].gifUrl} 
              alt={tutorialSteps[currentStep].title}
              className="object-cover w-full h-full opacity-80"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
              <span className="bg-white/90 px-3 py-1 rounded-full text-xs font-bold text-primary">PASSO {currentStep + 1}</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-lg text-primary">{tutorialSteps[currentStep].title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {tutorialSteps[currentStep].description}
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex gap-1">
              {tutorialSteps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 w-6 rounded-full transition-all ${i === currentStep ? 'bg-primary' : 'bg-muted'}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={prevStep} 
                disabled={currentStep === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
              </Button>
              <Button 
                size="sm" 
                onClick={nextStep} 
                disabled={currentStep === tutorialSteps.length - 1}
              >
                Próximo <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
