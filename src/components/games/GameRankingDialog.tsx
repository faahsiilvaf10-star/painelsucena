import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Medal, Crown, Star } from "lucide-react";
import { GameScore } from "@/hooks/useGameScores";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import crownFrame from "@/assets/king-crown-frame.png";

const GAME_INFO: Record<string, { emoji: string; label: string }> = {
  recycling: { emoji: "♻️", label: "Coleta Seletiva" },
  epi: { emoji: "🦺", label: "Quiz EPIs" },
  rocagem: { emoji: "🌾", label: "Quiz Roçagem" },
  gabiao: { emoji: "🪨", label: "Quiz Gabião" },
  checkers: { emoji: "♟️", label: "Damas" },
  domino: { emoji: "🁫", label: "Dominó" },
};

function MedalIcon({ position }: { position: number }) {
  if (position === 0) return <Crown className="w-5 h-5 text-yellow-500" />;
  if (position === 1) return <Medal className="w-5 h-5 text-gray-400" />;
  if (position === 2) return <Medal className="w-5 h-5 text-amber-700" />;
  return <span className="text-sm text-muted-foreground font-bold w-5 text-center">{position + 1}</span>;
}

interface GameRankingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  scores: GameScore[] | null;
  boardStats: any[] | null;
}

export function GameRankingDialog({ open, onOpenChange, gameId, scores, boardStats }: GameRankingDialogProps) {
  const isBoardGame = gameId === "checkers" || gameId === "domino";
  const info = GAME_INFO[gameId] || { emoji: "🎮", label: gameId };

  const prevMonth = format(subMonths(new Date(), 1), "yyyy-MM");
  const prevMonthLabel = format(subMonths(new Date(), 1), "MMMM 'de' yyyy", { locale: ptBR });

  const { data: champion } = useQuery({
    queryKey: ["monthly-champion", gameId, prevMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_game_champions")
        .select("*")
        .eq("game_id", gameId)
        .eq("month_year", prevMonth)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // For full ranking, fetch more data for quiz games
  const { data: fullScores } = useQuery({
    queryKey: ["full-game-scores", gameId],
    queryFn: async () => {
      if (isBoardGame) return null;
      const { data, error } = await supabase
        .from("game_scores")
        .select("*")
        .eq("game_id", gameId)
        .order("score", { ascending: false })
        .limit(100);
      if (error) throw error;
      // Deduplicate by user_id (keep best score)
      const seen = new Set<string>();
      return (data as GameScore[]).filter(r => {
        if (seen.has(r.user_id)) return false;
        seen.add(r.user_id);
        return true;
      });
    },
    enabled: open && !isBoardGame,
  });

  const { data: fullBoardStats } = useQuery({
    queryKey: ["full-board-stats", gameId],
    queryFn: async () => {
      if (!isBoardGame) return null;
      const table = gameId === "checkers" ? "checkers_stats" : "domino_stats";
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("wins", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: open && isBoardGame,
  });

  const displayScores = fullScores || scores || [];
  const displayBoard = fullBoardStats || boardStats || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{info.emoji}</span>
            <span>{info.label}</span>
            <Trophy className="w-5 h-5 text-yellow-500" />
          </DialogTitle>
        </DialogHeader>

        {/* Previous month champion */}
        {champion && (
          <div className="rounded-xl bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 border border-yellow-500/30 p-3 mb-2">
            <div className="flex items-center gap-1.5 mb-2">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">
                Campeão de {prevMonthLabel}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="w-10 h-10 ring-2 ring-yellow-500">
                  <AvatarImage src={champion.avatar_url || undefined} />
                  <AvatarFallback className="text-sm font-bold">{champion.user_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <img 
                  src={crownFrame} 
                  alt="" 
                  className="absolute -top-3 -left-1 w-12 h-6 object-contain pointer-events-none" 
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground truncate">{champion.user_name}</p>
                <p className="text-xs text-muted-foreground">
                  {champion.game_type === "board" ? `${champion.score} vitórias` : `${champion.score} pontos`}
                </p>
              </div>
              <span className="text-2xl">👑</span>
            </div>
          </div>
        )}

        {/* Full ranking */}
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Ranking Atual</span>
        </div>

        <div className="overflow-y-auto flex-1 space-y-1.5 pr-1">
          {!isBoardGame && displayScores.map((s, i) => (
            <div key={s.id} className={`flex items-center gap-2 p-2 rounded-lg ${i === 0 ? "bg-yellow-500/10 border border-yellow-500/20" : i < 3 ? "bg-muted/50" : "bg-muted/30"}`}>
              <MedalIcon position={i} />
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarImage src={s.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{s.user_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">
                {s.user_name.split(" ")[0]}
              </span>
              <span className="text-xs font-bold text-primary shrink-0">{s.score} pts</span>
            </div>
          ))}
          {isBoardGame && displayBoard.map((s: any, i: number) => (
            <div key={s.id} className={`flex items-center gap-2 p-2 rounded-lg ${i === 0 ? "bg-yellow-500/10 border border-yellow-500/20" : i < 3 ? "bg-muted/50" : "bg-muted/30"}`}>
              <MedalIcon position={i} />
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarImage src={s.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{s.user_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">
                {s.user_name.split(" ")[0]}
              </span>
              <div className="flex gap-2 shrink-0 text-xs font-bold">
                <span className="text-green-600 dark:text-green-400">{s.wins}V</span>
                <span className="text-red-500 dark:text-red-400">{s.losses}D</span>
              </div>
            </div>
          ))}
          {!isBoardGame && displayScores.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">Nenhuma pontuação registrada ainda.</p>
          )}
          {isBoardGame && displayBoard.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">Nenhuma partida registrada ainda.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
