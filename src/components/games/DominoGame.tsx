import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Loader2, RotateCcw, RefreshCw, X, Bot, Users, Brain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

// ── Types ──
type DominoTile = [number, number];
type AIDifficulty = "easy" | "medium" | "hard";

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
  if (leftEnd === -1) return "both";
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

// ── AI Logic ──
function aiChooseTile(
  hand: DominoTile[],
  state: GameState,
  difficulty: AIDifficulty
): { tileIndex: number; side: "left" | "right" } | null {
  const playable: { tileIndex: number; side: "left" | "right"; score: number }[] = [];

  for (let i = 0; i < hand.length; i++) {
    const tile = hand[i];
    const match = canPlay(tile, state.boardLeftEnd, state.boardRightEnd);
    if (!match) continue;

    const tilePips = tile[0] + tile[1];
    const isDouble = tile[0] === tile[1];

    if (match === "left" || match === "both") {
      let score = tilePips;
      if (difficulty === "hard") {
        if (isDouble) score += 5;
        score += tilePips * 2;
      } else if (difficulty === "medium") {
        score += tilePips;
      }
      playable.push({ tileIndex: i, side: "left", score });
    }
    if (match === "right" || match === "both") {
      let score = tilePips;
      if (difficulty === "hard") {
        if (isDouble) score += 5;
        score += tilePips * 2;
      } else if (difficulty === "medium") {
        score += tilePips;
      }
      playable.push({ tileIndex: i, side: "right", score });
    }
  }

  if (playable.length === 0) return null;

  if (difficulty === "easy") {
    return playable[Math.floor(Math.random() * playable.length)];
  }

  if (difficulty === "medium") {
    // 50% chance random, 50% best
    if (Math.random() < 0.5) {
      return playable[Math.floor(Math.random() * playable.length)];
    }
  }

  // Medium (50%) and Hard: pick highest score
  playable.sort((a, b) => b.score - a.score);
  return playable[0];
}

function aiPlayTurn(state: GameState, difficulty: AIDifficulty): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const hand = newState.player2Hand;

  // Try to play
  const choice = aiChooseTile(hand, newState, difficulty);

  if (choice) {
    const tile = hand[choice.tileIndex];
    hand.splice(choice.tileIndex, 1);

    if (newState.board.length === 0) {
      newState.board.push(tile);
      newState.boardLeftEnd = tile[0];
      newState.boardRightEnd = tile[1];
    } else if (choice.side === "left") {
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
    newState.currentTurn = "player1";
    return newState;
  }

  // No play: draw from boneyard
  if (newState.boneyard.length > 0) {
    const drawn = newState.boneyard.pop()!;
    hand.push(drawn);
    // Check if drawn tile can play
    if (hasAnyPlay(hand, newState.boardLeftEnd, newState.boardRightEnd)) {
      // Recursively try again with the new hand
      return aiPlayTurn(newState, difficulty);
    }
    // If boneyard empty now and still can't play, pass
    if (newState.boneyard.length === 0 && !hasAnyPlay(hand, newState.boardLeftEnd, newState.boardRightEnd)) {
      newState.passCount += 1;
      newState.currentTurn = "player1";
    }
    // Otherwise keep drawing (return current state, AI still has turn)
    if (newState.boneyard.length > 0 && !hasAnyPlay(hand, newState.boardLeftEnd, newState.boardRightEnd)) {
      return aiPlayTurn(newState, difficulty);
    }
    // If can play now, play
    if (hasAnyPlay(hand, newState.boardLeftEnd, newState.boardRightEnd)) {
      return aiPlayTurn(newState, difficulty);
    }
    newState.passCount += 1;
    newState.currentTurn = "player1";
    return newState;
  }

  // No boneyard, can't play: pass
  newState.passCount += 1;
  newState.currentTurn = "player1";
  return newState;
}

// ── Dot patterns for domino face ──
const DOT_POSITIONS: Record<number, [number, number][]> = {
  0: [],
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
};

