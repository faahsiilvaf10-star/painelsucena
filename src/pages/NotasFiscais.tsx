import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Upload, Search, Trash2, Download, Plus, X, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const NotasFiscais = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [numero, setNumero] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [valor, setValor] = useState("");
  const [dataEmissao, setDataEmissao] = useState(format(new Date(), "yyyy-MM-dd"));
  const [descricao, setDescricao] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const canEdit = isAdmin || profile?.cargo === "aux_administrativo" || profile?.cargo === "preposto";

  const { data: notas, isLoading } = useQuery({
    queryKey: ["notas-fiscais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notas_fiscais")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createNota = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      let fileUrl: string | null = null;
      let fileName: string | null = null;

      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("notas-fiscais")
          .upload(path, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("notas-fiscais")
          .getPublicUrl(path);
        fileUrl = urlData.publicUrl;
        fileName = file.name;
      }

      const { error } = await supabase.from("notas_fiscais").insert({
        numero,
        fornecedor,
        valor: valor ? parseFloat(valor) : null,
        data_emissao: dataEmissao,
        descricao: descricao || null,
        file_url: fileUrl,
        file_name: fileName,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
      toast.success("Nota fiscal salva com sucesso!");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar nota fiscal: " + error.message);
    },
  });

  const deleteNota = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notas_fiscais").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
      toast.success("Nota fiscal excluída!");
    },
    onError: () => toast.error("Erro ao excluir nota fiscal"),
  });

  const resetForm = () => {
    setDialogOpen(false);
    setNumero("");
    setFornecedor("");
    setValor("");
    setDataEmissao(format(new Date(), "yyyy-MM-dd"));
    setDescricao("");
    setFile(null);
  };

  const handleSubmit = async () => {
    if (!numero || !fornecedor) {
      toast.error("Preencha número e fornecedor");
      return;
    }
    setUploading(true);
    await createNota.mutateAsync();
    setUploading(false);
  };

  const filtered = notas?.filter((n) => {
    const term = searchTerm.toLowerCase();
    return (
      n.numero.toLowerCase().includes(term) ||
      n.fornecedor.toLowerCase().includes(term) ||
      (n.descricao && n.descricao.toLowerCase().includes(term))
    );
  });

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileText className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Notas Fiscais</h1>
          {notas && (
            <Badge variant="secondary" className="text-xs">
              {notas.length} registros
            </Badge>
          )}
        </div>

        {canEdit && (
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Nota Fiscal
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por número, fornecedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered && filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="hidden md:table-cell">Valor</TableHead>
                    <TableHead className="hidden sm:table-cell">Data Emissão</TableHead>
                    <TableHead className="hidden lg:table-cell">Descrição</TableHead>
                    <TableHead>Arquivo</TableHead>
                    {isAdmin && <TableHead className="w-16">Ação</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((nota) => (
                    <TableRow key={nota.id}>
                      <TableCell className="font-medium">{nota.numero}</TableCell>
                      <TableCell>{nota.fornecedor}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {formatCurrency(nota.valor)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {format(new Date(nota.data_emissao + "T12:00:00"), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-[200px] truncate">
                        {nota.descricao || "-"}
                      </TableCell>
                      <TableCell>
                        {nota.file_url ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => setPreviewUrl(nota.file_url)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <a href={nota.file_url} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm("Excluir esta nota fiscal?")) {
                                deleteNota.mutate(nota.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma nota fiscal encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Nota Fiscal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Número da NF *</Label>
              <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ex: 12345" />
            </div>
            <div>
              <Label>Fornecedor *</Label>
              <Input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Nome do fornecedor" />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <Label>Data de Emissão</Label>
              <Input type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição opcional" rows={2} />
            </div>
            <div>
              <Label>Arquivo (PDF/Imagem)</Label>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file && <p className="text-xs text-muted-foreground mt-1">{file.name}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={uploading} className="gap-2">
              {uploading ? "Salvando..." : <>
                <Upload className="h-4 w-4" />
                Salvar
              </>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Visualizar Arquivo</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            previewUrl.endsWith(".pdf") ? (
              <iframe src={previewUrl} className="w-full h-[70vh] rounded-md" />
            ) : (
              <img src={previewUrl} alt="Nota Fiscal" className="w-full max-h-[70vh] object-contain rounded-md" />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotasFiscais;
