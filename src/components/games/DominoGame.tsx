import { useState, useCallback, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Plus, Loader2, Trophy, RotateCcw, RefreshCw, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

// ── Types ──
type DominoTile = [number, number];

interface GameState {
  board: DominoTile[];
  boardLeftEnd: number;
  boardRightEnd: number;
  player1Hand: DominoTile[];
  player2Hand: DominoTile[];
  boneyard: DominoTile[];
  currentTurn: "player1" | "player2";
  passCount: number;
}

interface DominoGameRow {
  id: string;
  player1_id: string;
  player1_name: string;
  player2_id: string | null;
  player2_name: string | null;
  game_state: GameState;
  status: string;
  winner_id: string | null;
  created_at: string;
  updated_at: string;
}

// ── Domino Logic ──
function generateAllTiles(): DominoTile[] {
  const tiles: DominoTile[] = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      tiles.push([i, j]);
    }
  }
  return tiles;
}

function shuffleTiles(tiles: DominoTile[]): DominoTile[] {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function createInitialState(): GameState {
  const tiles = shuffleTiles(generateAllTiles());
  return {
    board: [],
    boardLeftEnd: -1,
    boardRightEnd: -1,
    player1Hand: tiles.slice(0, 7),
    player2Hand: tiles.slice(7, 14),
    boneyard: tiles.slice(14),
    currentTurn: "player1",
    passCount: 0,
  };
}

function canPlay(tile: DominoTile, leftEnd: number, rightEnd: number): "left" | "right" | "both" | null {
  if (leftEnd === -1) return "both"; // empty board
  const matchLeft = tile[0] === leftEnd || tile[1] === leftEnd;
  const matchRight = tile[0] === rightEnd || tile[1] === rightEnd;
  if (matchLeft && matchRight) return "both";
  if (matchLeft) return "left";
  if (matchRight) return "right";
  return null;
}

function hasAnyPlay(hand: DominoTile[], leftEnd: number, rightEnd: number): boolean {
  return hand.some(t => canPlay(t, leftEnd, rightEnd) !== null);
}

function pipCount(hand: DominoTile[]): number {
  return hand.reduce((sum, [a, b]) => sum + a + b, 0);
}

// ── Tile Visual ──
function DominoTileVisual({ tile, size = "md", onClick, disabled, highlight }: {
  tile: DominoTile;
  size?: "sm" | "md";
  onClick?: () => void;
  disabled?: boolean;
  highlight?: boolean;
}) {
  const sz = size === "sm" ? "w-10 h-5" : "w-14 h-7";
  const numSz = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={!disabled ? { scale: 0.9 } : {}}
      className={`${sz} rounded-md border-2 flex items-center justify-center gap-0 font-bold ${numSz} transition-all
        ${highlight ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/30" : "border-border bg-card"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary/50 hover:shadow"}
      `}
    >
      <span className="flex-1 text-center text-foreground">{tile[0]}</span>
      <span className="w-px h-3/5 bg-border" />
      <span className="flex-1 text-center text-foreground">{tile[1]}</span>
    </motion.button>
  );
}

