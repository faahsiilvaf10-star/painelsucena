import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Newspaper, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface NewsItem {
  title: string;
  category: string;
  link: string;
  pubDate?: string;
}

export const NewsTicker = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("fetch-news");
      if (error) throw error;
      if (data?.items?.length > 0) {
        setNews(data.items);
      }
    } catch (e) {
      console.error("Error fetching news:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading || news.length === 0) return null;

  const tickerText = news
    .map((item) => `${item.category}  ${item.title}`)
    .join("     •     ");

  const isToday = (dateStr?: string) => {
    if (!dateStr) return true; // include items without date
    try {
      const d = new Date(dateStr);
      const now = new Date();
      return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    } catch {
      return true;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const todayNews = news.filter((item) => isToday(item.pubDate));

  return (
    <>
      <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
        <button
          onClick={() => setHistoryOpen(true)}
          className="flex items-center gap-1 shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Ver todas as notícias"
        >
          <Newspaper className="h-3.5 w-3.5" />
          <span className="text-[10px] font-semibold uppercase tracking-wider hidden sm:inline">
            Notícias
          </span>
        </button>
        <div className="overflow-hidden flex-1 min-w-0 relative">
          <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />
          <div
            ref={tickerRef}
            className="whitespace-nowrap animate-ticker text-[11px] text-muted-foreground"
            style={{ display: "inline-flex", gap: "5rem" }}
          >
            <span>{tickerText}</span>
            <span>{tickerText}</span>
          </div>
        </div>
      </div>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Newspaper className="h-5 w-5" />
              Notícias do Dia
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-2">
            <div className="space-y-3">
              {todayNews.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma notícia publicada hoje.
                </p>
              ) : (
                todayNews.map((item, i) => (
                  <a
                    key={i}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {item.category}
                      </Badge>
                      {item.pubDate && (
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-auto">
                          {formatDate(item.pubDate)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm mt-1.5 leading-snug">{item.title}</p>
                  </a>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
