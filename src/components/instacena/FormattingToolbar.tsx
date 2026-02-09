import { Bold, Italic, Underline, Highlighter, Sparkles, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface FormattingToolbarProps {
  onFormat: (prefix: string, suffix: string) => void;
}

const HIGHLIGHT_COLORS = [
  { label: "Amarelo", value: "yellow", bg: "bg-yellow-400", preview: "bg-yellow-100 dark:bg-yellow-900/40" },
  { label: "Verde", value: "green", bg: "bg-green-400", preview: "bg-green-100 dark:bg-green-900/40" },
  { label: "Azul", value: "blue", bg: "bg-blue-400", preview: "bg-blue-100 dark:bg-blue-900/40" },
  { label: "Rosa", value: "pink", bg: "bg-pink-400", preview: "bg-pink-100 dark:bg-pink-900/40" },
  { label: "Roxo", value: "purple", bg: "bg-purple-400", preview: "bg-purple-100 dark:bg-purple-900/40" },
  { label: "Laranja", value: "orange", bg: "bg-orange-400", preview: "bg-orange-100 dark:bg-orange-900/40" },
];

const FONT_STYLES = [
  { label: "Normal", value: "normal" },
  { label: "Serifada", value: "serif" },
  { label: "Monoespaçada", value: "mono" },
  { label: "Cursiva", value: "cursive" },
];

export function FormattingToolbar({ onFormat }: FormattingToolbarProps) {
  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {/* Bold */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onFormat("**", "**")}
        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
        title="Negrito"
      >
        <Bold className="h-3.5 w-3.5" />
      </Button>

      {/* Italic */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onFormat("_", "_")}
        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
        title="Itálico"
      >
        <Italic className="h-3.5 w-3.5" />
      </Button>

      {/* Underline */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onFormat("__", "__")}
        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
        title="Sublinhado"
      >
        <Underline className="h-3.5 w-3.5" />
      </Button>

      {/* Highlight Colors */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Destacar com cor"
          >
            <Highlighter className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="top" align="start">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Cor de destaque</p>
          <div className="flex gap-1.5">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => onFormat(`{color:${color.value}}`, "{/color}")}
                className={`h-6 w-6 rounded-full ${color.bg} hover:scale-110 transition-transform border border-border/50`}
                title={color.label}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Glow Effect */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onFormat("{glow}", "{/glow}")}
        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
        title="Efeito brilho"
      >
        <Sparkles className="h-3.5 w-3.5" />
      </Button>

      {/* Font Style */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Estilo de fonte"
          >
            <Type className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="top" align="start">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Estilo de fonte</p>
          <div className="flex flex-col gap-1">
            {FONT_STYLES.map((font) => (
              <button
                key={font.value}
                onClick={() => onFormat(`{font:${font.value}}`, "{/font}")}
                className={`text-left px-2 py-1 rounded text-sm hover:bg-muted transition-colors ${
                  font.value === "serif" ? "font-serif" :
                  font.value === "mono" ? "font-mono" :
                  font.value === "cursive" ? "italic" :
                  ""
                }`}
              >
                {font.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
