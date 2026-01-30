import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ImagePlus, Loader2, Sparkles, Upload, X, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCreateOrder, uploadOrderPhoto, QuantityUnit, OrderItemInput } from "@/hooks/useOrders";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UNIT_OPTIONS: { value: QuantityUnit; label: string }[] = [
  { value: "unidade", label: "Unidade(s)" },
  { value: "par", label: "Par(es)" },
  { value: "pecas", label: "Peça(s)" },
  { value: "centimetros", label: "Centímetros" },
  { value: "metros", label: "Metros" },
  { value: "metro_quadrado", label: "m² (Metro Quadrado)" },
  { value: "metro_cubico", label: "m³ (Metro Cúbico)" },
  { value: "quilos", label: "Quilos" },
  { value: "litros", label: "Litros" },
  { value: "galao", label: "Galão(ões)" },
  { value: "balde", label: "Balde(s)" },
  { value: "pacotes", label: "Pacotes" },
  { value: "caixas", label: "Caixas" },
  { value: "saco", label: "Saco(s)" },
  { value: "rolo", label: "Rolo(s)" },
];

const CARGO_OPTIONS = [
  { value: "aux_administrativo", label: "Aux. Administrativo" },
  { value: "aux_almoxarifado", label: "Aux. Almoxarifado" },
];

interface ItemForm {
  product_name: string;
  quantity: string;
  quantity_unit: QuantityUnit;
  description: string;
}

const emptyItem: ItemForm = {
  product_name: "",
  quantity: "1",
  quantity_unit: "unidade",
  description: "",
};

export function CreateOrderDialog({ open, onOpenChange }: CreateOrderDialogProps) {
  const [items, setItems] = useState<ItemForm[]>([{ ...emptyItem }]);
  const [currentItem, setCurrentItem] = useState<ItemForm>({ ...emptyItem });
  const [expectedDate, setExpectedDate] = useState<Date | undefined>();
  const [mentionedCargo, setMentionedCargo] = useState<string | undefined>();
  const [photos, setPhotos] = useState<string[]>([]);
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const { toast } = useToast();
  const createOrder = useCreateOrder();

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
    const productName = currentItem.product_name || (items.length > 0 ? items[0].product_name : "");

    if (!productName) {
      toast({ title: "Digite o nome do produto primeiro", variant: "destructive" });
      return;
    }

    setIsGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-order-image", {
        body: { prompt: productName },
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

  const addItem = () => {
    if (!currentItem.product_name.trim()) {
      toast({ title: "Digite o nome do produto", variant: "destructive" });
      return;
    }
    const qty = parseFloat(currentItem.quantity);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: "Quantidade inválida", variant: "destructive" });
      return;
    }

    setItems([...items, { ...currentItem }]);
    setCurrentItem({ ...emptyItem });
    toast({ title: "Item adicionado à lista!" });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ItemForm, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const onSubmit = async () => {
    // Combine current item if it has data
    let allItems = [...items];
    if (currentItem.product_name.trim()) {
      const qty = parseFloat(currentItem.quantity);
      if (!isNaN(qty) && qty > 0) {
        allItems.push({ ...currentItem });
      }
    }

    // Filter out empty items
    allItems = allItems.filter(item => item.product_name.trim() && parseFloat(item.quantity) > 0);

    if (allItems.length === 0) {
      toast({ title: "Adicione pelo menos um item ao pedido", variant: "destructive" });
      return;
    }

    try {
      let mentionedUserId: string | undefined;
      
      if (mentionedCargo) {
        const userId = await getMentionedUserId(mentionedCargo as "aux_administrativo" | "aux_almoxarifado");
        if (userId) mentionedUserId = userId;
      }

      const itemsData: OrderItemInput[] = allItems.map(item => ({
        product_name: item.product_name,
        quantity: parseFloat(item.quantity),
        quantity_unit: item.quantity_unit,
        description: item.description || undefined,
      }));

      await createOrder.mutateAsync({
        items: itemsData,
        expected_date: expectedDate ? format(expectedDate, "yyyy-MM-dd") : undefined,
        photo_urls: photos,
        ai_generated_image_url: aiImage || undefined,
        mentioned_user_id: mentionedUserId,
        mentioned_cargo: mentionedCargo,
      });

      toast({ title: "Pedido criado com sucesso!" });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Erro ao criar pedido", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setItems([]);
    setCurrentItem({ ...emptyItem });
    setExpectedDate(undefined);
    setMentionedCargo(undefined);
    setPhotos([]);
    setAiImage(null);
  };

  const totalItems = items.length + (currentItem.product_name.trim() ? 1 : 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Novo Pedido</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Added Items List */}
          {items.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Itens do Pedido
                <Badge variant="secondary">{items.length}</Badge>
              </Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {items.map((item, index) => (
                  <Card key={index} className="bg-muted/50">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{item.product_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.quantity} {UNIT_OPTIONS.find(u => u.value === item.quantity_unit)?.label}
                          </div>
                          {item.description && (
                            <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Separator />
            </div>
          )}

          {/* Add New Item Form */}
          <div className="space-y-3 p-4 border rounded-lg bg-card">
            <Label className="font-medium">
              {items.length > 0 ? "Adicionar outro item" : "Adicionar Item"}
            </Label>
            
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Nome do Produto *</Label>
                <Input
                  placeholder="Ex: Parafusos Phillips 6mm"
                  value={currentItem.product_name}
                  onChange={(e) => setCurrentItem({ ...currentItem, product_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Quantidade *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={currentItem.quantity}
                    onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-sm">Unidade *</Label>
                  <Select
                    value={currentItem.quantity_unit}
                    onValueChange={(v) => setCurrentItem({ ...currentItem, quantity_unit: v as QuantityUnit })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-sm">Descrição (opcional)</Label>
                <Textarea
                  placeholder="Detalhes adicionais..."
                  value={currentItem.description}
                  onChange={(e) => setCurrentItem({ ...currentItem, description: e.target.value })}
                  rows={2}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addItem}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Item à Lista
              </Button>
            </div>
          </div>

          <Separator />

          {/* Order Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Previsão de Entrega</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !expectedDate && "text-muted-foreground"
                    )}
                  >
                    {expectedDate ? (
                      format(expectedDate, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expectedDate}
                    onSelect={setExpectedDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Encaminhar para</Label>
              <Select value={mentionedCargo} onValueChange={setMentionedCargo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {CARGO_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Photos Section */}
          <div className="space-y-2">
            <Label>Fotos do Pedido</Label>
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
            <Button onClick={onSubmit} disabled={createOrder.isPending || totalItems === 0}>
              {createOrder.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar Pedido {totalItems > 0 && `(${totalItems} ${totalItems === 1 ? 'item' : 'itens'})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}