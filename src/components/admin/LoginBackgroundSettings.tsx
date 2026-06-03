import { useState, useRef, useCallback, useEffect } from "react";
import debounce from "lodash/debounce";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Image, Upload, RotateCcw, Sparkles, Palette, Hash, Zap, MonitorPlay, Loader2 } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function LoginBackgroundSettings() {
  const { settings, updateSettings } = useSiteSettings();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const transitionLogoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingTransitionLogo, setIsUploadingTransitionLogo] = useState(false);
  const loadingImageInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLoadingImage, setIsUploadingLoadingImage] = useState(false);
  
  // Debounced update for settings that change frequently (colors, sliders)
  const debouncedUpdate = useCallback(
    debounce((updates: any) => {
      updateSettings.mutate(updates);
    }, 500),
    [updateSettings.mutate]
  );

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      debouncedUpdate.cancel();
    };
  }, [debouncedUpdate]);

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
  
  const handleTransitionLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida.");
      return;
    }

    setIsUploadingTransitionLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `transition-logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("site-assets")
        .getPublicUrl(filePath);

      await updateSettings.mutateAsync({ transition_logo_url: data.publicUrl });
      toast.success("Logo de transição atualizada!");
    } catch (error) {
      console.error("Error uploading transition logo:", error);
      toast.error("Erro ao fazer upload da logo de transição.");
    } finally {
      setIsUploadingTransitionLogo(false);
      if (transitionLogoInputRef.current) transitionLogoInputRef.current.value = "";
    }
  };

  const handleResetTransitionLogo = async () => {
    try {
      await updateSettings.mutateAsync({ transition_logo_url: null });
      toast.success("Logo de transição resetada para o padrão.");
    } catch (error) {
      console.error("Error resetting transition logo:", error);
      toast.error("Erro ao resetar logo de transição.");
    }
  };

  const handleParticleReset = async () => {
    try {
      await updateSettings.mutateAsync({
        login_particles_enabled: true,
        login_particles_color: "white",
        login_particles_color2: null,
        login_particles_color3: null,
        login_particles_count: 100,
        login_particles_speed: 1.0,
      });
      toast.success("Configurações de partículas resetadas para o padrão.");
    } catch (error) {
      console.error("Error resetting particles:", error);
      toast.error("Erro ao resetar partículas.");
    }
  };

  const handleLoadingImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida.");
      return;
    }

    setIsUploadingLoadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `loading-img-${Date.now()}.${fileExt}`;
      const filePath = `loading/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("site-assets")
        .getPublicUrl(filePath);

      await updateSettings.mutateAsync({ page_loading_img_url: data.publicUrl });
      toast.success("Imagem de carregamento atualizada!");
    } catch (error) {
      console.error("Error uploading loading image:", error);
      toast.error("Erro ao fazer upload da imagem de carregamento.");
    } finally {
      setIsUploadingLoadingImage(false);
      if (loadingImageInputRef.current) loadingImageInputRef.current.value = "";
    }
  };

  const handleResetLoadingImage = async () => {
    try {
      await updateSettings.mutateAsync({ page_loading_img_url: null });
      toast.success("Imagem de carregamento resetada para o padrão.");
    } catch (error) {
      console.error("Error resetting loading image:", error);
      toast.error("Erro ao resetar imagem de carregamento.");
    }
  };

  return (
    <div className="space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Partículas em Movimento
          </CardTitle>
          <CardDescription>
            Personalize as partículas que flutuam na tela de login.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ativar Partículas</Label>
              <p className="text-sm text-muted-foreground">
                Exibe partículas animadas sobre o fundo.
              </p>
            </div>
            <Switch
              checked={settings.login_particles_enabled}
              onCheckedChange={(checked) => updateSettings.mutate({ login_particles_enabled: checked })}
            />
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Cores das Partículas
              </Label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.login_particles_color && settings.login_particles_color.startsWith("#") ? settings.login_particles_color : "#ffffff"}
                    onChange={(e) => debouncedUpdate({ login_particles_color: e.target.value })}
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    defaultValue={settings.login_particles_color}
                    onChange={(e) => debouncedUpdate({ login_particles_color: e.target.value })}
                    placeholder="Cor 1 (Ex: white ou #ffffff)"
                    className="flex-1"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.login_particles_color2 && settings.login_particles_color2.startsWith("#") ? settings.login_particles_color2 : "#ffffff"}
                    onChange={(e) => debouncedUpdate({ login_particles_color2: e.target.value })}
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    defaultValue={settings.login_particles_color2 || ""}
                    onChange={(e) => debouncedUpdate({ login_particles_color2: e.target.value || null })}
                    placeholder="Cor 2 (Opcional)"
                    className="flex-1"
                  />
                </div>

                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.login_particles_color3 && settings.login_particles_color3.startsWith("#") ? settings.login_particles_color3 : "#ffffff"}
                    onChange={(e) => debouncedUpdate({ login_particles_color3: e.target.value })}
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    defaultValue={settings.login_particles_color3 || ""}
                    onChange={(e) => debouncedUpdate({ login_particles_color3: e.target.value || null })}
                    placeholder="Cor 3 (Opcional)"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Quantidade
                </Label>
                <span className="text-sm font-medium">{settings.login_particles_count}</span>
              </div>
              <Slider
                value={[settings.login_particles_count]}
                min={0}
                max={300}
                step={10}
                onValueChange={(vals) => debouncedUpdate({ login_particles_count: vals[0] })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Velocidade
                </Label>
                <span className="text-sm font-medium">{settings.login_particles_speed.toFixed(1)}x</span>
              </div>
              <Slider
                value={[settings.login_particles_speed]}
                min={0.1}
                max={5}
                step={0.1}
                onValueChange={(vals) => debouncedUpdate({ login_particles_speed: vals[0] })}
              />
            </div>

            <Button
              onClick={handleParticleReset}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Resetar para Padrão
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorPlay className="w-5 h-5" />
            Logo de Transição
          </CardTitle>
          <CardDescription>
            Personalize a logo que aparece durante a animação de login e logout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-full sm:w-48 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center overflow-hidden bg-muted relative">
              {settings.transition_logo_url ? (
                <img 
                  src={settings.transition_logo_url} 
                  alt="Logo de transição" 
                  className="max-w-[80%] max-h-[80%] object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <MonitorPlay className="w-8 h-8" />
                  <span className="text-xs">Logo Padrão</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <input
                ref={transitionLogoInputRef}
                type="file"
                accept="image/*"
                onChange={handleTransitionLogoUpload}
                className="hidden"
              />
              
              <Button
                onClick={() => transitionLogoInputRef.current?.click()}
                disabled={isUploadingTransitionLogo}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {isUploadingTransitionLogo ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload de Logo
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleResetTransitionLogo}
                disabled={!settings.transition_logo_url || isUploadingTransitionLogo}
                variant="ghost"
                className="w-full sm:w-auto text-muted-foreground"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Voltar ao Padrão
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5" />
            Imagem de Carregamento
          </CardTitle>
          <CardDescription>
            Personalize a imagem exibida enquanto as páginas do sistema estão carregando.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-full sm:w-48 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center overflow-hidden bg-muted relative">
              {settings.page_loading_img_url ? (
                <img 
                  src={settings.page_loading_img_url} 
                  alt="Imagem de carregamento" 
                  className="max-w-[80%] max-h-[80%] object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-xs">Padrão do Sistema</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <input
                ref={loadingImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleLoadingImageUpload}
                className="hidden"
              />
              
              <Button
                onClick={() => loadingImageInputRef.current?.click()}
                disabled={isUploadingLoadingImage}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {isUploadingLoadingImage ? (
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
                onClick={handleResetLoadingImage}
                disabled={!settings.page_loading_img_url || isUploadingLoadingImage}
                variant="ghost"
                className="w-full sm:w-auto text-muted-foreground"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Voltar ao Padrão
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
