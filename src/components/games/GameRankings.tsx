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

  return (
    <Card className="border border-border/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h3 className="font-bold text-foreground">Ranking dos Games</h3>
        </div>

        <Tabs defaultValue={gameIds.find(id => {
          if (id === "checkers") return checkersStats && checkersStats.length > 0;
          return quizScores?.[id]?.length;
        }) || "recycling"} className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            {gameIds.map(id => {
              const info = GAME_INFO[id];
              const hasData = id === "checkers"
                ? checkersStats && checkersStats.length > 0
                : quizScores?.[id]?.length;
              if (!hasData) return null;
              return (
                <TabsTrigger key={id} value={id} className="text-xs gap-1 flex-1 min-w-[70px]">
                  <span>{info.emoji}</span>
                  <span className="hidden sm:inline">{info.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {gameIds.filter(id => id !== "checkers").map(id => {
            const scores = quizScores?.[id] || [];
            if (scores.length === 0) return null;
            return (
              <TabsContent key={id} value={id} className="mt-3 space-y-2">
                {scores.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <MedalIcon position={i} />
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={s.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{s.user_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground flex-1 truncate">
                      {s.user_name.split(" ")[0]}
                    </span>
                    <Badge variant="secondary" className="text-xs gap-1">
                      {s.score} pts
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {s.correct_answers}/{s.total_questions}
                    </span>
                  </div>
                ))}
              </TabsContent>
            );
          })}

          {checkersStats && checkersStats.length > 0 && (
            <TabsContent value="checkers" className="mt-3 space-y-2">
              {checkersStats.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                  <MedalIcon position={i} />
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={s.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{s.user_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground flex-1 truncate">
                    {s.user_name.split(" ")[0]}
                  </span>
                  <Badge variant="secondary" className="text-xs gap-1 text-green-600">
                    {s.wins}V
                  </Badge>
                  <Badge variant="outline" className="text-xs gap-1 text-red-500">
                    {s.losses}D
                  </Badge>
                </div>
              ))}
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
