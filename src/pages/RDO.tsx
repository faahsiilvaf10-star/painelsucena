import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Copy, Send, FileText, Sun, Cloud, CloudRain, CloudSun } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAttendanceRecords } from "@/hooks/useAttendance";
import { useEquipment } from "@/hooks/useEquipment";
import { useTodayDDS } from "@/hooks/useDDSSchedule";
import { getBrazilNorthDate, getBrazilNorthTodayString } from "@/lib/timezone";

// Role mappings for areas
const roleToArea: Record<string, "gabiao" | "jardinagem"> = {
  polivalente: "gabiao",
  meia_oficial: "gabiao",
  ajudante_gabiao: "gabiao",
  aux_eletrica: "gabiao",
  mecanico: "gabiao",
  jardineiro: "jardinagem",
  ajudante_jardinagem: "jardinagem",
  motorista_pipa: "jardinagem",
  motorista_munk: "jardinagem",
  motorista_onibus: "jardinagem",
  motorista_veiculo_leve: "jardinagem",
};

const roleLabels: Record<string, string> = {
  polivalente: "Polivalente",
  meia_oficial: "Meia Oficial",
  ajudante_gabiao: "Ajudante",
  aux_eletrica: "Aux. Elétrica",
  mecanico: "Mecânico",
  jardineiro: "Jardineiro",
  ajudante_jardinagem: "Ajudante",
  motorista_pipa: "Motorista Pipa",
  motorista_munk: "Motorista Munck",
  motorista_onibus: "Motorista Ônibus",
  motorista_veiculo_leve: "Motorista Veículo Leve",
};

const equipmentTypeLabels: Record<string, string> = {
  pipa: "Caminhão Pipa",
  munk: "Munck",
  camionete: "Veiculo Leve",
  onibus: "Ônibus",
};

const weatherOptions = [
  { value: "sol", label: "Sol", icon: Sun },
  { value: "nublado", label: "Nublado", icon: Cloud },
  { value: "parcialmente_nublado", label: "Parcialmente Nublado", icon: CloudSun },
  { value: "chuva", label: "Chuva", icon: CloudRain },
];

