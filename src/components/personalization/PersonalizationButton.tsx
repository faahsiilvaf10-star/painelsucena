import { Palette, Volume2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useUserPreferences, NOTIFICATION_SOUNDS } from "@/hooks/useUserPreferences";
import { toast } from "sonner";
import { useState } from "react";

export function PersonalizationButton() {
  const { preferences, updatePreferences, playNotificationSound } = useUserPreferences();
  const [open, setOpen] = useState(false);

  const handleColorChange = async (key: string, value: string) => {
    try {
      await updatePreferences.mutateAsync({ [key]: value });
    } catch (error) {
      console.error("Error updating preference:", error);
      toast.error("Erro ao salvar preferência");
    }
  };

  const handleSoundChange = async (value: string) => {
    try {
      await updatePreferences.mutateAsync({ notification_sound: value });
      toast.success("Som de notificação alterado!");
    } catch (error) {
      console.error("Error updating sound preference:", error);
      toast.error("Erro ao salvar preferência");
    }
  };

  const handleTestSound = (soundId: string) => {
    playNotificationSound(soundId);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Palette className="h-5 w-5" />
          <span className="sr-only">Personalizar</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">Personalização</h4>
          </div>
          
          <Separator />
          
          {/* Color Settings */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Cores</Label>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sidebar_color" className="text-xs text-muted-foreground">
                  Barra lateral
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    id="sidebar_color"
                    type="color"
                    value={preferences.sidebar_color}
                    onChange={(e) => handleColorChange("sidebar_color", e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-input"
                  />
                  <span className="text-xs text-muted-foreground font-mono">
                    {preferences.sidebar_color}
                  </span>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="sidebar_font_color" className="text-xs text-muted-foreground">
                  Fonte lateral
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    id="sidebar_font_color"
                    type="color"
                    value={preferences.sidebar_font_color}
                    onChange={(e) => handleColorChange("sidebar_font_color", e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-input"
                  />
                  <span className="text-xs text-muted-foreground font-mono">
                    {preferences.sidebar_font_color}
                  </span>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="active_tab_color" className="text-xs text-muted-foreground">
                  Aba selecionada
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    id="active_tab_color"
                    type="color"
                    value={preferences.active_tab_color}
                    onChange={(e) => handleColorChange("active_tab_color", e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-input"
                  />
                  <span className="text-xs text-muted-foreground font-mono">
                    {preferences.active_tab_color}
                  </span>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="page_background_color" className="text-xs text-muted-foreground">
                  Fundo da página
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    id="page_background_color"
                    type="color"
                    value={preferences.page_background_color}
                    onChange={(e) => handleColorChange("page_background_color", e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-input"
                  />
                  <span className="text-xs text-muted-foreground font-mono">
                    {preferences.page_background_color}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Sound Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              <Label className="text-sm font-medium">Som de Notificação</Label>
            </div>
            
            <RadioGroup
              value={preferences.notification_sound}
              onValueChange={handleSoundChange}
              className="space-y-2"
            >
              {NOTIFICATION_SOUNDS.map((sound) => (
                <div key={sound.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={sound.id} id={sound.id} />
                    <Label htmlFor={sound.id} className="text-sm cursor-pointer">
                      {sound.label}
                    </Label>
                  </div>
                  {sound.file && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => handleTestSound(sound.id)}
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </RadioGroup>
          </div>
          
          <Separator />
          
          {/* Reset Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={async () => {
              try {
                await updatePreferences.mutateAsync({
                  sidebar_color: "#1e2235",
                  sidebar_font_color: "#f8fafc",
                  active_tab_color: "#f5a524",
                  page_background_color: "#0f1419",
                  notification_sound: "default",
                });
                toast.success("Preferências restauradas!");
              } catch (error) {
                toast.error("Erro ao restaurar preferências");
              }
            }}
          >
            Restaurar padrões
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
