import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Image, Upload, RotateCcw } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function LoginBackgroundSettings() {
  const { settings, updateSettings } = useSiteSettings();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida.");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `login-bg-${Date.now()}.${fileExt}`;
      const filePath = `backgrounds/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("site-assets")
        .getPublicUrl(filePath);

      await updateSettings.mutateAsync({ login_background_url: data.publicUrl });
      toast.success("Plano de fundo da tela de login atualizado!");
    } catch (error) {
      console.error("Error uploading background:", error);
      toast.error("Erro ao fazer upload do plano de fundo.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleReset = async () => {
    try {
      await updateSettings.mutateAsync({ login_background_url: null });
      toast.success("Plano de fundo resetado para o padrão.");
    } catch (error) {
      console.error("Error resetting background:", error);
      toast.error("Erro ao resetar plano de fundo.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="w-5 h-5" />
          Fundo da Tela de Login
        </CardTitle>
        <CardDescription>
          Altere a imagem de fundo exibida na tela de autenticação.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-full sm:w-48 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center overflow-hidden bg-muted relative">
            {settings.login_background_url ? (
              <img 
                src={settings.login_background_url} 
                alt="Fundo atual" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <Image className="w-8 h-8" />
                <span className="text-xs">Padrão do Sistema</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-3 w-full sm:w-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
            />
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              variant="outline"
              className="w-full sm:w-auto"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload de Imagem
                </>
              )}
            </Button>
            
            <Button
              onClick={handleReset}
              disabled={!settings.login_background_url || isUploading}
              variant="ghost"
              className="w-full sm:w-auto text-muted-foreground"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Voltar ao Padrão
            </Button>
            
            <p className="text-xs text-muted-foreground mt-1">
              Recomendado: 1920x1080px. Máx: 5MB
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
