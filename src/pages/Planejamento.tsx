import { Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Planejamento() {
  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Target className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gradient">
            Planejamento
          </h1>
          <p className="text-sm text-muted-foreground">
            Organize as ações e estratégias da equipe.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Em construção</CardTitle>
          <CardDescription>
            Esta área receberá em breve as ferramentas de planejamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use este espaço para registrar metas, cronogramas e prioridades da operação.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
