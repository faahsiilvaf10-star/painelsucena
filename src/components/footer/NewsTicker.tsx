import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewsItem {
  title: string;
  category: string;
  link: string;
}

export const NewsTicker = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    // Refresh every 10 minutes
    const interval = setInterval(fetchNews, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading || news.length === 0) return null;

  const tickerText = news
    .map((item) => `${item.category}  ${item.title}`)
    .join("     •     ");

  return (
    <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
      <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
        <Newspaper className="h-3.5 w-3.5" />
        <span className="text-[10px] font-semibold uppercase tracking-wider hidden sm:inline">
          News
        </span>
      </div>
      <div className="overflow-hidden flex-1 min-w-0 relative">
        {/* Fade edges */}
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
  );
};
