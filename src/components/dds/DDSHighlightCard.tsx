import { useState, useRef, useMemo } from "react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sun, Calendar, Camera, Upload, Loader2, ArrowRight, UserPlus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NeonAvatar } from "@/components/ui/NeonAvatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SunBorderAvatar } from "./SunBorderAvatar";
import { useTodayDDS, useTomorrowDDS, useUpdateDDSPhoto } from "@/hooks/useDDSSchedule";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getBrazilNorthDate } from "@/lib/timezone";
import { formatCargoLabel } from "@/lib/cargoUtils";
import { useDDSMidnightRefresh } from "@/hooks/useMidnightRefresh";

export const DDSHighlightCard = () => {
  const { data: todayDDS, isLoading: loadingToday } = useTodayDDS();
  const { data: tomorrowDDS, isLoading: loadingTomorrow } = useTomorrowDDS();
  const { data: profile } = useProfile();
  const { isAdmin } = useIsAdmin();
  const updatePhoto = useUpdateDDSPhoto();

  // Hook to refresh DDS data at midnight (00:00 Pará time)
  // Returns a key that changes when midnight occurs, forcing re-render
  const dateKey = useDDSMidnightRefresh();

  const [isUploading, setIsUploading] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use Brazil North timezone - recalculate when dateKey changes
  const today = useMemo(() => getBrazilNorthDate(), [dateKey]);
  const tomorrow = useMemo(() => addDays(getBrazilNorthDate(), 1), [dateKey]);

  // Check if user can upload photo (tecnico_seguranca or admin)
  const isTecnicoSeguranca = profile?.cargo === "tecnico_seguranca_i" || profile?.cargo === "tecnico_seguranca_ii";
  const canUploadPhoto = isAdmin || isTecnicoSeguranca;

  const getInitials = (name: string) => {
    const names = name.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !todayDDS) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `dds-${todayDDS.scheduled_date}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("site-assets")
        .getPublicUrl(fileName);

      await updatePhoto.mutateAsync({
        id: todayDDS.id,
        photo_url: urlData.publicUrl,
      });

      toast.success("Foto do DDS adicionada com sucesso!");
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Erro ao fazer upload da foto");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (loadingToday && loadingTomorrow) {
    return (
      <Card className="mb-6">
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!todayDDS && !tomorrowDDS) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Today's DDS */}
      <Card className="overflow-hidden backdrop-blur-xl bg-gradient-to-br from-amber-100/40 to-orange-100/30 dark:from-amber-900/15 dark:to-orange-900/10 border border-amber-200/40 dark:border-amber-700/30 shadow-[0_4px_30px_-6px_hsl(38_90%_50%/0.15)] dark:shadow-[0_4px_30px_-6px_hsl(38_90%_50%/0.1)]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sun className="h-5 w-5 text-amber-500" />
            DDS de Hoje
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayDDS ? (
            <div className="space-y-4">
              {/* Presenter Info */}
              <div className="flex items-center gap-4">
                {todayDDS.presenter ? (
                  <>
                    <NeonAvatar
                      src={todayDDS.presenter.avatar_url}
                      name={todayDDS.presenter.full_name || "Palestrante"}
                      frameColor={todayDDS.presenter.frame_color}
                      neonColor={todayDDS.presenter.neon_color}
                      frameAnimation={todayDDS.presenter.frame_animation}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg truncate">
                        {todayDDS.presenter.full_name || "Palestrante"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {formatCargoLabel(todayDDS.presenter.cargo)}
                      </p>
                    </div>
                  </>
                ) : todayDDS.external_presenter_name ? (
                  <>
                    <Avatar className="h-16 w-16 border-4 border-amber-200 dark:border-amber-700">
                      <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-lg font-bold">
                        {getInitials(todayDDS.external_presenter_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg truncate">
                        {todayDDS.external_presenter_name}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <UserPlus className="h-3 w-3" />
                        Palestrante externo
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate text-muted-foreground">
                      Palestrante não definido
                    </h3>
                  </div>
                )}
              </div>

              {/* Theme */}
              <div className="p-3 bg-white/40 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-amber-200/30 dark:border-amber-700/20">
                <p className="text-sm text-muted-foreground mb-1">Tema do dia</p>
                <p className="font-semibold text-amber-800 dark:text-amber-200">
                  📋 {todayDDS.theme}
                </p>
              </div>

              {/* Photo Section */}
              {todayDDS.photo_url ? (
                <div className="relative rounded-lg overflow-hidden group">
                  <div 
                    className="cursor-pointer"
                    onClick={() => setPhotoModalOpen(true)}
                  >
                    <img
                      src={todayDDS.photo_url}
                      alt="Foto do DDS de hoje"
                      className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-full">
                        Clique para ampliar
                      </span>
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 flex items-center gap-2">
                    <span className="px-2 py-1 bg-black/50 text-white text-xs rounded-full">
                      📸 Foto do dia
                    </span>
                  </div>
                  {canUploadPhoto && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm("Tem certeza que deseja remover a foto do DDS?")) {
                          try {
                            await updatePhoto.mutateAsync({
                              id: todayDDS.id,
                              photo_url: null,
                            });
                            toast.success("Foto removida com sucesso!");
                          } catch (error) {
                            console.error("Error removing photo:", error);
                            toast.error("Erro ao remover a foto");
                          }
                        }
                      }}
                      title="Remover foto"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : canUploadPhoto ? (
                <div className="border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-lg p-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="dds-photo-upload"
                  />
                  <label
                    htmlFor="dds-photo-upload"
                    className="flex flex-col items-center gap-2 cursor-pointer"
                  >
                    {isUploading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                    ) : (
                      <Camera className="h-8 w-8 text-amber-500" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {isUploading ? "Enviando..." : "Adicionar foto do DDS"}
                    </span>
                  </label>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum DDS agendado para hoje</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tomorrow's DDS */}
      <Card className="overflow-hidden backdrop-blur-xl bg-gradient-to-br from-blue-100/40 to-indigo-100/30 dark:from-blue-900/15 dark:to-indigo-900/10 border border-blue-200/40 dark:border-blue-700/30 shadow-[0_4px_30px_-6px_hsl(220_80%_50%/0.15)] dark:shadow-[0_4px_30px_-6px_hsl(220_80%_50%/0.1)]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowRight className="h-5 w-5 text-blue-500" />
            DDS de Amanhã
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {format(tomorrow, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
            {tomorrowDDS ? (
            <div className="space-y-4">
              {/* Presenter Info */}
              <div className="flex items-center gap-4">
                {tomorrowDDS.presenter ? (
                  <>
                    <NeonAvatar
                      src={tomorrowDDS.presenter.avatar_url}
                      name={tomorrowDDS.presenter.full_name || "Palestrante"}
                      frameColor={tomorrowDDS.presenter.frame_color}
                      neonColor={tomorrowDDS.presenter.neon_color}
                      frameAnimation={tomorrowDDS.presenter.frame_animation}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg truncate">
                        {tomorrowDDS.presenter.full_name || "Palestrante"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {formatCargoLabel(tomorrowDDS.presenter.cargo)}
                      </p>
                    </div>
                  </>
                ) : tomorrowDDS.external_presenter_name ? (
                  <>
                    <Avatar className="h-16 w-16 border-4 border-blue-200 dark:border-blue-700">
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-lg font-bold">
                        {getInitials(tomorrowDDS.external_presenter_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg truncate">
                        {tomorrowDDS.external_presenter_name}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <UserPlus className="h-3 w-3" />
                        Palestrante externo
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate text-muted-foreground">
                      Palestrante não definido
                    </h3>
                  </div>
                )}
              </div>

              {/* Theme */}
              <div className="p-3 bg-white/40 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-blue-200/30 dark:border-blue-700/20">
                <p className="text-sm text-muted-foreground mb-1">Tema agendado</p>
                <p className="font-semibold text-blue-800 dark:text-blue-200">
                  📋 {tomorrowDDS.theme}
                </p>
              </div>

              {/* Preview notice */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                  Próximo
                </span>
                <span>Prepare-se para o DDS de amanhã!</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum DDS agendado para amanhã</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Modal */}
      <Dialog open={photoModalOpen} onOpenChange={setPhotoModalOpen}>
        <DialogContent className="max-w-4xl w-full p-0 bg-black/95 border-none">
          <DialogTitle className="sr-only">Foto do DDS de Hoje</DialogTitle>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
              onClick={() => setPhotoModalOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            {todayDDS?.photo_url && (
              <img
                src={todayDDS.photo_url}
                alt="Foto do DDS de hoje"
                className="w-full max-h-[80vh] object-contain"
              />
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <p className="text-white text-center">
                <span className="font-semibold">{format(today, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                {todayDDS?.theme && (
                  <span className="block text-sm text-white/80 mt-1">📋 {todayDDS.theme}</span>
                )}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
