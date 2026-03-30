import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, X, Loader2 } from "lucide-react";
import instaCenaLogo from "@/assets/instacena-logo.png";
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

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const InstaCena = () => {
  const { data: posts, isLoading } = useInstaCenaPosts();
  const [filter, setFilter] = useState<"posts" | "logs">("posts");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

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
      <div className="max-w-xl mx-auto px-3 sm:px-4 py-6 space-y-4 overflow-x-hidden">
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
    </Layout>
  );
};

export default InstaCena;
