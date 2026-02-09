import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Eye,
  Search,
  FileImage,
  FileSpreadsheet,
  File,
} from "lucide-react";

// PDF icon using FileText with special styling
const FilePdfIcon = FileText;
import { useSecurityFiles, SecurityFile } from "@/hooks/useSecurityFiles";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function getFileIcon(fileType: string | null) {
  if (!fileType) return File;
  if (fileType.includes("pdf")) return FilePdfIcon;
  if (fileType.includes("image")) return FileImage;
  if (fileType.includes("sheet") || fileType.includes("excel") || fileType.includes("csv"))
    return FileSpreadsheet;
  return FileText;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "N/A";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ArquivosSeguranca() {
  const { files, isLoading, uploadFile, deleteFile } = useSecurityFiles();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SecurityFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredFiles = files.filter((file) =>
    file.file_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || !user || !profile) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(selectedFiles)) {
        await uploadFile.mutateAsync({
          file,
          userId: user.id,
          userName: profile.full_name,
        });
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleView = (file: SecurityFile) => {
    window.open(file.file_url, "_blank");
  };

  const handleDownload = (file: SecurityFile) => {
    const link = document.createElement("a");
    link.href = file.file_url;
    link.download = file.file_name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteFile.mutateAsync(deleteTarget);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Arquivos de Segurança</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Documentos e arquivos relacionados à segurança do trabalho
          </p>
        </div>

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || !user}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? "Enviando..." : "Enviar Arquivo"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Arquivos ({filteredFiles.length})</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar arquivo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum arquivo encontrado</h3>
              <p className="text-muted-foreground">
                {search
                  ? "Tente uma busca diferente"
                  : "Clique em 'Enviar Arquivo' para adicionar"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredFiles.map((file) => {
                const FileIcon = getFileIcon(file.file_type);
                return (
                  <Card
                    key={file.id}
                    className="group relative overflow-hidden transition-shadow hover:shadow-lg"
                  >
                    <div
                      className="relative flex h-32 cursor-pointer items-center justify-center bg-muted/50 transition-colors hover:bg-muted"
                      onClick={() => handleView(file)}
                    >
                      <FileIcon className="h-16 w-16 text-muted-foreground/70" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                        <Eye className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <h4
                        className="cursor-pointer truncate font-medium hover:text-primary"
                        onClick={() => handleView(file)}
                        title={file.file_name}
                      >
                        {file.file_name}
                      </h4>
                      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatFileSize(file.file_size)}</span>
                        <span>
                          {format(new Date(file.created_at), "dd/MM/yy", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        Por: {file.uploaded_by_name}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={() => handleDownload(file)}
                        >
                          <Download className="h-3 w-3" />
                          Baixar
                        </Button>
                        {(user?.id === file.uploaded_by || profile?.cargo === "preposto") && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => setDeleteTarget(file)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir arquivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteTarget?.file_name}"? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
