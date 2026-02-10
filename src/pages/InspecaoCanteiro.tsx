import { useState, useRef, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Lock, Unlock, Trash2, CheckCircle2, Circle, ClipboardCheck, Camera, X, CalendarIcon, Filter, History, FileDown, MessageSquare, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import pptxgen from "pptxgenjs";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRole";
import {
  useSiteInspections,
  useSiteInspectionTasks,
  useCreateSiteInspection,
  useToggleLockInspection,
  useToggleTaskCompletion,
  useDeleteSiteInspection,
  useUpdateTaskPhoto,
  useUpdateTaskObservation,
  uploadInspectionPhoto,
  type SiteInspectionTask,
} from "@/hooks/useSiteInspections";
import Layout from "@/components/layout/Layout";

function PhotoThumbnail({
  url,
  type,
  onUpload,
  disabled,
}: {
  url: string | null;
  type: "before" | "after";
  onUpload: (file: File) => void;
  disabled?: boolean;
}) {
  const [viewOpen, setViewOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const emoji = type === "before" ? "❌" : "✅";
  const label = type === "before" ? "Antes" : "Depois";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Arquivo muito grande (máx. 10MB)");
        return;
      }
      onUpload(file);
    }
    e.target.value = "";
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {url ? (
        <button
          onClick={() => setViewOpen(true)}
          className="relative w-16 h-16 rounded-lg overflow-hidden border border-border/50 group flex-shrink-0"
        >
          <img src={url} alt={label} className="w-full h-full object-cover" />
          <span className="absolute top-0.5 right-0.5 text-base leading-none drop-shadow-md">{emoji}</span>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        </button>
      ) : (
        <button
          onClick={() => !disabled && inputRef.current?.click()}
          disabled={disabled}
          className={cn(
            "w-16 h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-0.5 flex-shrink-0 transition-colors",
            disabled
              ? "border-muted opacity-40 cursor-not-allowed"
              : "border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
          )}
        >
          <Camera className="h-4 w-4 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">{label}</span>
          <span className="text-xs leading-none">{emoji}</span>
        </button>
      )}

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
          <div className="relative flex items-center justify-center">
            {url && (
              <img src={url} alt={label} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
            )}
            <span className="absolute top-2 left-2 text-3xl drop-shadow-lg">{emoji}</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TaskRow({
  task,
  isLocked,
  onToggle,
}: {
  task: SiteInspectionTask;
  isLocked: boolean;
  onToggle: () => void;
}) {
  const updatePhoto = useUpdateTaskPhoto();
  const updateObservation = useUpdateTaskObservation();
  const [uploading, setUploading] = useState<"before" | "after" | null>(null);
  const [showObsInput, setShowObsInput] = useState(false);
  const [obsValue, setObsValue] = useState(task.observation || "");

  const handleUpload = async (file: File, type: "before" | "after") => {
    setUploading(type);
    try {
      const url = await uploadInspectionPhoto(file, task.id, type);
      const field = type === "before" ? "before_photo_url" : "after_photo_url";
      await updatePhoto.mutateAsync({ id: task.id, field, url });
      toast.success(`Foto "${type === "before" ? "Antes" : "Depois"}" enviada!`);
    } catch {
      toast.error("Erro ao enviar foto.");
    } finally {
      setUploading(null);
    }
  };

  const handleSaveObservation = () => {
    const trimmed = obsValue.trim();
    updateObservation.mutate(
      { id: task.id, observation: trimmed || null },
      {
        onSuccess: () => {
          setShowObsInput(false);
          toast.success("Observação salva!");
        },
      }
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-3 rounded-xl transition-colors border border-transparent",
        task.is_completed ? "bg-primary/5 border-primary/10" : "hover:bg-muted/30"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox area */}
        <button
          onClick={onToggle}
          disabled={!isLocked}
          className={cn(
            "mt-0.5 flex-shrink-0",
            !isLocked && "opacity-40 cursor-not-allowed"
          )}
        >
          {task.is_completed ? (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        {/* Description + photos */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <span className={cn("text-sm block flex-1", task.is_completed && "line-through text-muted-foreground")}>
              {task.description}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => setShowObsInput(!showObsInput)}
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Observation display (highlighted) */}
          {task.observation && !showObsInput && (
            <button
              onClick={() => setShowObsInput(true)}
              className="text-left w-full"
            >
              <span
                className="text-sm px-1 py-0.5 rounded"
                style={{
                  background: "linear-gradient(to bottom, transparent 40%, rgba(250, 204, 21, 0.45) 40%)",
                }}
              >
                {task.observation}
              </span>
            </button>
          )}

          {/* Observation input */}
          {showObsInput && (
            <div className="space-y-1.5">
              <Textarea
                placeholder="Observação..."
                value={obsValue}
                onChange={(e) => setObsValue(e.target.value)}
                className="min-h-[60px] text-sm"
                rows={2}
              />
              <div className="flex gap-1.5">
                <Button size="sm" className="h-7 text-xs" onClick={handleSaveObservation} disabled={updateObservation.isPending}>
                  Salvar
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setShowObsInput(false); setObsValue(task.observation || ""); }}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Photo row */}
          <div className="flex items-center gap-2">
            <PhotoThumbnail
              url={task.before_photo_url}
              type="before"
              onUpload={(f) => handleUpload(f, "before")}
              disabled={!!uploading}
            />
            <PhotoThumbnail
              url={task.after_photo_url}
              type="after"
              onUpload={(f) => handleUpload(f, "after")}
              disabled={!!uploading}
            />
            {uploading && (
              <span className="text-xs text-muted-foreground animate-pulse">Enviando...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

async function fetchLogoBase64(): Promise<string> {
  try {
    const response = await fetch("/logo-sucena-empreendimentos.png");
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

function addSlideBranding(slide: any, logoBase64: string, slideNum: number, totalSlides: number) {
  // Logo top-left on every slide
  if (logoBase64) {
    slide.addImage({
      data: logoBase64,
      x: 0.3, y: 0.2, w: 1.6, h: 0.5,
      sizing: { type: "contain", w: 1.6, h: 0.5 },
    });
  }
  // Green accent bar top-right
  slide.addShape("rect", { x: 11.8, y: 0, w: 1.53, h: 0.8, fill: { color: "3B7A3B" } });
  // Footer
  slide.addText(`${slideNum}/${totalSlides}`, {
    x: 12, y: 7, w: 1, h: 0.3,
    fontSize: 8, color: "94A3B8", align: "right",
  });
  slide.addText("Sucena Empreendimentos © " + new Date().getFullYear(), {
    x: 0.3, y: 7, w: 5, h: 0.3,
    fontSize: 7, color: "94A3B8",
  });
}

async function generateInspectionPptx(inspectionDate: string, tasks: SiteInspectionTask[]) {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Sucena Empreendimentos";
  pptx.company = "Sucena Empreendimentos";
  pptx.title = `Inspeção de Canteiro - ${inspectionDate}`;

  const logoBase64 = await fetchLogoBase64();

  const detailCount = tasks.filter(t => t.before_photo_url || t.after_photo_url).length;
  const totalSlides = 3 + detailCount;

  let slideNum = 0;

  // ===== TITLE SLIDE (split layout like reference) =====
  slideNum++;
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: "FFFFFF" };
  // Left half - green background
  titleSlide.addShape("rect", { x: 0, y: 0, w: 6.5, h: 7.5, fill: { color: "2D6A2D" } });
  // Diagonal cut on green (white triangle)
  titleSlide.addShape("rtTriangle" as any, { x: 5.5, y: 0, w: 1.5, h: 7.5, fill: { color: "FFFFFF" }, rotate: 180 });
  // Logo centered on green half
  if (logoBase64) {
    titleSlide.addImage({
      data: logoBase64,
      x: 0.8, y: 2, w: 4.5, h: 3,
      sizing: { type: "contain", w: 4.5, h: 3 },
    });
  }
  // Right half - green accent bars
  titleSlide.addShape("rect", { x: 12, y: 0, w: 1.33, h: 1, fill: { color: "3B7A3B" } });
  titleSlide.addShape("rect", { x: 12, y: 6.5, w: 1.33, h: 1, fill: { color: "3B7A3B" } });
  // Text on right side
  titleSlide.addText("INSPEÇÃO DE", {
    x: 7, y: 2, w: 5.5, h: 0.6,
    fontSize: 14, color: "2D6A2D", fontFace: "Arial",
    charSpacing: 6,
  });
  titleSlide.addText("Canteiro", {
    x: 7, y: 2.6, w: 5.5, h: 1.4,
    fontSize: 44, bold: true, color: "1B3A1B", fontFace: "Georgia",
  });
  titleSlide.addText(inspectionDate, {
    x: 7, y: 4.2, w: 5.5, h: 0.5,
    fontSize: 14, color: "3B7A3B",
  });
  titleSlide.addText(`${tasks.length} pontos de melhoria`, {
    x: 7, y: 4.8, w: 5.5, h: 0.4,
    fontSize: 11, color: "64748B",
  });
  titleSlide.addText(`${slideNum}/${totalSlides}`, {
    x: 12, y: 7, w: 1, h: 0.3,
    fontSize: 8, color: "94A3B8", align: "right",
  });

  // ===== SUMMARY SLIDE =====
  slideNum++;
  const summarySlide = pptx.addSlide();
  summarySlide.background = { color: "FFFFFF" };
  addSlideBranding(summarySlide, logoBase64, slideNum, totalSlides);
  summarySlide.addText("Resumo da Inspeção", {
    x: 0.5, y: 0.8, w: "90%", h: 0.7,
    fontSize: 22, bold: true, color: "1B3A1B", fontFace: "Georgia",
  });

  const tableRows: pptxgen.TableRow[] = [
    [
      { text: "#", options: { bold: true, color: "FFFFFF", fill: { color: "3B7A3B" }, fontSize: 10, align: "center" } },
      { text: "Ponto de Melhoria", options: { bold: true, color: "FFFFFF", fill: { color: "3B7A3B" }, fontSize: 10 } },
      { text: "Observação", options: { bold: true, color: "FFFFFF", fill: { color: "3B7A3B" }, fontSize: 10 } },
      { text: "Status", options: { bold: true, color: "FFFFFF", fill: { color: "3B7A3B" }, fontSize: 10, align: "center" } },
    ],
  ];

  tasks.forEach((task, idx) => {
    const rowFill = idx % 2 === 0 ? "F0FFF0" : "FFFFFF";
    tableRows.push([
      { text: String(idx + 1), options: { fontSize: 9, align: "center", fill: { color: rowFill } } },
      { text: task.description, options: { fontSize: 9, fill: { color: rowFill } } },
      { text: task.observation || "-", options: { fontSize: 9, color: task.observation ? "92400E" : "94A3B8", fill: { color: rowFill } } },
      { text: task.is_completed ? "✅ Concluído" : "⏳ Pendente", options: { fontSize: 9, align: "center", color: task.is_completed ? "166534" : "92400E", fill: { color: rowFill } } },
    ]);
  });

  summarySlide.addTable(tableRows, {
    x: 0.4, y: 1.6, w: 12.4,
    border: { type: "solid", pt: 0.5, color: "D1E7D1" },
    rowH: 0.4,
    colW: [0.5, 4.5, 5, 2.4],
  });

  // ===== DETAIL SLIDES (left: title+observation, right: 2x2 photo grid) =====
  for (const [idx, task] of tasks.entries()) {
    if (task.before_photo_url || task.after_photo_url) {
      slideNum++;
      const slide = pptx.addSlide();
      slide.background = { color: "FFFFFF" };
      addSlideBranding(slide, logoBase64, slideNum, totalSlides);

      // Left side: title + description + observation
      slide.addText(`Ponto ${idx + 1}`, {
        x: 0.5, y: 1, w: 5, h: 0.8,
        fontSize: 28, bold: true, color: "1B3A1B", fontFace: "Georgia",
      });
      slide.addText(task.description, {
        x: 0.5, y: 1.9, w: 5, h: 0.5,
        fontSize: 13, bold: true, color: "2D6A2D",
      });
      slide.addText(task.observation || "Sem observação registrada.", {
        x: 0.5, y: 2.6, w: 5, h: 2.5,
        fontSize: 11, color: task.observation ? "374151" : "94A3B8",
        italic: !task.observation,
        valign: "top",
        paraSpaceAfter: 6,
      });
      // Status badge
      if (task.is_completed) {
        slide.addShape("rect", { x: 0.5, y: 5.3, w: 2.5, h: 0.35, fill: { color: "DCFCE7" }, rectRadius: 0.05 });
        slide.addText("✅ Concluído", {
          x: 0.5, y: 5.3, w: 2.5, h: 0.35,
          fontSize: 10, bold: true, color: "166534", align: "center",
        });
      }

      // Right side: 2x2 grid (before, green, green, after)
      const gridX = 6;
      const gridY = 0.9;
      const cellW = 3.4;
      const cellH = 2.8;
      const gap = 0.15;

      // Top-left: Before photo
      if (task.before_photo_url) {
        try {
          slide.addImage({
            path: task.before_photo_url,
            x: gridX, y: gridY, w: cellW, h: cellH,
            sizing: { type: "cover", w: cellW, h: cellH },
            rounding: true,
          });
        } catch { /* skip */ }
        slide.addShape("rect", { x: gridX, y: gridY, w: 1.2, h: 0.3, fill: { color: "DC2626" }, rectRadius: 0.05 });
        slide.addText("ANTES", {
          x: gridX, y: gridY, w: 1.2, h: 0.3,
          fontSize: 8, bold: true, color: "FFFFFF", align: "center",
        });
      } else {
        slide.addShape("rect", { x: gridX, y: gridY, w: cellW, h: cellH, fill: { color: "F1F5F9" }, rectRadius: 0.1 });
        slide.addText("Sem foto", { x: gridX, y: gridY + 1.2, w: cellW, h: 0.4, fontSize: 10, color: "94A3B8", align: "center" });
      }

      // Top-right: green accent block
      slide.addShape("rect", { x: gridX + cellW + gap, y: gridY, w: cellW, h: cellH, fill: { color: "3B7A3B" }, rectRadius: 0.1 });

      // Bottom-left: green accent block
      slide.addShape("rect", { x: gridX, y: gridY + cellH + gap, w: cellW, h: cellH, fill: { color: "2D6A2D" }, rectRadius: 0.1 });

      // Bottom-right: After photo
      if (task.after_photo_url) {
        try {
          slide.addImage({
            path: task.after_photo_url,
            x: gridX + cellW + gap, y: gridY + cellH + gap, w: cellW, h: cellH,
            sizing: { type: "cover", w: cellW, h: cellH },
            rounding: true,
          });
        } catch { /* skip */ }
        slide.addShape("rect", { x: gridX + cellW + gap, y: gridY + cellH + gap, w: 1.2, h: 0.3, fill: { color: "16A34A" }, rectRadius: 0.05 });
        slide.addText("DEPOIS", {
          x: gridX + cellW + gap, y: gridY + cellH + gap, w: 1.2, h: 0.3,
          fontSize: 8, bold: true, color: "FFFFFF", align: "center",
        });
      } else {
        slide.addShape("rect", { x: gridX + cellW + gap, y: gridY + cellH + gap, w: cellW, h: cellH, fill: { color: "F1F5F9" }, rectRadius: 0.1 });
        slide.addText("Sem foto", { x: gridX + cellW + gap, y: gridY + cellH + gap + 1.2, w: cellW, h: 0.4, fontSize: 10, color: "94A3B8", align: "center" });
      }
    }
  }

  // ===== CLOSING SLIDE (split layout like title) =====
  slideNum++;
  const closingSlide = pptx.addSlide();
  closingSlide.background = { color: "FFFFFF" };
  closingSlide.addShape("rect", { x: 0, y: 0, w: 6.5, h: 7.5, fill: { color: "2D6A2D" } });
  closingSlide.addShape("rtTriangle" as any, { x: 5.5, y: 0, w: 1.5, h: 7.5, fill: { color: "FFFFFF" }, rotate: 180 });
  if (logoBase64) {
    closingSlide.addImage({
      data: logoBase64,
      x: 0.8, y: 2, w: 4.5, h: 2.5,
      sizing: { type: "contain", w: 4.5, h: 2.5 },
    });
  }
  closingSlide.addShape("rect", { x: 12, y: 0, w: 1.33, h: 1, fill: { color: "3B7A3B" } });
  closingSlide.addShape("rect", { x: 12, y: 6.5, w: 1.33, h: 1, fill: { color: "3B7A3B" } });
  closingSlide.addText("Inspeção Concluída ✅", {
    x: 7, y: 2.2, w: 5.5, h: 1,
    fontSize: 28, bold: true, color: "3B7A3B", fontFace: "Georgia",
  });
  closingSlide.addText(`Todos os ${tasks.length} pontos foram resolvidos.`, {
    x: 7, y: 3.4, w: 5.5, h: 0.5,
    fontSize: 14, color: "64748B",
  });
  closingSlide.addText("Sucena Empreendimentos", {
    x: 7, y: 4.2, w: 5.5, h: 0.4,
    fontSize: 12, bold: true, color: "1B3A1B",
  });
  closingSlide.addText(`${slideNum}/${totalSlides}`, {
    x: 12, y: 7, w: 1, h: 0.3,
    fontSize: 8, color: "94A3B8", align: "right",
  });

  await pptx.writeFile({ fileName: `Inspecao_Canteiro_${inspectionDate.replace(/\//g, "-")}.pptx` });
}

interface SlideData {
  type: "title" | "summary" | "detail" | "closing";
  title?: string;
  subtitle?: string;
  caption?: string;
  tasks?: SiteInspectionTask[];
  task?: SiteInspectionTask;
  taskIndex?: number;
  totalTasks?: number;
}

function buildSlides(inspectionDate: string, tasks: SiteInspectionTask[]): SlideData[] {
  const slides: SlideData[] = [];
  slides.push({
    type: "title",
    title: "Inspeção de Canteiro",
    subtitle: inspectionDate,
    caption: `${tasks.length} pontos de melhoria • 100% concluído`,
  });
  slides.push({ type: "summary", tasks });
  tasks.forEach((task, idx) => {
    if (task.before_photo_url || task.after_photo_url) {
      slides.push({ type: "detail", task, taskIndex: idx });
    }
  });
  slides.push({ type: "closing", totalTasks: tasks.length });
  return slides;
}

function InspectionSlidePreview({ slides, currentSlide }: { slides: SlideData[]; currentSlide: number }) {
  const slide = slides[currentSlide];
  if (!slide) return null;

  if (slide.type === "title") {
    return (
      <div className="aspect-video bg-white rounded-xl flex relative overflow-hidden border border-border">
        {/* Left half - green with logo */}
        <div className="w-1/2 bg-gradient-to-br from-green-800 to-green-600 flex items-center justify-center relative">
          <div className="absolute top-0 right-0 w-16 h-full bg-white" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }} />
          <img src="/logo-sucena-empreendimentos.png" alt="Sucena" className="h-20 md:h-28 object-contain relative z-10 drop-shadow-lg" />
        </div>
        {/* Right half - white with text and green accents */}
        <div className="w-1/2 flex flex-col items-start justify-center px-6 md:px-10 relative">
          <div className="absolute top-0 right-0 w-10 h-14 bg-green-700 rounded-bl-xl" />
          <div className="absolute bottom-0 right-0 w-10 h-14 bg-green-700 rounded-tl-xl" />
          <p className="text-xs md:text-sm tracking-[0.3em] text-green-800 uppercase font-medium mb-1">Inspeção de</p>
          <h2 className="text-2xl md:text-4xl font-black text-green-900 leading-tight" style={{ fontFamily: "Georgia, serif" }}>Canteiro</h2>
          <div className="mt-4 space-y-1">
            <p className="text-sm text-green-700 font-medium">{slide.subtitle}</p>
            <p className="text-xs text-muted-foreground">{slide.caption}</p>
          </div>
        </div>
      </div>
    );
  }

  if (slide.type === "summary") {
    return (
      <div className="aspect-video bg-white rounded-xl p-4 md:p-6 overflow-auto border border-border relative">
        <div className="absolute top-0 right-0 w-8 h-12 bg-green-700 rounded-bl-xl" />
        <div className="flex items-center gap-2 mb-3">
          <img src="/logo-sucena-empreendimentos.png" alt="Logo" className="h-5 object-contain" />
          <span className="text-[10px] text-muted-foreground">Sucena Empreendimentos</span>
        </div>
        <h3 className="text-lg font-black text-green-900 mb-3" style={{ fontFamily: "Georgia, serif" }}>Resumo da Inspeção</h3>
        <table className="w-full text-xs md:text-sm border-collapse">
          <thead>
            <tr className="bg-green-700 text-white">
              <th className="p-2 text-center w-8">#</th>
              <th className="p-2 text-left">Ponto de Melhoria</th>
              <th className="p-2 text-left">Observação</th>
              <th className="p-2 text-center w-24">Status</th>
            </tr>
          </thead>
          <tbody>
            {slide.tasks?.map((task, idx) => (
              <tr key={task.id} className={idx % 2 === 0 ? "bg-green-50" : "bg-white"}>
                <td className="p-2 text-center text-green-900">{idx + 1}</td>
                <td className="p-2 text-green-900">{task.description}</td>
                <td className="p-2">
                  {task.observation ? (
                    <span className="text-amber-800 italic">{task.observation}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="p-2 text-center">{task.is_completed ? "✅" : "⏳"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (slide.type === "detail" && slide.task) {
    const task = slide.task;
    return (
      <div className="aspect-video bg-white rounded-xl flex overflow-hidden border border-border relative">
        <div className="absolute top-0 right-0 w-8 h-12 bg-green-700 rounded-bl-xl z-10" />
        {/* Left side: title + observation text */}
        <div className="w-2/5 p-4 md:p-6 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-3">
            <img src="/logo-sucena-empreendimentos.png" alt="Logo" className="h-4 object-contain" />
          </div>
          <h3 className="text-lg md:text-xl font-black text-green-900 leading-tight mb-3" style={{ fontFamily: "Georgia, serif" }}>
            Ponto {(slide.taskIndex ?? 0) + 1}
          </h3>
          <p className="text-xs md:text-sm text-green-900 font-medium mb-3">{task.description}</p>
          <p className="text-xs text-gray-600 leading-relaxed">
            {task.observation || "Sem observação registrada."}
          </p>
          {task.is_completed && (
            <div className="mt-3 inline-flex items-center gap-1 bg-green-100 text-green-800 text-[10px] font-bold px-2 py-1 rounded-full w-fit">
              ✅ Concluído
            </div>
          )}
        </div>
        {/* Right side: 2x2 grid (before photo, green block, green block, after photo) */}
        <div className="w-3/5 grid grid-cols-2 grid-rows-2 gap-0.5 p-1">
          <div className="relative rounded-lg overflow-hidden">
            {task.before_photo_url ? (
              <img src={task.before_photo_url} alt="Antes" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-muted-foreground text-xs">Sem foto</div>
            )}
            <span className="absolute top-1 left-1 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">ANTES</span>
          </div>
          <div className="bg-green-700 rounded-lg flex items-center justify-center">
            <span className="text-white/30 text-3xl">🌿</span>
          </div>
          <div className="bg-green-800 rounded-lg flex items-center justify-center">
            <span className="text-white/30 text-3xl">🍃</span>
          </div>
          <div className="relative rounded-lg overflow-hidden">
            {task.after_photo_url ? (
              <img src={task.after_photo_url} alt="Depois" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-muted-foreground text-xs">Sem foto</div>
            )}
            <span className="absolute top-1 left-1 bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">DEPOIS</span>
          </div>
        </div>
      </div>
    );
  }

  // closing
  return (
    <div className="aspect-video bg-white rounded-xl flex relative overflow-hidden border border-border">
      <div className="w-1/2 bg-gradient-to-br from-green-800 to-green-600 flex items-center justify-center relative">
        <div className="absolute top-0 right-0 w-16 h-full bg-white" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }} />
        <img src="/logo-sucena-empreendimentos.png" alt="Sucena" className="h-16 md:h-24 object-contain relative z-10 drop-shadow-lg" />
      </div>
      <div className="w-1/2 flex flex-col items-start justify-center px-6 md:px-10 relative">
        <div className="absolute top-0 right-0 w-10 h-14 bg-green-700 rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-10 h-14 bg-green-700 rounded-tl-xl" />
        <h2 className="text-xl md:text-3xl font-black text-green-700 leading-tight" style={{ fontFamily: "Georgia, serif" }}>Inspeção Concluída ✅</h2>
        <p className="text-sm text-muted-foreground mt-3">Todos os {slide.totalTasks} pontos foram resolvidos.</p>
        <p className="text-xs font-bold text-green-900 mt-2">Sucena Empreendimentos</p>
      </div>
    </div>
  );
}

function InspectionPresentationDialog({
  open,
  onOpenChange,
  inspectionDate,
  tasks,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  inspectionDate: string;
  tasks: SiteInspectionTask[];
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [exporting, setExporting] = useState(false);
  const slides = useMemo(() => buildSlides(inspectionDate, tasks), [inspectionDate, tasks]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await generateInspectionPptx(inspectionDate, tasks);
      toast.success("PowerPoint gerado!");
    } catch {
      toast.error("Erro ao gerar.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-4 md:p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Apresentação da Inspeção</h3>
            <Button size="sm" onClick={handleExport} disabled={exporting} className="gap-1.5">
              <FileDown className="h-4 w-4" />
              {exporting ? "Gerando..." : "Baixar PowerPoint"}
            </Button>
          </div>

          <InspectionSlidePreview slides={slides} currentSlide={currentSlide} />

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={currentSlide === 0}
              onClick={() => setCurrentSlide((c) => c - 1)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentSlide + 1} / {slides.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentSlide === slides.length - 1}
              onClick={() => setCurrentSlide((c) => c + 1)}
              className="gap-1"
            >
              Próximo <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InspectionDetail({ inspection }: { inspection: { id: string; inspection_date: string; is_locked: boolean } }) {
  const { data: tasks = [] } = useSiteInspectionTasks(inspection.id);
  const toggleLock = useToggleLockInspection();
  const toggleTask = useToggleTaskCompletion();
  const deleteInspection = useDeleteSiteInspection();
  const { isAdmin } = useIsAdmin();
  const [showPresentation, setShowPresentation] = useState(false);

  const completedCount = tasks.filter((t) => t.is_completed).length;
  const totalCount = tasks.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allCompleted = totalCount > 0 && completedCount === totalCount;

  const handleToggleTask = (taskId: string, currentState: boolean) => {
    if (!inspection.is_locked) {
      toast.error("Bloqueie a inspeção antes de marcar os itens concluídos.");
      return;
    }
    toggleTask.mutate({ id: taskId, is_completed: !currentState });
  };

  const dateStr = format(new Date(inspection.inspection_date + "T12:00:00"), "dd/MM/yyyy");

  return (
    <>
      <Card className="border border-border/40 backdrop-blur-sm bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">
                {format(new Date(inspection.inspection_date + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </CardTitle>
              <Badge variant={inspection.is_locked ? "default" : "secondary"}>
                {inspection.is_locked ? "Bloqueado" : "Aberto"}
              </Badge>
              {allCompleted && (
                <Badge className="bg-green-600 text-white gap-1">
                  <CheckCircle2 className="h-3 w-3" /> 100%
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {allCompleted && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPresentation(true)}
                  className="h-8 px-2 gap-1 text-green-600 border-green-600/30 hover:bg-green-50 dark:hover:bg-green-950/20"
                >
                  <Eye className="h-4 w-4" />
                  <span className="text-xs">Apresentação</span>
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toggleLock.mutate({ id: inspection.id, is_locked: !inspection.is_locked })}
                className="h-8 px-2"
              >
                {inspection.is_locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                <span className="ml-1 text-xs">{inspection.is_locked ? "Desbloquear" : "Bloquear"}</span>
              </Button>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (confirm("Deseja excluir esta inspeção?")) {
                      deleteInspection.mutate(inspection.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress bar */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={percentage} className="h-3" />
            </div>
            <span className="text-sm font-bold text-primary whitespace-nowrap">{percentage}%</span>
          </div>

          {totalCount === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">Nenhum ponto registrado.</p>
          )}

          <div className="space-y-1">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                isLocked={inspection.is_locked}
                onToggle={() => handleToggleTask(task.id, task.is_completed)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {allCompleted && (
        <InspectionPresentationDialog
          open={showPresentation}
          onOpenChange={setShowPresentation}
          inspectionDate={dateStr}
          tasks={tasks}
        />
      )}
    </>
  );
}

export default function InspecaoCanteiro() {
  const { user } = useAuth();
  const { data: inspections = [], isLoading } = useSiteInspections();
  const createInspection = useCreateSiteInspection();

  const [date, setDate] = useState<Date>(new Date());
  const [taskInputs, setTaskInputs] = useState<string[]>([""]);
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [showHistory, setShowHistory] = useState(false);

  // Latest inspection (most recent by date)
  const latestInspection = inspections.length > 0 ? inspections[0] : null;

  // Filtered history (excludes latest, applies date filter)
  const filteredHistory = useMemo(() => {
    const history = inspections.slice(1);
    if (!filterDate) return history;
    const filterStr = format(filterDate, "yyyy-MM-dd");
    return history.filter((i) => i.inspection_date === filterStr);
  }, [inspections, filterDate]);

  const addTaskInput = () => setTaskInputs((prev) => [...prev, ""]);

  const updateTaskInput = (index: number, value: string) => {
    setTaskInputs((prev) => prev.map((t, i) => (i === index ? value : t)));
  };

  const removeTaskInput = (index: number) => {
    if (taskInputs.length <= 1) return;
    setTaskInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = () => {
    if (!user) return;
    const validTasks = taskInputs.map((t) => t.trim()).filter(Boolean);
    if (validTasks.length === 0) {
      toast.error("Adicione pelo menos um ponto de melhoria.");
      return;
    }

    createInspection.mutate(
      {
        inspection_date: format(date, "yyyy-MM-dd"),
        created_by: user.id,
        tasks: validTasks,
      },
      {
        onSuccess: () => {
          toast.success("Inspeção criada com sucesso!");
          setTaskInputs([""]);
          setDate(new Date());
        },
        onError: () => toast.error("Erro ao criar inspeção."),
      }
    );
  };

  return (
    <Layout>
      <div className="space-y-6 p-4 md:p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <ClipboardCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Inspeção de Canteiro</h1>
            <p className="text-sm text-muted-foreground">Registre e acompanhe os pontos de melhoria</p>
          </div>
        </div>

        {/* Create new inspection */}
        <Card className="border border-primary/20 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Nova Inspeção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Data:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Separator />

            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Pontos de Melhoria:</span>
              {taskInputs.map((value, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder={`Ponto ${idx + 1}...`}
                    value={value}
                    onChange={(e) => updateTaskInput(idx, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTaskInput();
                      }
                    }}
                  />
                  {taskInputs.length > 1 && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeTaskInput(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={addTaskInput} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Adicionar Ponto
              </Button>
            </div>

            <Button onClick={handleCreate} disabled={createInspection.isPending} className="w-full">
              Salvar Inspeção
            </Button>
          </CardContent>
        </Card>

        {/* Latest inspection */}
        {isLoading ? (
          <p className="text-center text-muted-foreground">Carregando...</p>
        ) : latestInspection ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1 text-primary border-primary/30">
                <History className="h-3 w-3" />
                Última Inspeção
              </Badge>
            </div>
            <InspectionDetail inspection={latestInspection} />
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">Nenhuma inspeção registrada.</p>
        )}

        {/* History with filter */}
        {inspections.length > 1 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="gap-1.5"
              >
                <History className="h-4 w-4" />
                {showHistory ? "Ocultar Histórico" : "Ver Histórico"}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {inspections.length - 1}
                </Badge>
              </Button>

              {showHistory && (
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1.5">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {filterDate ? format(filterDate, "dd/MM/yyyy") : "Filtrar por data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={filterDate}
                        onSelect={setFilterDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {filterDate && (
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setFilterDate(undefined)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {showHistory && (
              <div className="space-y-4">
                {filteredHistory.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    {filterDate ? "Nenhuma inspeção encontrada nesta data." : "Nenhum histórico disponível."}
                  </p>
                ) : (
                  filteredHistory.map((insp) => (
                    <InspectionDetail key={insp.id} inspection={insp} />
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
