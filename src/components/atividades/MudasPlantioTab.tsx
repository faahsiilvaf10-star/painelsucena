import { useState } from "react";
import { Plus, Trash2, Sprout, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMudasPlantio, useAddMudaPlantio, useDeleteMudaPlantio } from "@/hooks/useMudasPlantio";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const FAIXA_OPTIONS = [
  { value: "FAIXA 1", label: "Faixa 1" },
  { value: "FAIXA 2", label: "Faixa 2" },
  { value: "FAIXA 3", label: "Faixa 3" },
];

// Even bermas from 28 to 56
const BERMA_OPTIONS_EVEN = Array.from({ length: 15 }, (_, i) => ({
  value: (28 + i * 2).toString(),
  label: `Berma ${28 + i * 2}`,
}));

interface MudasPlantioTabProps {
  canEdit: boolean;
}

export default function MudasPlantioTab({ canEdit }: MudasPlantioTabProps) {
  const { data: mudas, isLoading } = useMudasPlantio();
  const addMuda = useAddMudaPlantio();
  const deleteMuda = useDeleteMudaPlantio();

  const [especie, setEspecie] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [faixa, setFaixa] = useState("");
  const [berma, setBerma] = useState("");

  const handleAdd = async () => {
    if (!especie.trim()) {
      toast.error("Informe o nome da espécie.");
      return;
    }
    if (!quantidade || parseInt(quantidade) <= 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }
    if (!faixa && !berma) {
      toast.error("Selecione a Faixa ou a Berma onde foram plantadas.");
      return;
    }

    try {
      await addMuda.mutateAsync({
        especie: especie.trim(),
        quantidade: parseInt(quantidade),
        faixa: faixa || undefined,
        berma: berma ? parseInt(berma) : undefined,
      });
      toast.success("Muda registrada com sucesso!");
      setEspecie("");
      setQuantidade("");
      setFaixa("");
      setBerma("");
    } catch (error: any) {
      toast.error("Erro ao registrar: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este registro?")) return;
    try {
      await deleteMuda.mutateAsync(id);
      toast.success("Registro excluído!");
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  const totalMudas = mudas?.reduce((sum, m) => sum + m.quantidade, 0) || 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary */}
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2">
            <Sprout className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Total de Mudas Registradas:</span>
            <Badge variant="outline" className="border-green-500/50 text-green-500 font-semibold">
              {totalMudas.toLocaleString("pt-BR")} unidades
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      {canEdit && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Registrar Mudas Compradas / Plantadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Espécie *</Label>
                <Input
                  placeholder="Ex: Ipê Amarelo"
                  value={especie}
                  onChange={(e) => setEspecie(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Quantidade *</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Qtd"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Faixa</Label>
                <Select value={faixa} onValueChange={setFaixa}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a faixa" />
                  </SelectTrigger>
                  <SelectContent>
                    {FAIXA_OPTIONS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Berma (pares 28-56)</Label>
                <Select value={berma} onValueChange={setBerma}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a berma" />
                  </SelectTrigger>
                  <SelectContent>
                    {BERMA_OPTIONS_EVEN.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleAdd} disabled={addMuda.isPending} className="gap-2">
              {addMuda.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Registros de Mudas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !mudas?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Espécie</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead>Local</TableHead>
                    {canEdit && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mudas.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(parseISO(m.created_at), "dd/MM/yy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">{m.especie}</TableCell>
                      <TableCell className="text-right">{m.quantidade}</TableCell>
                      <TableCell className="text-xs">
                        {m.faixa && <Badge variant="secondary" className="mr-1">{m.faixa}</Badge>}
                        {m.berma && <Badge variant="outline">Berma {m.berma}</Badge>}
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleDelete(m.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
