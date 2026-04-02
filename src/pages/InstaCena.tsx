import { useState, useRef, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, X, Loader2, Maximize2 } from "lucide-react";
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
  const [localHeight, setLocalHeight] = useState<number | null>(null);
  const [showLeftResize, setShowLeftResize] = useState(false);
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
  const [localRightHeight, setLocalRightHeight] = useState<number | null>(null);
  const [showRightResize, setShowRightResize] = useState(false);
  const draggingRight = useRef(false);
  const offsetRight = useRef({ x: 0, y: 0 });
  const resizeRightTimer = useRef<ReturnType<typeof setTimeout>>();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    setDragPos(null);
    setLocalSize(null);
    setDragRightPos(null);
    setLocalRightSize(null);
  }, [settings.instacena_gif_position, settings.instacena_gif_size, settings.instacena_gif_right_position, settings.instacena_gif_right_size]);

  // Listen to <main> scroll container
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrollY(main.scrollTop));
    };
    main.addEventListener("scroll", onScroll, { passive: true });
    return () => { main.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

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
      <div className="relative min-h-screen">
        {showGif && (
          <div
            className={cn("absolute z-10 hidden lg:block animate-gif-float", !isAdmin && "pointer-events-none")}
            style={{ left: currentPos.x, top: currentPos.y + scrollY, transition: "top 0.3s ease-out" }}
          >
            <img
              src={gifUrl || instaCenaEaster}
              alt=""
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              
              className={cn(
                "select-none",
                isAdmin ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"
              )}
              style={{
                width: currentSize,
                height: (localHeight ?? gifHeight) || "auto",
                borderRadius: 0,
                objectFit: (localHeight ?? gifHeight) ? "cover" : "contain",
                touchAction: "none",
              }}
            />
            {isAdmin && (
              <button
                onClick={() => setShowLeftResize(!showLeftResize)}
                className="absolute -bottom-3 -right-3 p-1 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform"
                title="Redimensionar"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            )}
            {isAdmin && showLeftResize && (
              <div className="absolute top-full left-0 mt-2 bg-card border border-border rounded-lg shadow-xl p-3 space-y-2 min-w-[200px] z-50" onClick={(e) => e.stopPropagation()}>
                <div className="text-xs font-medium">Largura: {localSize ?? gifSize}px</div>
                <input type="range" min={80} max={600} step={10} value={localSize ?? gifSize}
                  onChange={(e) => setLocalSize(parseInt(e.target.value))}
                  onMouseUp={() => { if (localSize !== null) updateSettings.mutate({ instacena_gif_size: localSize } as any, { onSuccess: () => toast.success("Largura salva!") }); }}
                  onTouchEnd={() => { if (localSize !== null) updateSettings.mutate({ instacena_gif_size: localSize } as any, { onSuccess: () => toast.success("Largura salva!") }); }}
                  className="w-full accent-primary" />
                <div className="text-xs font-medium">Altura: {(localHeight ?? gifHeight) || "Auto"}{(localHeight ?? gifHeight) ? "px" : ""}</div>
                <input type="range" min={0} max={800} step={10} value={localHeight ?? gifHeight ?? 0}
                  onChange={(e) => setLocalHeight(parseInt(e.target.value))}
                  onMouseUp={() => { if (localHeight !== null) { const v = localHeight; updateSettings.mutate({ instacena_gif_height: v === 0 ? null : v } as any, { onSuccess: () => toast.success("Altura salva!") }); } }}
                  onTouchEnd={() => { if (localHeight !== null) { const v = localHeight; updateSettings.mutate({ instacena_gif_height: v === 0 ? null : v } as any, { onSuccess: () => toast.success("Altura salva!") }); } }}
                  className="w-full accent-primary" />
                <p className="text-[10px] text-muted-foreground">0 = automático (proporcional)</p>
              </div>
            )}
          </div>
        )}
        {showRightGif && (
          <div
            className={cn("fixed z-10 hidden lg:block animate-gif-float", !isAdmin && "pointer-events-none")}
            style={{ left: currentRightPos.x, top: currentRightPos.y }}
          >
            <img
              src={gifRightUrl!}
              alt=""
              onPointerDown={onRightPointerDown}
              onPointerMove={onRightPointerMove}
              onPointerUp={onRightPointerUp}
              
              className={cn(
                "select-none",
                isAdmin ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"
              )}
              style={{
                width: currentRightSize,
                height: (localRightHeight ?? gifRightHeight) || "auto",
                borderRadius: 0,
                objectFit: (localRightHeight ?? gifRightHeight) ? "cover" : "contain",
                touchAction: "none",
              }}
            />
            {isAdmin && (
              <button
                onClick={() => setShowRightResize(!showRightResize)}
                className="absolute -bottom-3 -right-3 p-1 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform"
                title="Redimensionar"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            )}
            {isAdmin && showRightResize && (
              <div className="absolute top-full right-0 mt-2 bg-card border border-border rounded-lg shadow-xl p-3 space-y-2 min-w-[200px] z-50" onClick={(e) => e.stopPropagation()}>
                <div className="text-xs font-medium">Largura: {localRightSize ?? gifRightSize}px</div>
                <input type="range" min={80} max={600} step={10} value={localRightSize ?? gifRightSize}
                  onChange={(e) => setLocalRightSize(parseInt(e.target.value))}
                  onMouseUp={() => { if (localRightSize !== null) updateSettings.mutate({ instacena_gif_right_size: localRightSize } as any, { onSuccess: () => toast.success("Largura salva!") }); }}
                  onTouchEnd={() => { if (localRightSize !== null) updateSettings.mutate({ instacena_gif_right_size: localRightSize } as any, { onSuccess: () => toast.success("Largura salva!") }); }}
                  className="w-full accent-primary" />
                <div className="text-xs font-medium">Altura: {(localRightHeight ?? gifRightHeight) || "Auto"}{(localRightHeight ?? gifRightHeight) ? "px" : ""}</div>
                <input type="range" min={0} max={800} step={10} value={localRightHeight ?? gifRightHeight ?? 0}
                  onChange={(e) => setLocalRightHeight(parseInt(e.target.value))}
                  onMouseUp={() => { if (localRightHeight !== null) { const v = localRightHeight; updateSettings.mutate({ instacena_gif_right_height: v === 0 ? null : v } as any, { onSuccess: () => toast.success("Altura salva!") }); } }}
                  onTouchEnd={() => { if (localRightHeight !== null) { const v = localRightHeight; updateSettings.mutate({ instacena_gif_right_height: v === 0 ? null : v } as any, { onSuccess: () => toast.success("Altura salva!") }); } }}
                  className="w-full accent-primary" />
                <p className="text-[10px] text-muted-foreground">0 = automático (proporcional)</p>
              </div>
            )}
          </div>
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