// ── Main Component ──
export function DominoGame({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [view, setView] = useState<"lobby" | "waiting" | "playing" | "finished">("lobby");
  const [games, setGames] = useState<DominoGameRow[]>([]);
  const [currentGame, setCurrentGame] = useState<DominoGameRow | null>(null);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const playerName = profile?.full_name || "Jogador";
  const myRole = currentGame?.player1_id === user?.id ? "player1" : "player2";
  const isMyTurn = currentGame?.game_state?.currentTurn === myRole;
  const myHand = currentGame?.game_state?.[myRole === "player1" ? "player1Hand" : "player2Hand"] || [];
  const opponentHand = currentGame?.game_state?.[myRole === "player1" ? "player2Hand" : "player1Hand"] || [];
  const opponentName = myRole === "player1" ? currentGame?.player2_name : currentGame?.player1_name;
  const gs = currentGame?.game_state;

  // Fetch lobby
  const fetchGames = useCallback(async () => {
    setRefreshing(true);
    const { data } = await supabase
      .from("domino_games")
      .select("*")
      .eq("status", "waiting")
      .order("created_at", { ascending: false });
    setGames((data as any[]) || []);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (view === "lobby") fetchGames();
  }, [view, fetchGames]);

  // Realtime subscription
  useEffect(() => {
    if (!currentGame?.id) return;

    const channel = supabase
      .channel(`domino-${currentGame.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "domino_games", filter: `id=eq.${currentGame.id}` },
        (payload) => {
          const updated = payload.new as any;
          setCurrentGame(updated);
          if (updated.status === "playing" && view === "waiting") setView("playing");
          if (updated.status === "finished") setView("finished");
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentGame?.id, view]);

  // Create game
  const createGame = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const state = createInitialState();
    const { data, error } = await supabase
      .from("domino_games")
      .insert({
        player1_id: user.id,
        player1_name: playerName,
        game_state: state as any,
        status: "waiting",
      })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao criar partida");
      setLoading(false);
      return;
    }
    setCurrentGame(data as any);
    setView("waiting");
    setLoading(false);
  }, [user, playerName]);

  // Join game
  const joinGame = useCallback(async (game: DominoGameRow) => {
    if (!user) return;
    if (game.player1_id === user.id) {
      toast.error("Você não pode jogar contra si mesmo");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("domino_games")
      .update({
        player2_id: user.id,
        player2_name: playerName,
        status: "playing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", game.id)
      .eq("status", "waiting")
      .select()
      .single();

    if (error) {
      toast.error("Partida não disponível");
      setLoading(false);
      fetchGames();
      return;
    }
    setCurrentGame(data as any);
    setView("playing");
    setLoading(false);
  }, [user, playerName, fetchGames]);

  // Cancel waiting
  const cancelGame = useCallback(async () => {
    if (!currentGame) return;
    await supabase.from("domino_games").delete().eq("id", currentGame.id);
    setCurrentGame(null);
    setView("lobby");
  }, [currentGame]);

  // Place tile
  const placeTile = useCallback(async (side: "left" | "right") => {
    if (!currentGame || !gs || selectedTile === null || !isMyTurn) return;
    const tile = myHand[selectedTile];
    if (!tile) return;

    const newState = JSON.parse(JSON.stringify(gs)) as GameState;
    const hand = myRole === "player1" ? newState.player1Hand : newState.player2Hand;
    hand.splice(selectedTile, 1);

    if (newState.board.length === 0) {
      newState.board.push(tile);
      newState.boardLeftEnd = tile[0];
      newState.boardRightEnd = tile[1];
    } else if (side === "left") {
      const end = newState.boardLeftEnd;
      const oriented: DominoTile = tile[1] === end ? tile : [tile[1], tile[0]];
      newState.board.unshift(oriented);
      newState.boardLeftEnd = oriented[0];
    } else {
      const end = newState.boardRightEnd;
      const oriented: DominoTile = tile[0] === end ? tile : [tile[1], tile[0]];
      newState.board.push(oriented);
      newState.boardRightEnd = oriented[1];
    }

    newState.passCount = 0;
    newState.currentTurn = myRole === "player1" ? "player2" : "player1";

    // Check win
    let status = "playing";
    let winnerId: string | null = null;
    if (hand.length === 0) {
      status = "finished";
      winnerId = user!.id;
    }

    const { error } = await supabase
      .from("domino_games")
      .update({
        game_state: newState as any,
        status,
        winner_id: winnerId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentGame.id);

    if (error) toast.error("Erro ao jogar");
    setSelectedTile(null);
  }, [currentGame, gs, selectedTile, isMyTurn, myHand, myRole, user]);

  // Draw tile
  const drawTile = useCallback(async () => {
    if (!currentGame || !gs || !isMyTurn) return;
    if (gs.boneyard.length === 0) {
      // Pass
      const newState = JSON.parse(JSON.stringify(gs)) as GameState;
      newState.passCount += 1;
      newState.currentTurn = myRole === "player1" ? "player2" : "player1";

      let status = "playing";
      let winnerId: string | null = null;
      if (newState.passCount >= 2) {
        status = "finished";
        const p1Pips = pipCount(newState.player1Hand);
        const p2Pips = pipCount(newState.player2Hand);
        winnerId = p1Pips <= p2Pips ? currentGame.player1_id : currentGame.player2_id!;
      }

      await supabase.from("domino_games").update({
        game_state: newState as any,
        status,
        winner_id: winnerId,
        updated_at: new Date().toISOString(),
      }).eq("id", currentGame.id);
      return;
    }

    const newState = JSON.parse(JSON.stringify(gs)) as GameState;
    const drawn = newState.boneyard.pop()!;
    const hand = myRole === "player1" ? newState.player1Hand : newState.player2Hand;
    hand.push(drawn);

    // If still can't play after draw, pass turn
    if (!hasAnyPlay(hand, newState.boardLeftEnd, newState.boardRightEnd) && newState.boneyard.length === 0) {
      newState.passCount += 1;
      newState.currentTurn = myRole === "player1" ? "player2" : "player1";
    }

    await supabase.from("domino_games").update({
      game_state: newState as any,
      updated_at: new Date().toISOString(),
    }).eq("id", currentGame.id);
  }, [currentGame, gs, isMyTurn, myRole]);

  // Handle tile selection and placement
  const handleTileClick = useCallback((index: number) => {
    if (!gs || !isMyTurn) return;
    const tile = myHand[index];
    const match = canPlay(tile, gs.boardLeftEnd, gs.boardRightEnd);
    if (!match) {
      toast.error("Essa peça não encaixa!");
      return;
    }
    if (match === "both" && gs.board.length > 0) {
      setSelectedTile(index);
      return;
    }
    // Auto-place
    setSelectedTile(index);
    setTimeout(() => {
      if (match === "left" || match === "both") {
        placeTileAtSide(index, "left");
      } else {
        placeTileAtSide(index, "right");
      }
    }, 0);
  }, [gs, isMyTurn, myHand]);

  const placeTileAtSide = useCallback(async (tileIndex: number, side: "left" | "right") => {
    if (!currentGame || !gs || !isMyTurn) return;
    const tile = myHand[tileIndex];
    if (!tile) return;

    const newState = JSON.parse(JSON.stringify(gs)) as GameState;
    const hand = myRole === "player1" ? newState.player1Hand : newState.player2Hand;
    hand.splice(tileIndex, 1);

    if (newState.board.length === 0) {
      newState.board.push(tile);
      newState.boardLeftEnd = tile[0];
      newState.boardRightEnd = tile[1];
    } else if (side === "left") {
      const end = newState.boardLeftEnd;
      const oriented: DominoTile = tile[1] === end ? tile : [tile[1], tile[0]];
      newState.board.unshift(oriented);
      newState.boardLeftEnd = oriented[0];
    } else {
      const end = newState.boardRightEnd;
      const oriented: DominoTile = tile[0] === end ? tile : [tile[1], tile[0]];
      newState.board.push(oriented);
      newState.boardRightEnd = oriented[1];
    }

    newState.passCount = 0;
    newState.currentTurn = myRole === "player1" ? "player2" : "player1";

    let status = "playing";
    let winnerId: string | null = null;
    if (hand.length === 0) {
      status = "finished";
      winnerId = user!.id;
    }

    await supabase.from("domino_games").update({
      game_state: newState as any,
      status,
      winner_id: winnerId,
      updated_at: new Date().toISOString(),
    }).eq("id", currentGame.id);
    setSelectedTile(null);
  }, [currentGame, gs, isMyTurn, myHand, myRole, user]);

  const canPlayAny = gs ? hasAnyPlay(myHand, gs.boardLeftEnd, gs.boardRightEnd) : false;
  const isWinner = currentGame?.winner_id === user?.id;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => {
        if (view === "playing" || view === "waiting") {
          if (view === "waiting") cancelGame();
          setView("lobby");
          setCurrentGame(null);
          setSelectedTile(null);
        } else {
          onBack();
        }
      }} className="gap-1 text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> {view === "lobby" ? "Voltar aos Games" : "Voltar ao Lobby"}
      </Button>

      {/* LOBBY */}
      {view === "lobby" && (
        <div className="space-y-4">
          <Card className="border-2 border-dashed border-primary/30">
            <CardContent className="p-6 text-center space-y-4">
              <div className="text-6xl">🁣</div>
              <h2 className="text-xl font-bold text-foreground">Dominó Online</h2>
              <p className="text-sm text-muted-foreground">Jogue dominó contra outro usuário em tempo real!</p>
              <Button onClick={createGame} disabled={loading} size="lg" className="gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Criar Partida
              </Button>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Partidas Disponíveis</h3>
            <Button variant="ghost" size="sm" onClick={fetchGames} disabled={refreshing} className="gap-1 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          </div>

          {games.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma partida disponível. Crie uma e aguarde um oponente!
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {games.map((game) => (
                <Card key={game.id} className="border border-border hover:border-primary/50 transition-all">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="text-2xl">🁣</div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{game.player1_name}</p>
                      <p className="text-xs text-muted-foreground">Aguardando oponente...</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => joinGame(game)}
                      disabled={loading || game.player1_id === user?.id}
                    >
                      {game.player1_id === user?.id ? "Sua partida" : "Entrar"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WAITING */}
      {view === "waiting" && (
        <Card className="border-2 border-dashed border-primary/30">
          <CardContent className="p-8 text-center space-y-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
            <h2 className="text-lg font-bold text-foreground">Aguardando oponente...</h2>
            <p className="text-sm text-muted-foreground">Compartilhe com um colega para entrar na partida!</p>
            <Button variant="outline" onClick={cancelGame}>Cancelar</Button>
          </CardContent>
        </Card>
      )}

      {/* PLAYING */}
      {view === "playing" && gs && (
        <div className="space-y-3">
          {/* Opponent info */}
          <Card className="border border-border">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="text-lg">👤</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{opponentName}</p>
                <p className="text-xs text-muted-foreground">{opponentHand.length} peças</p>
              </div>
              {!isMyTurn && <Badge variant="secondary" className="text-xs">Vez do oponente</Badge>}
            </CardContent>
          </Card>

          {/* Board */}
          <Card className="border-2 border-border">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground mb-2 text-center">Mesa</p>
              {gs.board.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-6">Mesa vazia — jogue a primeira peça!</div>
              ) : (
                <div className="overflow-x-auto pb-2">
                  <div className="flex items-center gap-1 min-w-min mx-auto justify-center flex-wrap">
                    {gs.board.map((tile, i) => (
                      <DominoTileVisual key={i} tile={tile} size="sm" disabled />
                    ))}
                  </div>
                </div>
              )}
              {gs.board.length > 0 && (
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>← {gs.boardLeftEnd}</span>
                  <span>{gs.boardRightEnd} →</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Side selection */}
          <AnimatePresence>
            {selectedTile !== null && gs.board.length > 0 && canPlay(myHand[selectedTile], gs.boardLeftEnd, gs.boardRightEnd) === "both" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card className="border-2 border-primary">
                  <CardContent className="p-3 space-y-2">
                    <p className="text-sm text-center font-medium text-foreground">Onde encaixar?</p>
                    <div className="flex gap-2 justify-center">
                      <Button size="sm" onClick={() => placeTileAtSide(selectedTile, "left")} className="gap-1">
                        ← Esquerda ({gs.boardLeftEnd})
                      </Button>
                      <Button size="sm" onClick={() => placeTileAtSide(selectedTile, "right")} className="gap-1">
                        Direita ({gs.boardRightEnd}) →
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedTile(null)}><X className="w-4 h-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* My hand */}
          <Card className={`border-2 ${isMyTurn ? "border-primary" : "border-border"}`}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-foreground">Suas peças ({myHand.length})</p>
                {isMyTurn && <Badge className="text-xs bg-primary text-primary-foreground">Sua vez!</Badge>}
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {myHand.map((tile, i) => {
                  const match = canPlay(tile, gs.boardLeftEnd, gs.boardRightEnd);
                  return (
                    <DominoTileVisual
                      key={`${tile[0]}-${tile[1]}-${i}`}
                      tile={tile}
                      size="md"
                      onClick={() => handleTileClick(i)}
                      disabled={!isMyTurn || !match}
                      highlight={isMyTurn && !!match}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {isMyTurn && !canPlayAny && (
            <div className="text-center">
              <Button onClick={drawTile} variant="secondary" className="gap-2">
                {gs.boneyard.length > 0
                  ? `🦴 Comprar peça (${gs.boneyard.length} restantes)`
                  : "⏭️ Passar a vez"
                }
              </Button>
            </div>
          )}
        </div>
      )}

      {/* FINISHED */}
      {view === "finished" && currentGame && (
        <Card>
          <CardHeader className="text-center pb-2">
            <div className="text-5xl mb-2">{isWinner ? "🏆" : "😔"}</div>
            <CardTitle className="text-2xl">
              {isWinner ? "Você venceu!" : "Você perdeu!"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              {isWinner
                ? "Parabéns! Você zerou suas peças primeiro!"
                : `${opponentName} venceu a partida!`
              }
            </p>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-foreground">{myHand.length}</div>
                <div className="text-xs text-muted-foreground">Suas peças restantes</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-foreground">{opponentHand.length}</div>
                <div className="text-xs text-muted-foreground">Peças do oponente</div>
              </div>
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => { setView("lobby"); setCurrentGame(null); }} className="gap-2">
                <RotateCcw className="w-4 h-4" /> Nova Partida
              </Button>
              <Button onClick={onBack} variant="outline">Voltar</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
