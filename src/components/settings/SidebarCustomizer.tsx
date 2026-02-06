import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PanelLeft, Check, RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarCustomizerProps {
  userId: string;
  currentSidebarColor?: string | null;
  currentSidebarAnimation?: string | null;
}

const SIDEBAR_COLORS = [
  { id: "default", label: "Padrão", color: null },
  { id: "dark-blue", label: "Azul Escuro", color: "hsl(220, 40%, 13%)" },
  { id: "navy", label: "Marinho", color: "hsl(225, 50%, 10%)" },
  { id: "dark-green", label: "Verde Escuro", color: "hsl(150, 40%, 10%)" },
  { id: "dark-purple", label: "Roxo Escuro", color: "hsl(270, 40%, 12%)" },
  { id: "dark-red", label: "Vinho", color: "hsl(350, 40%, 12%)" },
  { id: "charcoal", label: "Carvão", color: "hsl(0, 0%, 12%)" },
  { id: "midnight", label: "Meia-noite", color: "hsl(230, 50%, 8%)" },
  { id: "forest", label: "Floresta", color: "hsl(140, 50%, 8%)" },
  { id: "ocean", label: "Oceano", color: "hsl(200, 60%, 10%)" },
  { id: "coffee", label: "Café", color: "hsl(30, 40%, 12%)" },
  { id: "slate", label: "Ardósia", color: "hsl(210, 20%, 18%)" },
];

const SIDEBAR_ANIMATIONS = [
  { id: "none", label: "Nenhuma", emoji: "⬛" },
  { id: "particles", label: "Partículas", emoji: "✨" },
  { id: "stars", label: "Estrelas", emoji: "⭐" },
  { id: "rain", label: "Chuva", emoji: "🌧️" },
  { id: "fireflies", label: "Vagalumes", emoji: "🔥" },
  { id: "snow", label: "Neve", emoji: "❄️" },
  { id: "matrix", label: "Matrix", emoji: "💚" },
];

export const SidebarCustomizer = ({
  userId,
  currentSidebarColor,
  currentSidebarAnimation,
}: SidebarCustomizerProps) => {
  const [selectedColor, setSelectedColor] = useState<string | null>(currentSidebarColor || null);
  const [selectedAnimation, setSelectedAnimation] = useState<string | null>(currentSidebarAnimation || "particles");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          sidebar_color: selectedColor,
          sidebar_animation: selectedAnimation,
        })
        .eq("user_id", userId);

      if (error) throw error;
      toast.success("Personalização da sidebar salva!");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setSelectedColor(null);
    setSelectedAnimation("particles");
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          sidebar_color: null,
          sidebar_animation: "particles",
        })
        .eq("user_id", userId);

      if (error) throw error;
      toast.success("Sidebar restaurada ao padrão!");
    } catch (error: any) {
      toast.error("Erro ao restaurar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PanelLeft className="w-5 h-5" />
          Personalizar Sidebar
        </CardTitle>
        <CardDescription>
          Escolha a cor e animação de fundo da barra lateral.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Color Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Cor de Fundo</Label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {SIDEBAR_COLORS.map((preset) => {
              const isSelected = preset.color === selectedColor;
              return (
                <button
                  key={preset.id}
                  onClick={() => setSelectedColor(preset.color)}
                  className={cn(
                    "relative w-full aspect-square rounded-lg border-2 transition-all duration-200 hover:scale-105",
                    isSelected
                      ? "border-primary ring-2 ring-primary/30 scale-105"
                      : "border-border hover:border-primary/50"
                  )}
                  style={{
                    background: preset.color || "radial-gradient(ellipse at 50% 50%, hsl(220, 10%, 25%), hsl(0, 0%, 0%))",
                  }}
                  title={preset.label}
                >
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white drop-shadow-md" />
                    </div>
                  )}
                  <span className="absolute bottom-0.5 left-0 right-0 text-[9px] text-white/80 text-center truncate px-0.5">
                    {preset.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Animation Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            Animação de Fundo
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SIDEBAR_ANIMATIONS.map((anim) => {
              const isSelected = selectedAnimation === anim.id;
              return (
                <button
                  key={anim.id}
                  onClick={() => setSelectedAnimation(anim.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all text-sm",
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="text-base">{anim.emoji}</span>
                  <span className="font-medium">{anim.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Preview</Label>
          <div
            className="relative w-full h-24 rounded-lg overflow-hidden border border-border"
            style={{
              background: selectedColor || "radial-gradient(ellipse 80% 60% at 50% 50%, hsl(220, 10%, 25%) 0%, hsl(220, 12%, 18%) 25%, hsl(220, 15%, 12%) 50%, hsl(220, 18%, 6%) 75%, hsl(0, 0%, 0%) 100%)",
            }}
          >
            {selectedAnimation && selectedAnimation !== "none" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white/40 text-xs">
                  {SIDEBAR_ANIMATIONS.find(a => a.id === selectedAnimation)?.emoji}{" "}
                  {SIDEBAR_ANIMATIONS.find(a => a.id === selectedAnimation)?.label}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isSaving} className="flex-1">
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Salvar
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Resetar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
