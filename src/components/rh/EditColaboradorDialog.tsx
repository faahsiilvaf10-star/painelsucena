import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Colaborador, funcoes, NrDateInfo } from "@/data/efetivoData";
import { toast } from "sonner";
import { X, Calendar } from "lucide-react";

const ALL_NRS = [
  "NR-01", "NR-04", "NR-05", "NR-06", "NR-07", "NR-09", "NR-10",
  "NR-11", "NR-12", "NR-13", "NR-15", "NR-17", "NR-18",
  "NR-20", "NR-23", "NR-25", "NR-26", "NR-28",
  "NR-33", "NR-34", "NR-35",
];

interface EditColaboradorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaborador: Colaborador | null;
  onSave: (updated: Colaborador) => void;
}

const formatCPF = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  return numbers
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    .slice(0, 14);
};

const formatDate = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  return numbers
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})(\d)/, "$1/$2")
    .slice(0, 10);
};

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 10) {
    return numbers
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return numbers
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .slice(0, 15);
};

export const EditColaboradorDialog = ({
  open,
  onOpenChange,
  colaborador,
  onSave,
}: EditColaboradorDialogProps) => {
  const [formData, setFormData] = useState({
    nome: "",
    funcao: "",
    cpf: "",
    dataNascimento: "",
    admissao: "",
    matricula: "",
    matriculaHydro: "",
    contato: "",
    localidade: "",
  });
  const [selectedNrs, setSelectedNrs] = useState<string[]>([]);
  const [nrDates, setNrDates] = useState<Record<string, NrDateInfo>>({});
  const [showNrPicker, setShowNrPicker] = useState(false);

  useEffect(() => {
    if (open && colaborador) {
      setFormData({
        nome: colaborador.nome,
        funcao: colaborador.funcao,
        cpf: colaborador.cpf,
        dataNascimento: colaborador.dataNascimento,
        admissao: colaborador.admissao,
        matricula: colaborador.matricula,
        matriculaHydro: colaborador.matriculaHydro || "",
        contato: colaborador.contato,
        localidade: colaborador.localidade,
      });
      setSelectedNrs(colaborador.nrs || []);
      setNrDates(colaborador.nrDates || {});
      setShowNrPicker(false);
    }
  }, [open, colaborador]);

  const toggleNr = (nr: string) => {
    setSelectedNrs((prev) => {
      if (prev.includes(nr)) {
        const updated = { ...nrDates };
        delete updated[nr];
        setNrDates(updated);
        return prev.filter((n) => n !== nr);
      }
      return [...prev, nr].sort();
    });
  };

  const updateNrDate = (nr: string, field: "realizacao" | "vencimento", value: string) => {
    setNrDates((prev) => ({
      ...prev,
      [nr]: {
        realizacao: prev[nr]?.realizacao || "",
        vencimento: prev[nr]?.vencimento || "",
        [field]: formatDate(value),
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!colaborador) return;
    if (!formData.nome || !formData.funcao) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    onSave({
      ...colaborador,
      ...formData,
      matriculaHydro: formData.matriculaHydro || undefined,
      nrs: selectedNrs.length > 0 ? selectedNrs : undefined,
      nrDates: Object.keys(nrDates).length > 0 ? nrDates : undefined,
    });
    onOpenChange(false);
    toast.success("Colaborador atualizado com sucesso!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Colaborador</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-nome">Nome Completo *</Label>
            <Input
              id="edit-nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-funcao">Função *</Label>
            <Select
              value={formData.funcao}
              onValueChange={(value) => setFormData({ ...formData, funcao: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                {funcoes.map((funcao) => (
                  <SelectItem key={funcao} value={funcao}>
                    {funcao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* NRs Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>NRs do Colaborador</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowNrPicker(!showNrPicker)}
              >
                {showNrPicker ? "Fechar" : "Selecionar NRs"}
              </Button>
            </div>
            {selectedNrs.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedNrs.map((nr) => (
                  <Badge
                    key={nr}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-destructive/20 gap-1"
                    onClick={() => toggleNr(nr)}
                  >
                    {nr}
                    <X className="w-3 h-3" />
                  </Badge>
                ))}
              </div>
            )}
            {selectedNrs.length === 0 && !showNrPicker && (
              <p className="text-xs text-muted-foreground">Nenhuma NR selecionada</p>
            )}
            {showNrPicker && (
              <div className="grid grid-cols-3 gap-2 p-3 border rounded-lg bg-muted/30 max-h-48 overflow-y-auto">
                {ALL_NRS.map((nr) => (
                  <label
                    key={nr}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent/50 rounded p-1"
                  >
                    <Checkbox
                      checked={selectedNrs.includes(nr)}
                      onCheckedChange={() => toggleNr(nr)}
                    />
                    {nr}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* NR Date Fields */}
          {selectedNrs.length > 0 && (
            <div className="space-y-3 border rounded-lg p-3 bg-muted/20">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <Calendar className="w-4 h-4" />
                Datas das NRs
              </Label>
              {selectedNrs.map((nr) => (
                <div key={nr} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{nr}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Realização</Label>
                      <Input
                        value={nrDates[nr]?.realizacao || ""}
                        onChange={(e) => updateNrDate(nr, "realizacao", e.target.value)}
                        placeholder="DD/MM/AAAA"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Vencimento</Label>
                      <Input
                        value={nrDates[nr]?.vencimento || ""}
                        onChange={(e) => updateNrDate(nr, "vencimento", e.target.value)}
                        placeholder="DD/MM/AAAA"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-cpf">CPF</Label>
              <Input
                id="edit-cpf"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-matriculaHydro">Matrícula Hydro</Label>
              <Input
                id="edit-matriculaHydro"
                value={formData.matriculaHydro}
                onChange={(e) => setFormData({ ...formData, matriculaHydro: e.target.value.replace(/\D/g, "") })}
                placeholder="00000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-matricula">Matrícula Sucena</Label>
            <Input
              id="edit-matricula"
              value={formData.matricula}
              onChange={(e) => setFormData({ ...formData, matricula: e.target.value.replace(/\D/g, "") })}
              placeholder="0000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-dataNascimento">Data de Nascimento</Label>
              <Input
                id="edit-dataNascimento"
                value={formData.dataNascimento}
                onChange={(e) => setFormData({ ...formData, dataNascimento: formatDate(e.target.value) })}
                placeholder="DD/MM/AAAA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-admissao">Data de Admissão</Label>
              <Input
                id="edit-admissao"
                value={formData.admissao}
                onChange={(e) => setFormData({ ...formData, admissao: formatDate(e.target.value) })}
                placeholder="DD/MM/AAAA"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-contato">Contato</Label>
            <Input
              id="edit-contato"
              value={formData.contato}
              onChange={(e) => setFormData({ ...formData, contato: formatPhone(e.target.value) })}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-localidade">Localidade</Label>
            <Input
              id="edit-localidade"
              value={formData.localidade}
              onChange={(e) => setFormData({ ...formData, localidade: e.target.value.toUpperCase() })}
              placeholder="Cidade - UF"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar Alterações</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
