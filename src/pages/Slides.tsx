import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SlideGenerator } from "@/components/slides/SlideGenerator";
import { PptxImporter } from "@/components/slides/PptxImporter";
import { SlideViewer } from "@/components/slides/SlideViewer";
import { ExportPptxButton } from "@/components/slides/ExportPptxButton";
import { usePresentations, SlideData } from "@/hooks/usePresentations";
import { Plus, Trash2, Save, Eye, Clock, Presentation, FileUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const SlidesPage = () => {
  const { presentations, isLoading, savePresentation, deletePresentation } = usePresentations();
  const [activeTab, setActiveTab] = useState("generate");
  const [currentSlides, setCurrentSlides] = useState<SlideData[]>([]);
  const [currentTitle, setCurrentTitle] = useState("");
  const [currentId, setCurrentId] = useState<string | undefined>();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const handleGenerated = (slides: SlideData[], title: string) => {
    setCurrentSlides(slides);
    setCurrentTitle(title);
    setCurrentId(undefined);
    setCurrentSlideIndex(0);
    setActiveTab("preview");
  };

  const handleSave = () => {
    if (!currentSlides.length) return;
    savePresentation.mutate({
      id: currentId,
      title: currentTitle || "Sem título",
      slides: currentSlides,
    });
  };

  const handleLoadPresentation = (p: any) => {
    setCurrentSlides(p.slides);
    setCurrentTitle(p.title);
    setCurrentId(p.id);
    setCurrentSlideIndex(0);
    setActiveTab("preview");
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 md:px-6 py-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Presentation className="w-8 h-8 text-primary" />
            Slides IA
          </h1>
          <p className="text-muted-foreground mt-1">
            Gere apresentações completas com inteligência artificial.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="generate">
              <Plus className="w-4 h-4 mr-1" /> Gerar
            </TabsTrigger>
            <TabsTrigger value="import">
              <FileUp className="w-4 h-4 mr-1" /> Importar
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={currentSlides.length === 0}>
              <Eye className="w-4 h-4 mr-1" /> Visualizar
            </TabsTrigger>
            <TabsTrigger value="saved">
              <Clock className="w-4 h-4 mr-1" /> Salvos ({presentations.length})
            </TabsTrigger>
          </TabsList>

          {/* Generate Tab */}
          <TabsContent value="generate">
            <SlideGenerator onGenerated={handleGenerated} />
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import">
            <PptxImporter onGenerated={handleGenerated} />
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview">
            {currentSlides.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Input
                    value={currentTitle}
                    onChange={(e) => setCurrentTitle(e.target.value)}
                    className="flex-1 min-w-[200px] text-lg font-semibold"
                    placeholder="Título da apresentação"
                  />
                  <Button onClick={handleSave} disabled={savePresentation.isPending} size="sm">
                    <Save className="w-4 h-4 mr-1" />
                    {currentId ? "Atualizar" : "Salvar"}
                  </Button>
                  <ExportPptxButton slides={currentSlides} title={currentTitle} />
                </div>
                <SlideViewer
                  slides={currentSlides}
                  currentSlide={currentSlideIndex}
                  onSlideChange={setCurrentSlideIndex}
                />
                {/* Notes */}
                {currentSlides[currentSlideIndex]?.notes && (
                  <Card className="bg-muted/30">
                    <CardContent className="py-3 px-4">
                      <p className="text-sm text-muted-foreground">
                        <strong>Notas:</strong> {currentSlides[currentSlideIndex].notes}
                      </p>
                    </CardContent>
                  </Card>
                )}
                {/* Slide thumbnails */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {currentSlides.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSlideIndex(i)}
                      className={`flex-shrink-0 w-28 h-16 rounded border-2 px-2 py-1 text-left transition ${
                        i === currentSlideIndex
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/50"
                      }`}
                    >
                      <p className="text-[9px] font-medium truncate">{s.title}</p>
                      <p className="text-[8px] text-muted-foreground truncate">{s.layout}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Gere uma apresentação primeiro para visualizar aqui.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Saved Tab */}
          <TabsContent value="saved">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : presentations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Nenhuma apresentação salva ainda.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {presentations.map((p) => (
                  <Card key={p.id} className="hover:border-primary/50 transition cursor-pointer" onClick={() => handleLoadPresentation(p)}>
                    <CardContent className="py-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{p.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {p.slides.length} slides •{" "}
                          {format(new Date(p.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <ExportPptxButton slides={p.slides} title={p.title} />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePresentation.mutate(p.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SlidesPage;