function DominoFace({ value, size }: { value: number; size: number }) {
  const dots = DOT_POSITIONS[value] || [];
  const dotR = size < 28 ? 2.5 : 3.5;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="block">
      {dots.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={dotR / (size / 100) * 2.5} fill="currentColor" />
      ))}
    </svg>
  );
}

// ── Tile Visual ──
function DominoTileVisual({ tile, size = "md", onClick, disabled, highlight, vertical }: {
  tile: DominoTile;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  disabled?: boolean;
  highlight?: boolean;
  vertical?: boolean;
}) {
  const dims = {
    sm: { w: 28, h: 14, face: 12 },
    md: { w: 48, h: 24, face: 22 },
    lg: { w: 60, h: 30, face: 28 },
  }[size];

  if (vertical) {
    return (
      <motion.button
        onClick={onClick}
        disabled={disabled}
        whileTap={!disabled ? { scale: 0.9 } : {}}
        whileHover={!disabled ? { y: -4 } : {}}
        className={`rounded-lg shadow-md flex flex-col items-center justify-center transition-all
          ${highlight
            ? "bg-white ring-2 ring-yellow-400 shadow-yellow-400/30 shadow-lg"
            : "bg-white/95"}
          ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:shadow-lg"}
        `}
        style={{ width: dims.h + 2, height: dims.w + 2 }}
      >
        <div className="text-slate-800" style={{ width: dims.face, height: dims.face }}>
          <DominoFace value={tile[0]} size={dims.face} />
        </div>
        <div className="w-3/5 h-px bg-slate-300 my-px" />
        <div className="text-slate-800" style={{ width: dims.face, height: dims.face }}>
          <DominoFace value={tile[1]} size={dims.face} />
        </div>
      </motion.button>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={!disabled ? { scale: 0.9 } : {}}
      whileHover={!disabled ? { y: -6, scale: 1.05 } : {}}
      className={`rounded-lg shadow-md flex items-center justify-center transition-all
        ${highlight
          ? "bg-white ring-2 ring-yellow-400 shadow-yellow-400/30 shadow-lg"
          : "bg-white/95"}
        ${disabled ? "opacity-70 cursor-not-allowed" : "cursor-pointer hover:shadow-lg"}
      `}
      style={{ width: dims.w + 4, height: dims.h + 4 }}
    >
      <div className="text-slate-800" style={{ width: dims.face, height: dims.face }}>
        <DominoFace value={tile[0]} size={dims.face} />
      </div>
      <div className="w-px h-3/5 bg-slate-300 mx-px" />
      <div className="text-slate-800" style={{ width: dims.face, height: dims.face }}>
        <DominoFace value={tile[1]} size={dims.face} />
      </div>
    </motion.button>
  );
}

// ── Scoreboard ──
function Scoreboard({ myName, opName, myPips, opPips, boneyardCount, boardCount, isMyTurn }: {
  myName: string; opName: string; myPips: number; opPips: number;
  boneyardCount: number; boardCount: number; isMyTurn: boolean;
}) {
  return (
    <div className="bg-sky-900/80 backdrop-blur rounded-xl px-3 py-2 flex items-center justify-between text-white text-xs font-bold">
      <div className="flex items-center gap-3">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider opacity-70">EU</div>
          <div className="text-lg">{myPips}</div>
        </div>
        <div className="w-px h-8 bg-white/20" />
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider opacity-70">{opName.length > 6 ? opName.slice(0, 6) + "…" : opName}</div>
          <div className="text-lg">{opPips}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider opacity-70">DORME</div>
          <div className="text-lg">{boneyardCount}</div>
        </div>
        <div className="w-px h-8 bg-white/20" />
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider opacity-70">MESA</div>
          <div className="text-lg">{boardCount}</div>
        </div>
      </div>
    </div>
  );
}

const DIFFICULTY_CONFIG: Record<AIDifficulty, { label: string; emoji: string; description: string; color: string; borderColor: string }> = {
  easy: {
    label: "Fácil",
    emoji: "🟢",
    description: "IA joga aleatoriamente",
    color: "from-emerald-500/20 to-green-500/20",
    borderColor: "border-emerald-500/40 hover:border-emerald-500",
  },
  medium: {
    label: "Médio",
    emoji: "🟡",
    description: "IA com estratégia moderada",
    color: "from-amber-500/20 to-yellow-500/20",
    borderColor: "border-amber-500/40 hover:border-amber-500",
  },
  hard: {
    label: "Difícil",
    emoji: "🔴",
    description: "IA com estratégia avançada",
    color: "from-red-500/20 to-rose-500/20",
    borderColor: "border-red-500/40 hover:border-red-500",
  },
};

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

  // AI mode state
  const [aiMode, setAiMode] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>("medium");
  const [aiGameState, setAiGameState] = useState<GameState | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiWinner, setAiWinner] = useState<"player1" | "player2" | null>(null);
  const aiThinkingRef = useRef(false);

  const playerName = profile?.full_name || "Jogador";
  const myRole = currentGame?.player1_id === user?.id ? "player1" : "player2";

  // For online mode
  const isMyTurnOnline = currentGame?.game_state?.currentTurn === myRole;
  const myHandOnline = currentGame?.game_state?.[myRole === "player1" ? "player1Hand" : "player2Hand"] || [];
  const opponentHandOnline = currentGame?.game_state?.[myRole === "player1" ? "player2Hand" : "player1Hand"] || [];
  const opponentNameOnline = myRole === "player1" ? currentGame?.player2_name : currentGame?.player1_name;
  const gsOnline = currentGame?.game_state;

  // For AI mode
  const isMyTurnAI = aiGameState?.currentTurn === "player1";
  const myHandAI = aiGameState?.player1Hand || [];
  const opponentHandAI = aiGameState?.player2Hand || [];
  const gsAI = aiGameState;

  // Unified getters
  const isAI = aiMode && view === "playing";
  const gs = isAI ? gsAI : gsOnline;
  const isMyTurn = isAI ? isMyTurnAI : isMyTurnOnline;
  const myHand = isAI ? myHandAI : myHandOnline;
  const opponentHand = isAI ? opponentHandAI : opponentHandOnline;
  const opponentName = isAI ? `IA (${DIFFICULTY_CONFIG[aiDifficulty].label})` : (opponentNameOnline || "Oponente");

  // ── AI turn effect ──
  useEffect(() => {
    if (!isAI || !gsAI || gsAI.currentTurn !== "player2" || aiThinkingRef.current) return;
    if (aiWinner) return;

    aiThinkingRef.current = true;
    setAiThinking(true);

    const delay = aiDifficulty === "easy" ? 800 : aiDifficulty === "medium" ? 1200 : 1500;

    const timer = setTimeout(() => {
      const newState = aiPlayTurn(gsAI, aiDifficulty);

      // Check if game ended
      if (newState.player2Hand.length === 0) {
        setAiWinner("player2");
        setAiGameState(newState);
        setView("finished");
      } else if (newState.passCount >= 2) {
        const p1Pips = pipCount(newState.player1Hand);
        const p2Pips = pipCount(newState.player2Hand);
        setAiWinner(p1Pips <= p2Pips ? "player1" : "player2");
        setAiGameState(newState);
        setView("finished");
      } else {
        setAiGameState(newState);
      }

      setAiThinking(false);
      aiThinkingRef.current = false;
    }, delay);

    return () => {
      clearTimeout(timer);
      aiThinkingRef.current = false;
    };
  }, [isAI, gsAI, gsAI?.currentTurn, aiDifficulty, aiWinner]);

  // ── Online game functions ──
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

  useEffect(() => {
    if (!currentGame?.id || aiMode) return;
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
  }, [currentGame?.id, view, aiMode]);

  const createGame = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const state = createInitialState();
    const { data, error } = await supabase
      .from("domino_games")
      .insert({ player1_id: user.id, player1_name: playerName, game_state: state as any, status: "waiting" })
      .select()
      .single();
    if (error) { toast.error("Erro ao criar partida"); setLoading(false); return; }
    setCurrentGame(data as any);
    setView("waiting");
    setLoading(false);
  }, [user, playerName]);

  const joinGame = useCallback(async (game: DominoGameRow) => {
    if (!user) return;
    if (game.player1_id === user.id) { toast.error("Você não pode jogar contra si mesmo"); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("domino_games")
      .update({ player2_id: user.id, player2_name: playerName, status: "playing", updated_at: new Date().toISOString() })
      .eq("id", game.id)
      .eq("status", "waiting")
      .select()
      .single();
    if (error) { toast.error("Partida não disponível"); setLoading(false); fetchGames(); return; }
    setCurrentGame(data as any);
    setView("playing");
    setLoading(false);
  }, [user, playerName, fetchGames]);

  const cancelGame = useCallback(async () => {
    if (!currentGame) return;
    await supabase.from("domino_games").delete().eq("id", currentGame.id);
    setCurrentGame(null);
    setView("lobby");
  }, [currentGame]);

  // ── AI game functions ──
  const startAIGame = useCallback((difficulty: AIDifficulty) => {
    setAiMode(true);
    setAiDifficulty(difficulty);
    setAiWinner(null);
    setAiGameState(createInitialState());
    setSelectedTile(null);
    setView("playing");
  }, []);

  const aiPlaceTile = useCallback((tileIndex: number, side: "left" | "right") => {
    if (!gsAI || gsAI.currentTurn !== "player1") return;
    const tile = gsAI.player1Hand[tileIndex];
    if (!tile) return;

    const newState = JSON.parse(JSON.stringify(gsAI)) as GameState;
    const hand = newState.player1Hand;
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
    newState.currentTurn = "player2";

    if (hand.length === 0) {
      setAiWinner("player1");
      setAiGameState(newState);
      setView("finished");
      return;
    }

    setAiGameState(newState);
    setSelectedTile(null);
  }, [gsAI]);

  const aiDrawTile = useCallback(() => {
    if (!gsAI || gsAI.currentTurn !== "player1") return;

    const newState = JSON.parse(JSON.stringify(gsAI)) as GameState;

    if (newState.boneyard.length === 0) {
      newState.passCount += 1;
      newState.currentTurn = "player2";
      if (newState.passCount >= 2) {
        const p1Pips = pipCount(newState.player1Hand);
        const p2Pips = pipCount(newState.player2Hand);
        setAiWinner(p1Pips <= p2Pips ? "player1" : "player2");
        setAiGameState(newState);
        setView("finished");
        return;
      }
      setAiGameState(newState);
      return;
    }

    const drawn = newState.boneyard.pop()!;
    newState.player1Hand.push(drawn);

    if (!hasAnyPlay(newState.player1Hand, newState.boardLeftEnd, newState.boardRightEnd) && newState.boneyard.length === 0) {
      newState.passCount += 1;
      newState.currentTurn = "player2";
    }

    setAiGameState(newState);
  }, [gsAI]);

  // ── Online game tile placement ──
  const placeTileAtSide = useCallback(async (tileIndex: number, side: "left" | "right") => {
    if (isAI) {
      aiPlaceTile(tileIndex, side);
      return;
    }
    if (!currentGame || !gsOnline || !isMyTurnOnline) return;
    const tile = myHandOnline[tileIndex];
    if (!tile) return;

    const newState = JSON.parse(JSON.stringify(gsOnline)) as GameState;
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
    if (hand.length === 0) { status = "finished"; winnerId = user!.id; }

    await supabase.from("domino_games").update({
      game_state: newState as any, status, winner_id: winnerId, updated_at: new Date().toISOString(),
    }).eq("id", currentGame.id);
    setSelectedTile(null);
  }, [isAI, aiPlaceTile, currentGame, gsOnline, isMyTurnOnline, myHandOnline, myRole, user]);

  const drawTile = useCallback(async () => {
    if (isAI) {
      aiDrawTile();
      return;
    }
    if (!currentGame || !gsOnline || !isMyTurnOnline) return;
    if (gsOnline.boneyard.length === 0) {
      const newState = JSON.parse(JSON.stringify(gsOnline)) as GameState;
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
        game_state: newState as any, status, winner_id: winnerId, updated_at: new Date().toISOString(),
      }).eq("id", currentGame.id);
      return;
    }

    const newState = JSON.parse(JSON.stringify(gsOnline)) as GameState;
    const drawn = newState.boneyard.pop()!;
    const hand = myRole === "player1" ? newState.player1Hand : newState.player2Hand;
    hand.push(drawn);

    if (!hasAnyPlay(hand, newState.boardLeftEnd, newState.boardRightEnd) && newState.boneyard.length === 0) {
      newState.passCount += 1;
      newState.currentTurn = myRole === "player1" ? "player2" : "player1";
    }

    await supabase.from("domino_games").update({
      game_state: newState as any, updated_at: new Date().toISOString(),
    }).eq("id", currentGame.id);
  }, [isAI, aiDrawTile, currentGame, gsOnline, isMyTurnOnline, myRole]);

  const handleTileClick = useCallback((index: number) => {
    if (!gs || !isMyTurn) return;
    const tile = myHand[index];
    const match = canPlay(tile, gs.boardLeftEnd, gs.boardRightEnd);
    if (!match) { toast.error("Essa peça não encaixa!"); return; }
    if (match === "both" && gs.board.length > 0) { setSelectedTile(index); return; }
    setSelectedTile(index);
    setTimeout(() => {
      if (match === "left" || match === "both") placeTileAtSide(index, "left");
      else placeTileAtSide(index, "right");
    }, 0);
  }, [gs, isMyTurn, myHand, placeTileAtSide]);

  const canPlayAny = gs ? hasAnyPlay(myHand, gs.boardLeftEnd, gs.boardRightEnd) : false;
  const isWinner = isAI ? aiWinner === "player1" : currentGame?.winner_id === user?.id;

  // ── LOBBY ──
  if (view === "lobby") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Voltar aos Games
        </Button>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 via-sky-500 to-blue-700 p-6 text-white text-center shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-10 space-y-3"
          >
            <div className="text-6xl filter drop-shadow-lg">🁣</div>
            <h2 className="text-2xl font-black tracking-tight">Dominó</h2>
            <p className="text-sm text-white/80">Jogue online ou contra a IA!</p>
          </motion.div>
        </div>

        {/* AI Mode Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Jogar contra IA</h3>
          </div>
          <div className="grid gap-2">
            {(["easy", "medium", "hard"] as AIDifficulty[]).map((diff, i) => {
              const cfg = DIFFICULTY_CONFIG[diff];
              return (
                <motion.div
                  key={diff}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <button
                    onClick={() => startAIGame(diff)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${cfg.color} border-2 ${cfg.borderColor} transition-all hover:shadow-md active:scale-[0.98] text-left`}
                  >
                    <div className="text-2xl">{cfg.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground">{cfg.label}</p>
                        <Brain className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">{cfg.description}</p>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Online Mode Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Jogar Online</h3>
          </div>

          <Button
            onClick={createGame}
            disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold gap-2 shadow-lg"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Criar Partida Online
          </Button>
        </div>

        {/* Games list */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Partidas Disponíveis</h3>
          <Button variant="ghost" size="sm" onClick={fetchGames} disabled={refreshing} className="gap-1 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>

        {games.length === 0 ? (
          <div className="rounded-xl bg-muted/50 p-6 text-center text-sm text-muted-foreground">
            Nenhuma partida online disponível.
          </div>
        ) : (
          <div className="space-y-2">
            {games.map((game, i) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-sky-400/50 transition-all shadow-sm"
              >
                <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-xl">🁣</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{game.player1_name}</p>
                  <p className="text-xs text-muted-foreground">Aguardando oponente...</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => joinGame(game)}
                  disabled={loading || game.player1_id === user?.id}
                  className="bg-sky-500 hover:bg-sky-600 text-white"
                >
                  {game.player1_id === user?.id ? "Sua" : "Entrar"}
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── WAITING ──
  if (view === "waiting") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { cancelGame(); setView("lobby"); setCurrentGame(null); }} className="gap-1 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Voltar ao Lobby
        </Button>
        <div className="rounded-2xl bg-gradient-to-br from-sky-600 to-blue-700 p-10 text-center text-white space-y-4 shadow-xl">
          <Loader2 className="w-12 h-12 animate-spin mx-auto opacity-80" />
          <h2 className="text-xl font-black">Aguardando oponente...</h2>
          <p className="text-sm text-white/70">Compartilhe com um colega para ele entrar!</p>
          <Button variant="outline" onClick={cancelGame} className="border-white/30 text-white hover:bg-white/10">
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  // ── FINISHED ──
  if (view === "finished") {
    return (
      <div className="space-y-4">
        <div className={`rounded-2xl p-8 text-center text-white space-y-4 shadow-xl ${
          isWinner
            ? "bg-gradient-to-br from-emerald-500 to-teal-600"
            : "bg-gradient-to-br from-red-500 to-rose-600"
        }`}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="text-7xl"
          >
            {isWinner ? "🏆" : "😔"}
          </motion.div>
          <h2 className="text-2xl font-black">{isWinner ? "Você venceu!" : "Você perdeu!"}</h2>
          <p className="text-sm text-white/80">
            {isWinner ? "Parabéns pela vitória!" : `${opponentName} venceu a partida.`}
          </p>

          <div className="flex gap-3 justify-center">
            <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-3 text-center">
              <div className="text-2xl font-black">{pipCount(myHand)}</div>
              <div className="text-[10px] uppercase tracking-wider opacity-70">Meus pts</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-3 text-center">
              <div className="text-2xl font-black">{pipCount(opponentHand)}</div>
              <div className="text-[10px] uppercase tracking-wider opacity-70">Pts dele</div>
            </div>
          </div>

          <div className="flex gap-2 justify-center pt-2">
            {isAI ? (
              <>
                <Button onClick={() => startAIGame(aiDifficulty)} className="bg-white text-emerald-700 hover:bg-white/90 font-bold gap-2">
                  <RotateCcw className="w-4 h-4" /> Jogar Novamente
                </Button>
                <Button onClick={() => { setAiMode(false); setAiGameState(null); setAiWinner(null); setView("lobby"); }} variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  Lobby
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => { setView("lobby"); setCurrentGame(null); }} className="bg-white text-emerald-700 hover:bg-white/90 font-bold gap-2">
                  <RotateCcw className="w-4 h-4" /> Nova Partida
                </Button>
                <Button onClick={onBack} variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  Sair
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING ──
  if (view === "playing" && gs) {
    return (
      <div className="space-y-0 -mx-4 md:-mx-6">
        {/* Top bar */}
        <div className="px-3 pt-2 pb-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (isAI) {
                setAiMode(false);
                setAiGameState(null);
                setAiWinner(null);
              } else {
                setCurrentGame(null);
              }
              setView("lobby");
              setSelectedTile(null);
            }}
            className="gap-1 text-muted-foreground text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Sair
          </Button>
        </div>

        {/* Scoreboard */}
        <div className="px-3 pb-2">
          <Scoreboard
            myName={playerName}
            opName={opponentName}
            myPips={pipCount(myHand)}
            opPips={pipCount(opponentHand)}
            boneyardCount={gs.boneyard.length}
            boardCount={gs.board.length}
            isMyTurn={isMyTurn}
          />
        </div>

        {/* Opponent hand (face down) */}
        <div className="px-3 pb-1">
          <div className="flex items-center gap-1 justify-center">
            {opponentHand.map((_, i) => (
              <motion.div
                key={i}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="w-6 h-4 rounded bg-sky-800 border border-sky-700 shadow-sm"
              />
            ))}
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-1">
            {opponentName} • {opponentHand.length} peças
          </p>
        </div>

        {/* Board area */}
        <div className="relative min-h-[220px] bg-gradient-to-b from-sky-500 via-sky-400 to-sky-500 mx-0 overflow-hidden shadow-inner">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "20px 20px"
          }} />

          {gs.board.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[220px]">
              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-white/80 font-bold text-sm"
              >
                Jogue a primeira peça!
              </motion.p>
            </div>
          ) : (
            <div className="overflow-auto p-4 min-h-[220px] flex items-center justify-center">
              <div className="flex items-center gap-0.5 flex-wrap justify-center">
                {gs.board.map((tile, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, delay: i * 0.02 }}
                  >
                    <DominoTileVisual tile={tile} size="sm" disabled />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {gs.board.length > 0 && (
            <div className="absolute bottom-1 left-0 right-0 flex justify-between px-4">
              <span className="text-[10px] font-bold text-white/70 bg-black/20 px-2 py-0.5 rounded">← {gs.boardLeftEnd}</span>
              <span className="text-[10px] font-bold text-white/70 bg-black/20 px-2 py-0.5 rounded">{gs.boardRightEnd} →</span>
            </div>
          )}
        </div>

        {/* Turn indicator */}
        <div className="text-center py-2">
          {aiThinking ? (
            <Badge className="text-sm px-4 py-1 font-bold bg-amber-500 text-white shadow-lg gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> IA pensando...
            </Badge>
          ) : (
            <motion.div
              animate={isMyTurn ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Badge className={`text-sm px-4 py-1 font-bold ${
                isMyTurn
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                  : "bg-muted text-muted-foreground"
              }`}>
                {isMyTurn ? "✋ Sua vez!" : `Vez de ${opponentName}`}
              </Badge>
            </motion.div>
          )}
        </div>

        {/* Side selection modal */}
        <AnimatePresence>
          {selectedTile !== null && gs.board.length > 0 && canPlay(myHand[selectedTile], gs.boardLeftEnd, gs.boardRightEnd) === "both" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-3 rounded-xl bg-sky-900 text-white p-3 space-y-2 shadow-xl"
            >
              <p className="text-sm text-center font-bold">Onde encaixar?</p>
              <div className="flex gap-2 justify-center">
                <Button size="sm" onClick={() => placeTileAtSide(selectedTile, "left")}
                  className="bg-white text-sky-800 hover:bg-white/90 font-bold">
                  ← Esquerda ({gs.boardLeftEnd})
                </Button>
                <Button size="sm" onClick={() => placeTileAtSide(selectedTile, "right")}
                  className="bg-white text-sky-800 hover:bg-white/90 font-bold">
                  Direita ({gs.boardRightEnd}) →
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedTile(null)} className="text-white hover:bg-white/10">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* My hand */}
        <div className={`px-3 pb-3 pt-1 rounded-t-2xl ${isMyTurn && !aiThinking ? "bg-sky-50 dark:bg-sky-950/30" : "bg-card"} transition-colors`}>
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-bold text-foreground">Suas peças ({myHand.length})</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {myHand.map((tile, i) => {
              const match = canPlay(tile, gs.boardLeftEnd, gs.boardRightEnd);
              return (
                <motion.div
                  key={`${tile[0]}-${tile[1]}-${i}`}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <DominoTileVisual
                    tile={tile}
                    size="lg"
                    vertical
                    onClick={() => handleTileClick(i)}
                    disabled={!isMyTurn || !match || aiThinking}
                    highlight={isMyTurn && !!match && !aiThinking}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Draw / Pass button */}
        {isMyTurn && !canPlayAny && !aiThinking && (
          <div className="text-center pb-4 px-3">
            <Button onClick={drawTile} className="bg-sky-600 hover:bg-sky-700 text-white font-bold gap-2 w-full shadow-lg">
              {gs.boneyard.length > 0
                ? `🦴 Comprar peça (${gs.boneyard.length})`
                : "⏭️ Passar a vez"
              }
            </Button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
