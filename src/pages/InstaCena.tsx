import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, X, Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { CreatePostCard } from "@/components/instacena/CreatePostCard";
import { PostCard } from "@/components/instacena/PostCard";
import { useInstaCenaPosts } from "@/hooks/useInstaCena";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const InstaCena = () => {
  const { data: posts, isLoading } = useInstaCenaPosts();
  const [filter, setFilter] = useState<"all" | "posts" | "logs">("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const filteredPosts = posts?.filter((p) => {
    if (filter === "posts" && p.is_system_post) return false;
    if (filter === "logs" && !p.is_system_post) return false;
    if (selectedDate) {
      const postDate = new Date(p.created_at).toLocaleDateString("en-CA");
      const filterDate = format(selectedDate, "yyyy-MM-dd");
      if (postDate !== filterDate) return false;
    }
    return true;
  });

  return (
    <Layout>
      <div className="max-w-xl mx-auto px-3 sm:px-4 py-6 space-y-4 overflow-x-hidden">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-2xl font-bold">InstaCena</h1>
          <div className="flex items-center gap-2">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-3 h-6">Tudo</TabsTrigger>
                <TabsTrigger value="posts" className="text-xs px-3 h-6">Posts</TabsTrigger>
                <TabsTrigger value="logs" className="text-xs px-3 h-6">Logs</TabsTrigger>
              </TabsList>
            </Tabs>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-8 gap-1 text-xs", selectedDate && "border-primary text-primary")}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {selectedDate ? format(selectedDate, "dd/MM", { locale: ptBR }) : "Data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className={cn("p-3 pointer-events-auto")}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            {selectedDate && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(undefined)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
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
