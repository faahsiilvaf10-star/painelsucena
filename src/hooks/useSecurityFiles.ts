import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SecurityFile {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string;
  uploaded_by_name: string;
  created_at: string;
  updated_at: string;
}

export function useSecurityFiles() {
  const queryClient = useQueryClient();

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["security-files"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_files")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SecurityFile[];
    },
  });

  const uploadFile = useMutation({
    mutationFn: async ({
      file,
      userId,
      userName,
    }: {
      file: File;
      userId: string;
      userName: string;
    }) => {
      // Upload to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("security-files")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("security-files")
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase.from("security_files").insert({
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        file_type: file.type || fileExt,
        uploaded_by: userId,
        uploaded_by_name: userName,
      });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-files"] });
      toast.success("Arquivo enviado com sucesso!");
    },
    onError: (error) => {
      console.error("Error uploading file:", error);
      toast.error("Erro ao enviar arquivo");
    },
  });

  const deleteFile = useMutation({
    mutationFn: async (file: SecurityFile) => {
      // Extract file name from URL
      const urlParts = file.file_url.split("/");
      const storagePath = urlParts[urlParts.length - 1];

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("security-files")
        .remove([storagePath]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("security_files")
        .delete()
        .eq("id", file.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-files"] });
      toast.success("Arquivo excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting file:", error);
      toast.error("Erro ao excluir arquivo");
    },
  });

  return {
    files,
    isLoading,
    uploadFile,
    deleteFile,
  };
}
