import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NeonAvatar } from "@/components/ui/NeonAvatar";
import { Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const FRAME_COLORS = [
  "#ffffff", "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e",
  "#a855f7", "#14b8a6", "#64748b", "#d4af37",
];

const NEON_COLORS = [
  "#ff0000", "#ff4500", "#ff8c00", "#ffd700", "#00ff00",
  "#00ffff", "#0080ff", "#0000ff", "#8000ff", "#ff00ff",
  "#ff1493", "#00ff80", "#ffffff", "#ff6ec7",
];

interface NeonFramePickerProps {
  userId: string;
  avatarUrl: string | null;
  fullName: string;
  currentFrameColor: string | null;
  currentNeonColor: string | null;
}

export function NeonFramePicker({
  userId,
  avatarUrl,
  fullName,
  currentFrameColor,
  currentNeonColor,
}: NeonFramePickerProps) {
  const [frameColor, setFrameColor] = useState<string | null>(currentFrameColor);
  const [neonColor, setNeonColor] = useState<string | null>(currentNeonColor);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const hasChanges =
    frameColor !== currentFrameColor || neonColor !== currentNeonColor;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          frame_color: frameColor,
          neon_color: neonColor,
        })
        .eq("user_id", userId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast.success("Moldura atualizada com sucesso!");
    } catch {
      toast.error("Erro ao salvar moldura");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Moldura Neon
        </CardTitle>
        <CardDescription>
          Personalize a moldura e o brilho neon ao redor da sua foto de perfil.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Preview */}
        <div className="flex justify-center py-4 bg-muted/30 rounded-xl">
          <NeonAvatar
            src={avatarUrl}
            name={fullName || "U"}
            frameColor={frameColor}
            neonColor={neonColor}
            size="lg"
          />
        </div>

        {/* Frame Color */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Cor da Moldura</Label>
            {frameColor && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground"
                onClick={() => setFrameColor(null)}
              >
                <X className="w-3 h-3 mr-1" />
                Remover
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {FRAME_COLORS.map((color) => (
              <button
                key={`frame-${color}`}
                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                  frameColor === color
                    ? "border-foreground scale-110 ring-2 ring-foreground/20"
                    : "border-border"
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setFrameColor(color)}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Neon Glow Color */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Cor do Brilho Neon</Label>
            {neonColor && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground"
                onClick={() => setNeonColor(null)}
              >
                <X className="w-3 h-3 mr-1" />
                Remover
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {NEON_COLORS.map((color) => (
              <button
                key={`neon-${color}`}
                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                  neonColor === color
                    ? "border-foreground scale-110 ring-2 ring-foreground/20"
                    : "border-border"
                }`}
                style={{
                  backgroundColor: color,
                  boxShadow: `0 0 8px ${color}`,
                }}
                onClick={() => setNeonColor(color)}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="w-full"
        >
          {isSaving ? "Salvando..." : "Salvar Moldura"}
        </Button>
      </CardContent>
    </Card>
  );
}
