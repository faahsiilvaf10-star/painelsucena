import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, FileUp, Loader2, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SlideData } from "@/hooks/usePresentations";
import JSZip from "jszip";

interface PptxImporterProps {
  onGenerated: (slides: SlideData[], title: string) => void;
}

interface ExtractedSlide {
  index: number;
  texts: string[];
}

function stripXmlTags(xml: string): string {
  return xml.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

async function parsePptx(file: File): Promise<{ title: string; slides: ExtractedSlide[] }> {
  const zip = await JSZip.loadAsync(file);
  const slides: ExtractedSlide[] = [];

  // Find all slide files (slide1.xml, slide2.xml, etc.)
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || "0");
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || "0");
      return numA - numB;
    });

  for (let i = 0; i < slideFiles.length; i++) {
    const content = await zip.files[slideFiles[i]].async("text");

    // Extract text from <a:t> tags (PowerPoint text elements)
    const textMatches = content.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
    const texts = textMatches
      .map((match) => stripXmlTags(match))
      .filter((t) => t.length > 0);

    slides.push({ index: i + 1, texts });
  }

  // Try to get presentation title from core properties
  let title = file.name.replace(/\.pptx?$/i, "");
  try {
    const coreFile = zip.files["docProps/core.xml"];
    if (coreFile) {
      const coreXml = await coreFile.async("text");
      const titleMatch = coreXml.match(/<dc:title>([^<]+)<\/dc:title>/);
      if (titleMatch?.[1]) title = titleMatch[1];
    }
  } catch {
    // ignore
  }

  return { title, slides };
}

function formatExtractedSlides(slides: ExtractedSlide[]): string {
  return slides
    .map((s) => {
      const content = s.texts.join(" | ");
      return `Slide ${s.index}: ${content || "(vazio)"}`;
    })
    .join("\n");
}

export function PptxImporter({ onGenerated }: PptxImporterProps) {
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [extractedContent, setExtractedContent] = useState("");
  const [extractedTitle, setExtractedTitle] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.pptx$/i)) {
      toast.error("Selecione um arquivo .pptx válido.");
      return;
    }

    setIsProcessing(true);
    try {
      const { title, slides } = await parsePptx(file);
      const content = formatExtractedSlides(slides);

      setImportedFile(file);
      setExtractedContent(content);
      setExtractedTitle(title);
      toast.success(`${slides.length} slides extraídos de "${file.name}"`);
    } catch (err) {
      console.error("PPTX parse error:", err);
      toast.error("Erro ao ler o arquivo PowerPoint.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setImportedFile(null);
    setExtractedContent("");
    setExtractedTitle("");
    setEditPrompt("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerate = async () => {
    if (!extractedContent) {
      toast.error("Importe um arquivo primeiro.");
      return;
    }

    setIsGenerating(true);
    try {
      const fullPrompt = `Baseie-se no conteúdo do PowerPoint importado abaixo para recriar os slides com o mesmo layout e estrutura, mas aplique as seguintes instruções de edição:

INSTRUÇÕES DE EDIÇÃO: ${editPrompt || "Mantenha o conteúdo original, apenas melhore a formatação e organização."}

CONTEÚDO DO POWERPOINT IMPORTADO:
${extractedContent}`;

      const { data, error } = await supabase.functions.invoke("generate-slides", {
        body: {
          prompt: fullPrompt,
          slideCount: extractedContent.split("\n").length,
          includeSystemData: false,
          dataContext: null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.slides?.length) throw new Error("Nenhum slide gerado");

      onGenerated(data.slides, extractedTitle);
      toast.success(`${data.slides.length} slides gerados a partir do arquivo importado!`);
    } catch (err: any) {
      console.error("Import generate error:", err);
      toast.error(err.message || "Erro ao gerar slides");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileUp className="w-5 h-5 text-primary" />
          Importar PowerPoint
        </CardTitle>
        <CardDescription>
          Importe um arquivo .pptx e a IA recriará os slides com as edições solicitadas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File upload */}
        {!importedFile ? (
          <div
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              Clique para selecionar um arquivo <strong>.pptx</strong>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pptx"
              onChange={handleFileSelect}
              className="hidden"
            />
            {isProcessing && (
              <div className="flex items-center justify-center gap-2 mt-3 text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Lendo arquivo...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{importedFile.name}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClear} className="h-7 w-7">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground max-h-32 overflow-y-auto whitespace-pre-wrap bg-background/50 rounded p-2">
              {extractedContent}
            </div>
          </div>
        )}

        {/* Edit prompt */}
        {importedFile && (
          <>
            <div className="space-y-2">
              <Label>Instruções de edição (opcional)</Label>
              <Textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="Ex: Traduza para inglês, adicione dados de produção do mês, resuma em menos slides..."
                rows={3}
              />
            </div>

            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando slides...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar a partir do Arquivo
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
