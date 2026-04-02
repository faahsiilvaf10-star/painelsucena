import { useState, useRef, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, X, Loader2 } from "lucide-react";
import instaCenaLogo from "@/assets/instacena-logo.png";
import instaCenaEaster from "@/assets/instacena-easter.gif";
import Layout from "@/components/layout/Layout";
import { CreatePostCard } from "@/components/instacena/CreatePostCard";
import { PostCard } from "@/components/instacena/PostCard";
import { useInstaCenaPosts } from "@/hooks/useInstaCena";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "sonner";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const InstaCena = () => {
  const { data: posts, isLoading } = useInstaCenaPosts();
  const [filter, setFilter] = useState<"posts" | "logs">("posts");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const { isAdmin } = useIsAdmin();
  const { settings, updateSettings } = useSiteSettings();

  // --- Left GIF state ---
  const gifPos = settings.instacena_gif_position || { x: 16, y: 80 };
  const gifSize = settings.instacena_gif_size || 200;
  const gifHeight = settings.instacena_gif_height;
  const gifUrl = settings.instacena_gif_url;
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [localSize, setLocalSize] = useState<number | null>(null);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const resizeTimer = useRef<ReturnType<typeof setTimeout>>();

  // --- Right GIF state ---
  const gifRightPos = settings.instacena_gif_right_position || { x: 1000, y: 80 };
  const gifRightSize = settings.instacena_gif_right_size || 200;
  const gifRightHeight = settings.instacena_gif_right_height;
  const gifRightUrl = settings.instacena_gif_right_url;
  const [dragRightPos, setDragRightPos] = useState<{ x: number; y: number } | null>(null);
  const [localRightSize, setLocalRightSize] = useState<number | null>(null);
  const draggingRight = useRef(false);
  const offsetRight = useRef({ x: 0, y: 0 });
  const resizeRightTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setDragPos(null);
    setLocalSize(null);
    setDragRightPos(null);
    setLocalRightSize(null);
  }, [settings.instacena_gif_position, settings.instacena_gif_size, settings.instacena_gif_right_position, settings.instacena_gif_right_size]);

  // Left GIF handlers
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!isAdmin) return;
    dragging.current = true;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, [isAdmin]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    setDragPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
  }, []);

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragPos) {
      updateSettings.mutate(
        { instacena_gif_position: { x: Math.round(dragPos.x), y: Math.round(dragPos.y) } } as any,
        { onSuccess: () => toast.success("Posição do GIF esquerdo salva!") }
      );
    }
  }, [dragPos, updateSettings]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!isAdmin) return;
    e.preventDefault();
    const current = localSize ?? gifSize;
    const newSize = Math.max(80, Math.min(600, current + (e.deltaY < 0 ? 20 : -20)));
    setLocalSize(newSize);
    clearTimeout(resizeTimer.current);
    resizeTimer.current = setTimeout(() => {
      updateSettings.mutate({ instacena_gif_size: newSize } as any, { onSuccess: () => toast.success("Tamanho salvo!") });
    }, 600);
  }, [isAdmin, localSize, gifSize, updateSettings]);

  // Right GIF handlers
  const onRightPointerDown = useCallback((e: React.PointerEvent) => {
    if (!isAdmin) return;
    draggingRight.current = true;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    offsetRight.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, [isAdmin]);

  const onRightPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRight.current) return;
    setDragRightPos({ x: e.clientX - offsetRight.current.x, y: e.clientY - offsetRight.current.y });
  }, []);

  const onRightPointerUp = useCallback(() => {
    if (!draggingRight.current) return;
    draggingRight.current = false;
    if (dragRightPos) {
      updateSettings.mutate(
        { instacena_gif_right_position: { x: Math.round(dragRightPos.x), y: Math.round(dragRightPos.y) } } as any,
        { onSuccess: () => toast.success("Posição do GIF direito salva!") }
      );
    }
  }, [dragRightPos, updateSettings]);

  const onRightWheel = useCallback((e: React.WheelEvent) => {
    if (!isAdmin) return;
    e.preventDefault();
    const current = localRightSize ?? gifRightSize;
    const newSize = Math.max(80, Math.min(600, current + (e.deltaY < 0 ? 20 : -20)));
    setLocalRightSize(newSize);
    clearTimeout(resizeRightTimer.current);
    resizeRightTimer.current = setTimeout(() => {
      updateSettings.mutate({ instacena_gif_right_size: newSize } as any, { onSuccess: () => toast.success("Tamanho salvo!") });
    }, 600);
  }, [isAdmin, localRightSize, gifRightSize, updateSettings]);

  const currentPos = dragPos || gifPos;
  const currentSize = localSize ?? gifSize;
  const showGif = gifUrl !== "__removed__";

  const currentRightPos = dragRightPos || gifRightPos;
  const currentRightSize = localRightSize ?? gifRightSize;
  const showRightGif = gifRightUrl && gifRightUrl !== "__removed__";

  const filteredPosts = posts?.filter((p) => {
    if (filter === "posts" && p.is_system_post) return false;
    if (filter === "logs" && !p.is_system_post) return false;
    if (selectedDate) {
      const postDate = new Date(p.created_at).toLocaleDateString("en-CA");
      const filterDate = format(selectedDate, "yyyy-MM-dd");
      if (postDate !== filterDate) return false;
    } else if (selectedMonth !== "all") {
      const postMonth = new Date(p.created_at).getMonth().toString();
      if (postMonth !== selectedMonth) return false;
    }
    return true;
  });

  const clearFilters = () => {
    setSelectedDate(undefined);
    setSelectedMonth("all");
  };

  const hasActiveFilter = !!selectedDate || selectedMonth !== "all";

  return (
    <Layout>
      <div className="relative">
        {showGif && (
          <img
            src={gifUrl || instaCenaEaster}
            alt=""
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onWheel={onWheel}
            className={cn(
              "fixed z-10 hidden lg:block select-none",
              isAdmin ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"
            )}
            style={{
              left: currentPos.x,
              top: currentPos.y,
              width: currentSize,
              height: gifHeight || "auto",
              borderRadius: 0,
              objectFit: gifHeight ? "cover" : "contain",
              touchAction: "none",
            }}
          />
        )}
        {showRightGif && (
          <img
            src={gifRightUrl!}
            alt=""
            onPointerDown={onRightPointerDown}
            onPointerMove={onRightPointerMove}
            onPointerUp={onRightPointerUp}
            onWheel={onRightWheel}
            className={cn(
              "fixed z-10 hidden lg:block select-none",
              isAdmin ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"
            )}
            style={{
              left: currentRightPos.x,
              top: currentRightPos.y,
              width: currentRightSize,
              height: gifRightHeight || "auto",
              borderRadius: 0,
              objectFit: gifRightHeight ? "cover" : "contain",
              touchAction: "none",
            }}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="max-w-xl mx-auto py-1 space-y-4 overflow-x-hidden">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <img src={instaCenaLogo} alt="InstaCena" className="h-32 object-contain" />
            <div className="flex items-center gap-2">
              <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                <TabsList className="h-8">
                  <TabsTrigger value="posts" className="text-xs px-3 h-6">Posts</TabsTrigger>
                  <TabsTrigger value="logs" className="text-xs px-3 h-6">Logs</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); if (v !== "all") setSelectedDate(undefined); }}>
              <SelectTrigger className={cn("h-8 w-[130px] text-xs", selectedMonth !== "all" && "border-primary text-primary")}>
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-8 gap-1 text-xs", selectedDate && "border-primary text-primary")}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {selectedDate ? format(selectedDate, "dd/MM", { locale: ptBR }) : "Dia"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => { setSelectedDate(d); if (d) setSelectedMonth("all"); }}
                  className={cn("p-3 pointer-events-auto")}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            {hasActiveFilter && (
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" /> Limpar
              </Button>
            )}
          </div>

          <CreatePostCard />

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPosts && filteredPosts.length > 0 ? (
            filteredPosts.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <p className="text-center text-muted-foreground py-12 text-sm">
              Nenhuma publicação encontrada. 🔍
            </p>
          )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default InstaCena;