export default function RDO() {
  const todayStr = getBrazilNorthTodayString();
  const today = getBrazilNorthDate();
  
  const { data: attendanceRecords } = useAttendanceRecords(todayStr);
  const { data: equipment } = useEquipment();
  const { data: todayDDS } = useTodayDDS();

  // Form state
  const [headerInfo, setHeaderInfo] = useState({
    empresa: "Sucena Empreendimentos",
    contrato: "460001269",
    gerencia: "Hydro",
    lideranca: "Eng. Luís Araújo",
    tst: "",
    local: "Alunorte Barcarena",
    horario: "07:00 as 17:00",
  });

  const [gabiaoActivities, setGabiaoActivities] = useState({
    localServico: "",
    atividades: "",
  });

  const [jardinagemActivities, setJardinagemActivities] = useState({
    localServico: "",
    atividades: "",
  });

  const [ajudantesPipa, setAjudantesPipa] = useState("");
  const [weatherMorning, setWeatherMorning] = useState("sol");
  const [weatherAfternoon, setWeatherAfternoon] = useState("sol");
  const [difficulties, setDifficulties] = useState("Não Houve.");

  // Calculate workforce by role and area
  const workforceByArea = useMemo(() => {
    const presentRecords = attendanceRecords?.filter(
      (r) => r.status === "present" || r.status === "late"
    ) || [];

    const gabiao: Record<string, number> = {};
    const jardinagem: Record<string, number> = {};

    presentRecords.forEach((record) => {
      const role = record.employees?.role || "";
      const area = roleToArea[role];
      
      if (area === "gabiao") {
        gabiao[role] = (gabiao[role] || 0) + 1;
      } else if (area === "jardinagem") {
        jardinagem[role] = (jardinagem[role] || 0) + 1;
      }
    });

    return { gabiao, jardinagem };
  }, [attendanceRecords]);

  // Calculate equipment summary
  const equipmentSummary = useMemo(() => {
    if (!equipment) return { items: [], total: 0 };
    
    const typeCount: Record<string, { count: number; plates: string[] }> = {};
    
    equipment.forEach((eq) => {
      const type = eq.equipment_type || "pipa";
      if (!typeCount[type]) {
        typeCount[type] = { count: 0, plates: [] };
      }
      typeCount[type].count++;
      typeCount[type].plates.push(eq.plate);
    });

    const items = Object.entries(typeCount).map(([type, data]) => ({
      type,
      label: equipmentTypeLabels[type] || type,
      count: data.count,
      plates: data.plates,
    }));

    return { items, total: equipment.length };
  }, [equipment]);

  // Format date for report
  const formattedDate = format(today, "dd/MM/yy (EEEE)", { locale: ptBR });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  // Generate the formatted report
  const generateReport = () => {
    const weatherLabels: Record<string, string> = {
      sol: "Sol",
      nublado: "Nublado",
      parcialmente_nublado: "Parcialmente Nublado",
      chuva: "Chuva",
    };

    // Build workforce text for gabião
    const gabiaoWorkforce = Object.entries(workforceByArea.gabiao)
      .map(([role, count]) => `${String(count).padStart(2, "0")} ${roleLabels[role] || role}`)
      .join("\n");

    // Build workforce text for jardinagem
    const jardinagemWorkforce = Object.entries(workforceByArea.jardinagem)
      .map(([role, count]) => `${String(count).padStart(2, "0")} ${roleLabels[role] || role}`)
      .join("\n");

    // Build equipment text
    const equipmentText = equipmentSummary.items
      .map((item) => {
        const platesStr = item.plates.length > 0 ? ` * - ${item.plates.join("- ")}*` : "";
        return `•       ${String(item.count).padStart(2, "0")} ${item.label}${platesStr}`;
      })
      .join("\n");

    // DDS info
    const ddsText = todayDDS
      ? `${todayDDS.presenter?.full_name || "A definir"} - ${todayDDS.theme || "Tema a definir"}`
      : "A definir";

    const report = `🏗 EMPRESA: ${headerInfo.empresa}

📄 CONTRATO - ${headerInfo.contrato}

➡ GERÊNCIA: ${headerInfo.gerencia}

➡ LIDERANÇA: ${headerInfo.lideranca}

➡ TST: ${headerInfo.tst}

➡ LOCAL: ${headerInfo.local}

➡ DATA: ${capitalizedDate}

➡ HORÁRIO: ${headerInfo.horario}

➡ DDS: ${ddsText}

🛠 ATIVIDADES:

*Jardinagem e Gabiões*

📍 Local do serviço
    ${jardinagemActivities.localServico}

     *Jardinagem*
${jardinagemActivities.atividades}

👷🏻Efetivo👷🏾‍♂
${jardinagemWorkforce}

* Ajudantes Pipas:
${ajudantesPipa.split("\n").map((name) => `      ${name.trim()}`).join("\n")}

    *Manutenção De Gabião*

📍 Local do serviço
    ${gabiaoActivities.localServico}

${gabiaoActivities.atividades}

👷🏻Efetivo👷🏾‍♂
${gabiaoWorkforce}

🚜 EQUIPAMENTOS
${equipmentText}

Total: ${String(equipmentSummary.total).padStart(2, "0")} Equipamentos

Condições climáticas:
•	MANHÃ  = ${weatherLabels[weatherMorning]}
•	TARDE =  ${weatherLabels[weatherAfternoon]}

⚠ DIFICULDADES/DESVIOS
${difficulties}`;

    return report;
  };

  const handleCopy = async () => {
    const report = generateReport();
    await navigator.clipboard.writeText(report);
    toast.success("Relatório copiado!");
  };

  const handleWhatsApp = () => {
    const report = generateReport();
    const encoded = encodeURIComponent(report);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">RDO - Relatório Diário de Obra</h1>
              <p className="text-muted-foreground">{capitalizedDate}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
            <Button onClick={handleWhatsApp} className="bg-green-600 hover:bg-green-700">
              <Send className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div className="space-y-4">
            {/* Header Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Empresa</Label>
                    <Input
                      value={headerInfo.empresa}
                      onChange={(e) => setHeaderInfo({ ...headerInfo, empresa: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contrato</Label>
                    <Input
                      value={headerInfo.contrato}
                      onChange={(e) => setHeaderInfo({ ...headerInfo, contrato: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gerência</Label>
                    <Input
                      value={headerInfo.gerencia}
                      onChange={(e) => setHeaderInfo({ ...headerInfo, gerencia: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Liderança</Label>
                    <Input
                      value={headerInfo.lideranca}
                      onChange={(e) => setHeaderInfo({ ...headerInfo, lideranca: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>TST</Label>
                    <Input
                      value={headerInfo.tst}
                      onChange={(e) => setHeaderInfo({ ...headerInfo, tst: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Local</Label>
                    <Input
                      value={headerInfo.local}
                      onChange={(e) => setHeaderInfo({ ...headerInfo, local: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Horário</Label>
                    <Input
                      value={headerInfo.horario}
                      onChange={(e) => setHeaderInfo({ ...headerInfo, horario: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🛠 Atividades</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="jardinagem">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="jardinagem">Jardinagem</TabsTrigger>
                    <TabsTrigger value="gabiao">Gabião</TabsTrigger>
                  </TabsList>
                  <TabsContent value="jardinagem" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>📍 Local do Serviço</Label>
                      <Input
                        value={jardinagemActivities.localServico}
                        onChange={(e) =>
                          setJardinagemActivities({ ...jardinagemActivities, localServico: e.target.value })
                        }
                        placeholder="Ex: DRS1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Atividades Realizadas</Label>
                      <Textarea
                        value={jardinagemActivities.atividades}
                        onChange={(e) =>
                          setJardinagemActivities({ ...jardinagemActivities, atividades: e.target.value })
                        }
                        placeholder="* Coroamento na Berma 30 -132 unidades&#10;* Irrigação das Bermas Faixa 3 e 4 com pipa"
                        rows={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ajudantes Pipas (um por linha)</Label>
                      <Textarea
                        value={ajudantesPipa}
                        onChange={(e) => setAjudantesPipa(e.target.value)}
                        placeholder="Anderson&#10;Josiel"
                        rows={3}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="gabiao" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>📍 Local do Serviço</Label>
                      <Input
                        value={gabiaoActivities.localServico}
                        onChange={(e) =>
                          setGabiaoActivities({ ...gabiaoActivities, localServico: e.target.value })
                        }
                        placeholder="Ex: Faixa 2 Fase 1 elevação"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Atividades Realizadas</Label>
                      <Textarea
                        value={gabiaoActivities.atividades}
                        onChange={(e) =>
                          setGabiaoActivities({ ...gabiaoActivities, atividades: e.target.value })
                        }
                        placeholder="* Retirada de tela 6 x 2.50cm&#10;* Retirada de cascalho 1 m²&#10;* Reposição de geomembrana 8 x 3"
                        rows={6}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Weather & Difficulties */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Condições e Observações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>☀️ Manhã</Label>
                    <Select value={weatherMorning} onValueChange={setWeatherMorning}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {weatherOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <opt.icon className="h-4 w-4" />
                              {opt.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>🌙 Tarde</Label>
                    <Select value={weatherAfternoon} onValueChange={setWeatherAfternoon}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {weatherOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <opt.icon className="h-4 w-4" />
                              {opt.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>⚠ Dificuldades/Desvios</Label>
                  <Textarea
                    value={difficulties}
                    onChange={(e) => setDifficulties(e.target.value)}
                    placeholder="Não Houve."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Preview */}
          <Card className="h-fit lg:sticky lg:top-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                📋 Prévia do Relatório
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg">
                  {generateReport()}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
