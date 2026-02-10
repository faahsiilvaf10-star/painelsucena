import { useTopScoresByGame } from "@/hooks/useGameScores";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Medal, Crown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const GAME_INFO: Record<string, { emoji: string; label: string }> = {
  recycling: { emoji: "♻️", label: "Coleta Seletiva" },
  epi: { emoji: "🦺", label: "Quiz EPIs" },
  rocagem: { emoji: "🌾", label: "Quiz Roçagem" },
  gabiao: { emoji: "🪨", label: "Quiz Gabião" },
  checkers: { emoji: "♟️", label: "Damas" },
};

function MedalIcon({ position }: { position: number }) {
  if (position === 0) return <Crown className="w-4 h-4 text-yellow-500" />;
  if (position === 1) return <Medal className="w-4 h-4 text-gray-400" />;
  if (position === 2) return <Medal className="w-4 h-4 text-amber-700" />;
  return <span className="text-xs text-muted-foreground font-bold w-4 text-center">{position + 1}</span>;
}

export function GameRankings() {
  const { data: quizScores, isLoading: loadingQuiz } = useTopScoresByGame();
  const { data: checkersStats, isLoading: loadingCheckers } = useQuery({
    queryKey: ["checkers-stats-ranking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkers_stats")
        .select("*")
        .order("wins", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const isLoading = loadingQuiz || loadingCheckers;
  const gameIds = ["recycling", "epi", "rocagem", "gabiao", "checkers"];
  const hasAnyData = !isLoading && (
    Object.values(quizScores || {}).some(arr => arr.length > 0) ||
    (checkersStats && checkersStats.length > 0)
  );

  if (isLoading) {
    return (
      <Card className="border border-border/50">
        <CardContent className="p-4 text-center text-muted-foreground text-sm">
          Carregando ranking...
        </CardContent>
      </Card>
    );
  }

  if (!hasAnyData) return null;

  const quizGames = gameIds.filter(id => {
    if (id === "checkers") return checkersStats && checkersStats.length > 0;
    return quizScores?.[id]?.length;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h3 className="font-bold text-foreground">Ranking dos Games</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {quizGames.map(id => {
          const info = GAME_INFO[id];
          const isCheckers = id === "checkers";
          const scores = isCheckers ? null : (quizScores?.[id] || []);
          const cStats = isCheckers ? checkersStats : null;

          return (
            <Card key={id} className="border border-border/50">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">{info.emoji}</span>
                  <span className="text-xs font-bold text-foreground truncate">{info.label}</span>
                </div>
                <div className="space-y-1.5">
                  {!isCheckers && scores && scores.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-1.5 p-1.5 rounded-md bg-muted/30">
                      <MedalIcon position={i} />
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={s.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">{s.user_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-foreground flex-1 truncate">
                        {s.user_name.split(" ")[0]}
                      </span>
                      <span className="text-[10px] font-bold text-primary">{s.score}</span>
                    </div>
                  ))}
                  {isCheckers && cStats && cStats.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-1.5 p-1.5 rounded-md bg-muted/30">
                      <MedalIcon position={i} />
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={s.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">{s.user_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-foreground flex-1 truncate">
                        {s.user_name.split(" ")[0]}
                      </span>
                      <span className="text-[10px] font-bold text-green-600 dark:text-green-400">{s.wins}V</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
