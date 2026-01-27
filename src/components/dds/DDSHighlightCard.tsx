import { useState, useRef } from "react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sun, Calendar, Camera, Upload, Loader2, ArrowRight, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SunBorderAvatar } from "./SunBorderAvatar";
import { useTodayDDS, useTomorrowDDS, useUpdateDDSPhoto } from "@/hooks/useDDSSchedule";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getBrazilNorthDate } from "@/lib/timezone";

export const DDSHighlightCard = () => {
  const { data: todayDDS, isLoading: loadingToday } = useTodayDDS();
  const { data: tomorrowDDS, isLoading: loadingTomorrow } = useTomorrowDDS();
  const { data: profile } = useProfile();
  const { isAdmin } = useIsAdmin();
  const updatePhoto = useUpdateDDSPhoto();

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use Brazil North timezone
  const today = getBrazilNorthDate();
  const tomorrow = addDays(today, 1);

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
      <Card className="overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800">
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
                    <SunBorderAvatar
                      src={todayDDS.presenter.avatar_url}
                      name={todayDDS.presenter.full_name || "Palestrante"}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg truncate">
                        {todayDDS.presenter.full_name || "Palestrante"}
                      </h3>
                      <p className="text-sm text-muted-foreground capitalize">
                        {todayDDS.presenter.cargo?.replace(/_/g, " ")}
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
              <div className="p-3 bg-white/60 dark:bg-black/20 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Tema do dia</p>
                <p className="font-semibold text-amber-800 dark:text-amber-200">
                  📋 {todayDDS.theme}
                </p>
              </div>

              {/* Photo Section */}
              {todayDDS.photo_url ? (
                <div className="relative rounded-lg overflow-hidden">
                  <img
                    src={todayDDS.photo_url}
                    alt="Foto do DDS de hoje"
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute bottom-2 right-2">
                    <span className="px-2 py-1 bg-black/50 text-white text-xs rounded-full">
                      📸 Foto do dia
                    </span>
                  </div>
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
      <Card className="overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
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
                    <Avatar className="h-16 w-16 border-4 border-blue-200 dark:border-blue-700">
                      <AvatarImage src={tomorrowDDS.presenter.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-lg font-bold">
                        {getInitials(tomorrowDDS.presenter.full_name || "P")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg truncate">
                        {tomorrowDDS.presenter.full_name || "Palestrante"}
                      </h3>
                      <p className="text-sm text-muted-foreground capitalize">
                        {tomorrowDDS.presenter.cargo?.replace(/_/g, " ")}
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
              <div className="p-3 bg-white/60 dark:bg-black/20 rounded-lg">
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
    </div>
  );
};
