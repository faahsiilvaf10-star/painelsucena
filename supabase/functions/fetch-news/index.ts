import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch from Google News RSS for football (Brazil) and world news
    const feeds = [
      {
        url: "https://news.google.com/rss/search?q=futebol+brasileiro&hl=pt-BR&gl=BR&ceid=BR:pt-419",
        category: "⚽ Futebol",
      },
      {
        url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FuQjBHZ0pDVWlnQVAB?hl=pt-BR&gl=BR&ceid=BR:pt-419",
        category: "🌍 Mundo",
      },
    ];

    const allItems: { title: string; category: string; link: string; pubDate: string; source: string; imageUrl: string }[] = [];

    for (const feed of feeds) {
      try {
        const response = await fetch(feed.url, {
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        const xml = await response.text();

        // Simple XML parsing for RSS items
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        const titleRegex = /<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/;
        const linkRegex = /<link>(.*?)<\/link>/;
        const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
        const sourceRegex = /<source[^>]*url="([^"]*)"[^>]*>(.*?)<\/source>/;
        const imageRegex = /<media:content[^>]*url="([^"]*)"[^>]*>|<enclosure[^>]*url="([^"]*)"[^>]*type="image[^"]*"[^>]*>|<img[^>]*src="([^"]*)"[^>]*>/;

        let match;
        let count = 0;
        while ((match = itemRegex.exec(xml)) !== null && count < 8) {
          const itemXml = match[1];
          const titleMatch = itemXml.match(titleRegex);
          const linkMatch = itemXml.match(linkRegex);
          const pubDateMatch = itemXml.match(pubDateRegex);
          const sourceMatch = itemXml.match(sourceRegex);

          const title = titleMatch ? (titleMatch[1] || titleMatch[2] || "").trim() : "";
          const link = linkMatch ? linkMatch[1] : "";
          let sourceDomain = "";
          try {
            const sourceUrl = sourceMatch ? sourceMatch[1] : link;
            if (sourceUrl) {
              sourceDomain = new URL(sourceUrl).hostname.replace("www.", "");
            }
          } catch {}

          if (title) {
            allItems.push({
              title,
              category: feed.category,
              link,
              pubDate: pubDateMatch ? pubDateMatch[1] : "",
              source: sourceDomain,
            });
            count++;
          }
        }
      } catch (e) {
        console.error(`Error fetching feed ${feed.category}:`, e);
      }
    }

    // Shuffle and interleave
    const shuffled = allItems.sort(() => Math.random() - 0.5);

    return new Response(JSON.stringify({ items: shuffled }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ items: [], error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
