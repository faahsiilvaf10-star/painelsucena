import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { SlideData } from "@/hooks/usePresentations";
import { useState } from "react";
import { toast } from "sonner";

interface ExportPptxButtonProps {
  slides: SlideData[];
  title: string;
}

export function ExportPptxButton({ slides, title }: ExportPptxButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (slides.length === 0) return;
    setIsExporting(true);

    try {
      const PptxGenJS = (await import("pptxgenjs")).default;
      const pptx = new PptxGenJS();
      pptx.title = title;
      pptx.author = "OpsHub";
      pptx.layout = "LAYOUT_WIDE";

      for (const slide of slides) {
        const pptSlide = pptx.addSlide();

        // Background
        pptSlide.background = { fill: "1a1a2e" };

        switch (slide.layout) {
          case "title":
            pptSlide.addText(slide.title, {
              x: 1,
              y: 1.5,
              w: "80%",
              h: 1.5,
              fontSize: 36,
              bold: true,
              color: "ffffff",
              align: "center",
            });
            pptSlide.addText(stripMarkdown(slide.content), {
              x: 1,
              y: 3.2,
              w: "80%",
              h: 1.5,
              fontSize: 18,
              color: "cccccc",
              align: "center",
            });
            break;

          case "stats":
            pptSlide.addText(slide.title, {
              x: 0.5,
              y: 0.3,
              w: "90%",
              h: 0.8,
              fontSize: 28,
              bold: true,
              color: "ffffff",
            });
            slide.stats?.forEach((s, i) => {
              const col = i % 3;
              const row = Math.floor(i / 3);
              pptSlide.addText(
                [
                  { text: s.value + "\n", options: { fontSize: 28, bold: true, color: "4fc3f7" } },
                  { text: s.label, options: { fontSize: 12, color: "cccccc" } },
                ],
                {
                  x: 0.5 + col * 3.3,
                  y: 1.5 + row * 2,
                  w: 3,
                  h: 1.5,
                  align: "center",
                  fill: { color: "2a2a4e" },
                  shape: "roundRect" as any,
                  rectRadius: 0.1,
                }
              );
            });
            break;

          case "quote":
            pptSlide.addText(slide.title, {
              x: 0.5,
              y: 0.3,
              w: "90%",
              h: 0.8,
              fontSize: 24,
              bold: true,
              color: "ffffff",
            });
            if (slide.quote) {
              pptSlide.addText(`"${slide.quote.text}"`, {
                x: 1,
                y: 1.8,
                w: "80%",
                h: 2,
                fontSize: 20,
                italic: true,
                color: "e0e0e0",
              });
              pptSlide.addText(`— ${slide.quote.author}`, {
                x: 1,
                y: 4,
                w: "80%",
                h: 0.5,
                fontSize: 14,
                color: "999999",
              });
            }
            break;

          default: // content, two-column, image
            pptSlide.addText(slide.title, {
              x: 0.5,
              y: 0.3,
              w: "90%",
              h: 0.8,
              fontSize: 28,
              bold: true,
              color: "ffffff",
            });
            pptSlide.addText(stripMarkdown(slide.content), {
              x: 0.5,
              y: 1.3,
              w: "90%",
              h: 3.5,
              fontSize: 16,
              color: "dddddd",
              valign: "top",
              paraSpaceAfter: 8,
            });
            break;
        }

        // Slide number
        pptSlide.addText(`${slides.indexOf(slide) + 1}/${slides.length}`, {
          x: "90%",
          y: "92%",
          w: 0.8,
          h: 0.3,
          fontSize: 10,
          color: "666666",
          align: "right",
        });
      }

      await pptx.writeFile({ fileName: `${title.replace(/[^a-zA-Z0-9]/g, "_")}.pptx` });
      toast.success("PowerPoint exportado com sucesso!");
    } catch (err: any) {
      console.error("Export error:", err);
      toast.error("Erro ao exportar: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={isExporting || slides.length === 0} variant="outline" size="sm">
      {isExporting ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Download className="w-4 h-4 mr-2" />
      )}
      Exportar PPTX
    </Button>
  );
}

function stripMarkdown(md: string): string {
  return md
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/^[-*+]\s/gm, "• ")
    .trim();
}
