import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ImagePlus, Loader2, Sparkles, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCreateOrder, uploadOrderPhoto, QuantityUnit } from "@/hooks/useOrders";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  product_name: z.string().min(2, "Nome do produto é obrigatório"),
  description: z.string().optional(),
  quantity: z.coerce.number().min(0.01, "Quantidade deve ser maior que 0"),
  quantity_unit: z.enum(["unidade", "centimetros", "metros", "quilos", "litros", "pacotes", "caixas", "pecas"]),
  expected_date: z.date().optional(),
  mentioned_cargo: z.enum(["aux_administrativo", "aux_almoxarifado"]).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UNIT_OPTIONS: { value: QuantityUnit; label: string }[] = [
  { value: "unidade", label: "Unidade(s)" },
  { value: "centimetros", label: "Centímetros" },
  { value: "metros", label: "Metros" },
  { value: "quilos", label: "Quilos" },
  { value: "litros", label: "Litros" },
  { value: "pacotes", label: "Pacotes" },
  { value: "caixas", label: "Caixas" },
  { value: "pecas", label: "Peças" },
];

const CARGO_OPTIONS = [
  { value: "aux_administrativo", label: "Aux. Administrativo" },
  { value: "aux_almoxarifado", label: "Aux. Almoxarifado" },
];

export function CreateOrderDialog({ open, onOpenChange }: CreateOrderDialogProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const { toast } = useToast();
  const createOrder = useCreateOrder();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_name: "",
      description: "",
      quantity: 1,
      quantity_unit: "unidade",
    },
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(uploadOrderPhoto);
      const urls = await Promise.all(uploadPromises);
      setPhotos((prev) => [...prev, ...urls]);
      toast({ title: "Fotos enviadas com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao enviar fotos", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const generateAIImage = async () => {
    const productName = form.getValues("product_name");
    const description = form.getValues("description");

    if (!productName) {
      toast({ title: "Digite o nome do produto primeiro", variant: "destructive" });
      return;
    }

    setIsGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-order-image", {
        body: { prompt: `${productName}. ${description || ""}` },
      });

      if (error) throw error;

      if (data.imageUrl) {
        setAiImage(data.imageUrl);
        toast({ title: "Imagem gerada com sucesso!" });
      } else {
        toast({ title: data.message || "Imagem gerada, mas sem URL disponível" });
      }
    } catch (error) {
      toast({ title: "Erro ao gerar imagem", variant: "destructive" });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const getMentionedUserId = async (cargo: "aux_administrativo" | "aux_almoxarifado"): Promise<string | null> => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("cargo", cargo)
      .limit(1)
      .maybeSingle();
    
    return data?.user_id || null;
  };

  const onSubmit = async (data: FormData) => {
    try {
      let mentionedUserId: string | undefined;
      
      if (data.mentioned_cargo) {
        const userId = await getMentionedUserId(data.mentioned_cargo);
        if (userId) mentionedUserId = userId;
      }

      await createOrder.mutateAsync({
        product_name: data.product_name,
        description: data.description,
        quantity: data.quantity,
        quantity_unit: data.quantity_unit,
        expected_date: data.expected_date ? format(data.expected_date, "yyyy-MM-dd") : undefined,
        photo_urls: photos,
        ai_generated_image_url: aiImage || undefined,
        mentioned_user_id: mentionedUserId,
        mentioned_cargo: data.mentioned_cargo,
      });

      toast({ title: "Pedido criado com sucesso!" });
      form.reset();
      setPhotos([]);
      setAiImage(null);
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Erro ao criar pedido", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Novo Pedido</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="product_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Produto *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Parafusos Phillips 6mm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detalhes adicionais do produto..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity_unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UNIT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expected_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Previsão de Entrega</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mentioned_cargo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Encaminhar para</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o responsável" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CARGO_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Photos Section */}
            <div className="space-y-2">
              <FormLabel>Fotos do Produto</FormLabel>
              <div className="flex flex-wrap gap-2">
                {photos.map((url, index) => (
                  <div key={index} className="relative w-20 h-20">
                    <img
                      src={url}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {aiImage && (
                  <div className="relative w-20 h-20">
                    <img
                      src={aiImage}
                      alt="Imagem gerada por IA"
                      className="w-full h-full object-cover rounded-md ring-2 ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setAiImage(null)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-0 left-0 right-0 bg-primary/80 text-primary-foreground text-[10px] text-center py-0.5 rounded-b-md">
                      IA
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  onClick={() => document.getElementById("photo-upload")?.click()}
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Enviar Fotos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isGeneratingAI}
                  onClick={generateAIImage}
                >
                  {isGeneratingAI ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Gerar com IA
                </Button>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createOrder.isPending}>
                {createOrder.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar Pedido
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
