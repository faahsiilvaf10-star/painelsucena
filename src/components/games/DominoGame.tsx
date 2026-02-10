import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, RotateCcw, RefreshCw, X, Bot, Users, Brain, Plus, Maximize, Minimize } from "lucide-react";
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
  for (let i = 0; i <= 6; i++) for (let j = i; j <= 6; j++) tiles.push([i, j]);
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
    board: [], boardLeftEnd: -1, boardRightEnd: -1,
    player1Hand: tiles.slice(0, 7), player2Hand: tiles.slice(7, 14),
    boneyard: tiles.slice(14), currentTurn: "player1", passCount: 0,
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
function aiChooseTile(hand: DominoTile[], state: GameState, difficulty: AIDifficulty): { tileIndex: number; side: "left" | "right" } | null {
  const playable: { tileIndex: number; side: "left" | "right"; score: number }[] = [];
  for (let i = 0; i < hand.length; i++) {
    const tile = hand[i];
    const match = canPlay(tile, state.boardLeftEnd, state.boardRightEnd);
    if (!match) continue;
    const tilePips = tile[0] + tile[1];
    const isDouble = tile[0] === tile[1];
    if (match === "left" || match === "both") {
      let score = tilePips;
      if (difficulty === "hard") { if (isDouble) score += 5; score += tilePips * 2; }
      else if (difficulty === "medium") score += tilePips;
      playable.push({ tileIndex: i, side: "left", score });
    }
    if (match === "right" || match === "both") {
      let score = tilePips;
      if (difficulty === "hard") { if (isDouble) score += 5; score += tilePips * 2; }
      else if (difficulty === "medium") score += tilePips;
      playable.push({ tileIndex: i, side: "right", score });
    }
  }
  if (playable.length === 0) return null;
  if (difficulty === "easy") return playable[Math.floor(Math.random() * playable.length)];
  if (difficulty === "medium" && Math.random() < 0.5) return playable[Math.floor(Math.random() * playable.length)];
  playable.sort((a, b) => b.score - a.score);
  return playable[0];
}

function aiPlayTurn(state: GameState, difficulty: AIDifficulty): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const hand = newState.player2Hand;
  const choice = aiChooseTile(hand, newState, difficulty);
  if (choice) {
    const tile = hand[choice.tileIndex];
    hand.splice(choice.tileIndex, 1);
    if (newState.board.length === 0) {
      newState.board.push(tile); newState.boardLeftEnd = tile[0]; newState.boardRightEnd = tile[1];
    } else if (choice.side === "left") {
      const end = newState.boardLeftEnd;
      const oriented: DominoTile = tile[1] === end ? tile : [tile[1], tile[0]];
      newState.board.unshift(oriented); newState.boardLeftEnd = oriented[0];
    } else {
      const end = newState.boardRightEnd;
      const oriented: DominoTile = tile[0] === end ? tile : [tile[1], tile[0]];
      newState.board.push(oriented); newState.boardRightEnd = oriented[1];
    }
    newState.passCount = 0; newState.currentTurn = "player1"; return newState;
  }
  if (newState.boneyard.length > 0) {
    const drawn = newState.boneyard.pop()!; hand.push(drawn);
    if (hasAnyPlay(hand, newState.boardLeftEnd, newState.boardRightEnd)) return aiPlayTurn(newState, difficulty);
    if (newState.boneyard.length > 0) return aiPlayTurn(newState, difficulty);
    newState.passCount += 1; newState.currentTurn = "player1"; return newState;
  }
  newState.passCount += 1; newState.currentTurn = "player1"; return newState;
}

// ── Dot patterns for domino face ──
const DOT_POSITIONS: Record<number, [number, number][]> = {
  0: [],
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 22], [72, 22], [28, 50], [72, 50], [28, 78], [72, 78]],
};

function DominoFace({ value, size }: { value: number; size: number }) {
  const dots = DOT_POSITIONS[value] || [];
  const dotR = Math.max(9, size * 0.2);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="block">
      {dots.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={dotR} fill="#000000" />
      ))}
    </svg>
  );
}

// ── Tile Visual (paciencia.co style: white/cream tiles, black dots, rounded) ──
function DominoTileVisual({ tile, size = "md", onClick, disabled, highlight, vertical, faceDown }: {
  tile: DominoTile;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  disabled?: boolean;
  highlight?: boolean;
  vertical?: boolean;
  faceDown?: boolean;
}) {
  const dims = {
    sm: { w: 56, h: 28, face: 25 },
    md: { w: 72, h: 36, face: 33 },
    lg: { w: 90, h: 45, face: 42 },
  }[size];

  if (faceDown) {
    return (
      <div
        className="rounded-md shadow-md border border-white/30"
        style={{
          width: vertical ? dims.h + 4 : dims.w + 4,
          height: vertical ? dims.w + 4 : dims.h + 4,
          background: "linear-gradient(135deg, #f5f0e0 0%, #e8e0c8 100%)",
        }}
      />
    );
  }

  const tileStyle: React.CSSProperties = {
    background: highlight
      ? "linear-gradient(135deg, #fffff8 0%, #fff8e1 100%)"
      : "linear-gradient(135deg, #ffffff 0%, #f8f4e8 100%)",
    border: highlight ? "2px solid #c8a44e" : "1.5px solid #c4b888",
    boxShadow: highlight
      ? "0 4px 12px rgba(180, 140, 40, 0.35), inset 0 1px 0 rgba(255,255,255,0.9)"
      : "0 3px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.8)",
  };

  if (vertical) {
    return (
      <motion.button
        onClick={onClick}
        disabled={disabled}
        whileTap={!disabled ? { scale: 0.93 } : {}}
        whileHover={!disabled ? { y: -8, scale: 1.04 } : {}}
        className={`rounded-lg flex flex-col items-center justify-center transition-all
          ${disabled && !highlight ? "cursor-default" : "cursor-pointer"}
        `}
        style={{ width: dims.h + 6, height: dims.w + 6, ...tileStyle }}
      >
        <div style={{ width: dims.face, height: dims.face }}>
          <DominoFace value={tile[0]} size={dims.face} />
        </div>
        <div style={{ width: "60%", height: 1.5, background: "#b8a878", margin: "1px 0" }} />
        <div style={{ width: dims.face, height: dims.face }}>
          <DominoFace value={tile[1]} size={dims.face} />
        </div>
      </motion.button>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={!disabled ? { scale: 0.93 } : {}}
      whileHover={!disabled ? { y: -4, scale: 1.04 } : {}}
      className={`rounded-lg flex items-center justify-center transition-all
        ${disabled && !highlight ? "cursor-default" : "cursor-pointer"}
      `}
      style={{ width: dims.w + 4, height: dims.h + 6, ...tileStyle }}
    >
      <div style={{ width: dims.face, height: dims.face }}>
        <DominoFace value={tile[0]} size={dims.face} />
      </div>
      <div style={{ width: 1.5, height: "60%", background: "#b8a878", margin: "0 1px" }} />
      <div style={{ width: dims.face, height: dims.face }}>
        <DominoFace value={tile[1]} size={dims.face} />
      </div>
    </motion.button>
  );
}

// ── Scoreboard (golden/brown style like paciencia.co) ──
function ScoreboardBadge({ label, value, emoji }: { label: string; value: number; emoji?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="rounded-full px-4 py-1 text-center font-black text-lg shadow-md"
        style={{
          background: "linear-gradient(180deg, #8B6914 0%, #6B4F10 100%)",
          color: "#fff",
          border: "2px solid #a07818",
          minWidth: 48,
        }}
      >
        {value}
      </div>
      {emoji && <span className="text-xl">{emoji}</span>}
    </div>
  );
}

const DIFFICULTY_CONFIG: Record<AIDifficulty, { label: string; emoji: string; description: string }> = {
  easy: { label: "FÁCIL", emoji: "🟢", description: "IA joga aleatoriamente" },
  medium: { label: "MÉDIO", emoji: "🟡", description: "IA com estratégia moderada" },
  hard: { label: "DIFÍCIL", emoji: "🔴", description: "IA com estratégia avançada" },
};

// ── Fullscreen helpers ──
function requestFullscreen(el: HTMLElement) {
  if (el.requestFullscreen) el.requestFullscreen();
  else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
  else if ((el as any).msRequestFullscreen) (el as any).msRequestFullscreen();
}

function exitFullscreen() {
  if (document.exitFullscreen) document.exitFullscreen();
  else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
  else if ((document as any).msExitFullscreen) (document as any).msExitFullscreen();
}

function isFullscreen() {
  return !!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).msFullscreenElement);
}

// ── Green Felt Background ──
const FELT_BG: React.CSSProperties = {
  background: "radial-gradient(ellipse at center, #2d8a4e 0%, #1e6b3a 40%, #145428 80%, #0e3d1c 100%)",
};

const FELT_TEXTURE = (
  <div className="absolute inset-0 pointer-events-none" style={{
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
  }} />
);

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
  const [isFS, setIsFS] = useState(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // AI mode state
  const [aiMode, setAiMode] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>("medium");
  const [aiGameState, setAiGameState] = useState<GameState | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiWinner, setAiWinner] = useState<"player1" | "player2" | null>(null);
  const aiThinkingRef = useRef(false);

  const playerName = profile?.full_name || "Jogador";
  const myRole = currentGame?.player1_id === user?.id ? "player1" : "player2";

  const isMyTurnOnline = currentGame?.game_state?.currentTurn === myRole;
  const myHandOnline = currentGame?.game_state?.[myRole === "player1" ? "player1Hand" : "player2Hand"] || [];
  const opponentHandOnline = currentGame?.game_state?.[myRole === "player1" ? "player2Hand" : "player1Hand"] || [];
  const opponentNameOnline = myRole === "player1" ? currentGame?.player2_name : currentGame?.player1_name;
  const gsOnline = currentGame?.game_state;

  const isMyTurnAI = aiGameState?.currentTurn === "player1";
  const myHandAI = aiGameState?.player1Hand || [];
  const opponentHandAI = aiGameState?.player2Hand || [];
  const gsAI = aiGameState;

  const isAI = aiMode && view === "playing";
  const gs = isAI ? gsAI : gsOnline;
  const isMyTurn = isAI ? isMyTurnAI : isMyTurnOnline;
  const myHand = isAI ? myHandAI : myHandOnline;
  const opponentHand = isAI ? opponentHandAI : opponentHandOnline;
  const opponentName = isAI ? `IA (${DIFFICULTY_CONFIG[aiDifficulty].label})` : (opponentNameOnline || "Oponente");

  // Fullscreen tracking
  useEffect(() => {
    const handler = () => setIsFS(isFullscreen());
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      document.removeEventListener("webkitfullscreenchange", handler);
    };
  }, []);

  // Enter fullscreen when game starts
  useEffect(() => {
    if (view === "playing" && gameContainerRef.current && !isFullscreen()) {
      requestFullscreen(gameContainerRef.current);
    }
  }, [view]);

  // Exit fullscreen when leaving
  useEffect(() => {
    if (view !== "playing" && isFullscreen()) exitFullscreen();
  }, [view]);

  // ── AI turn effect ──
  useEffect(() => {
    if (!isAI || !gsAI || gsAI.currentTurn !== "player2" || aiThinkingRef.current) return;
    if (aiWinner) return;
    aiThinkingRef.current = true;
    setAiThinking(true);
    const delay = aiDifficulty === "easy" ? 800 : aiDifficulty === "medium" ? 1200 : 1500;
    const timer = setTimeout(() => {
      const newState = aiPlayTurn(gsAI, aiDifficulty);
      if (newState.player2Hand.length === 0) {
        setAiWinner("player2"); setAiGameState(newState); setView("finished");
      } else if (newState.passCount >= 2) {
        const p1Pips = pipCount(newState.player1Hand);
        const p2Pips = pipCount(newState.player2Hand);
        setAiWinner(p1Pips <= p2Pips ? "player1" : "player2");
        setAiGameState(newState); setView("finished");
      } else setAiGameState(newState);
      setAiThinking(false); aiThinkingRef.current = false;
    }, delay);
    return () => { clearTimeout(timer); aiThinkingRef.current = false; };
  }, [isAI, gsAI, gsAI?.currentTurn, aiDifficulty, aiWinner]);

  // ── Online game functions ──
  const fetchGames = useCallback(async () => {
    setRefreshing(true);
    const { data } = await supabase.from("domino_games").select("*").eq("status", "waiting").order("created_at", { ascending: false });
    setGames((data as any[]) || []);
    setRefreshing(false);
  }, []);

  useEffect(() => { if (view === "lobby") fetchGames(); }, [view, fetchGames]);

  useEffect(() => {
    if (!currentGame?.id || aiMode) return;
    const channel = supabase.channel(`domino-${currentGame.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "domino_games", filter: `id=eq.${currentGame.id}` },
        (payload) => {
          const updated = payload.new as any;
          setCurrentGame(updated);
          if (updated.status === "playing" && view === "waiting") setView("playing");
          if (updated.status === "finished") setView("finished");
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentGame?.id, view, aiMode]);

  const createGame = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const state = createInitialState();
    const { data, error } = await supabase.from("domino_games")
      .insert({ player1_id: user.id, player1_name: playerName, game_state: state as any, status: "waiting" })
      .select().single();
    if (error) { toast.error("Erro ao criar partida"); setLoading(false); return; }
    setCurrentGame(data as any); setView("waiting"); setLoading(false);
  }, [user, playerName]);

  const joinGame = useCallback(async (game: DominoGameRow) => {
    if (!user) return;
    if (game.player1_id === user.id) { toast.error("Você não pode jogar contra si mesmo"); return; }
    setLoading(true);
    const { data, error } = await supabase.from("domino_games")
      .update({ player2_id: user.id, player2_name: playerName, status: "playing", updated_at: new Date().toISOString() })
      .eq("id", game.id).eq("status", "waiting").select().single();
    if (error) { toast.error("Partida não disponível"); setLoading(false); fetchGames(); return; }
    setCurrentGame(data as any); setView("playing"); setLoading(false);
  }, [user, playerName, fetchGames]);

  const cancelGame = useCallback(async () => {
    if (!currentGame) return;
    await supabase.from("domino_games").delete().eq("id", currentGame.id);
    setCurrentGame(null); setView("lobby");
  }, [currentGame]);

  const startAIGame = useCallback((difficulty: AIDifficulty) => {
    setAiMode(true); setAiDifficulty(difficulty); setAiWinner(null);
    setAiGameState(createInitialState()); setSelectedTile(null); setView("playing");
  }, []);

  const aiPlaceTile = useCallback((tileIndex: number, side: "left" | "right") => {
    if (!gsAI || gsAI.currentTurn !== "player1") return;
    const tile = gsAI.player1Hand[tileIndex];
    if (!tile) return;
    const newState = JSON.parse(JSON.stringify(gsAI)) as GameState;
    const hand = newState.player1Hand;
    hand.splice(tileIndex, 1);
    if (newState.board.length === 0) {
      newState.board.push(tile); newState.boardLeftEnd = tile[0]; newState.boardRightEnd = tile[1];
    } else if (side === "left") {
      const end = newState.boardLeftEnd;
      const oriented: DominoTile = tile[1] === end ? tile : [tile[1], tile[0]];
      newState.board.unshift(oriented); newState.boardLeftEnd = oriented[0];
    } else {
      const end = newState.boardRightEnd;
      const oriented: DominoTile = tile[0] === end ? tile : [tile[1], tile[0]];
      newState.board.push(oriented); newState.boardRightEnd = oriented[1];
    }
    newState.passCount = 0; newState.currentTurn = "player2";
    if (hand.length === 0) { setAiWinner("player1"); setAiGameState(newState); setView("finished"); return; }
    setAiGameState(newState); setSelectedTile(null);
  }, [gsAI]);

  const aiDrawTile = useCallback(() => {
    if (!gsAI || gsAI.currentTurn !== "player1") return;
    const newState = JSON.parse(JSON.stringify(gsAI)) as GameState;
    if (newState.boneyard.length === 0) {
      newState.passCount += 1; newState.currentTurn = "player2";
      if (newState.passCount >= 2) {
        const p1Pips = pipCount(newState.player1Hand); const p2Pips = pipCount(newState.player2Hand);
        setAiWinner(p1Pips <= p2Pips ? "player1" : "player2"); setAiGameState(newState); setView("finished"); return;
      }
      setAiGameState(newState); return;
    }
    const drawn = newState.boneyard.pop()!; newState.player1Hand.push(drawn);
    if (!hasAnyPlay(newState.player1Hand, newState.boardLeftEnd, newState.boardRightEnd) && newState.boneyard.length === 0) {
      newState.passCount += 1; newState.currentTurn = "player2";
    }
    setAiGameState(newState);
  }, [gsAI]);

  const placeTileAtSide = useCallback(async (tileIndex: number, side: "left" | "right") => {
    if (isAI) { aiPlaceTile(tileIndex, side); return; }
    if (!currentGame || !gsOnline || !isMyTurnOnline) return;
    const tile = myHandOnline[tileIndex]; if (!tile) return;
    const newState = JSON.parse(JSON.stringify(gsOnline)) as GameState;
    const hand = myRole === "player1" ? newState.player1Hand : newState.player2Hand;
    hand.splice(tileIndex, 1);
    if (newState.board.length === 0) {
      newState.board.push(tile); newState.boardLeftEnd = tile[0]; newState.boardRightEnd = tile[1];
    } else if (side === "left") {
      const end = newState.boardLeftEnd;
      const oriented: DominoTile = tile[1] === end ? tile : [tile[1], tile[0]];
      newState.board.unshift(oriented); newState.boardLeftEnd = oriented[0];
    } else {
      const end = newState.boardRightEnd;
      const oriented: DominoTile = tile[0] === end ? tile : [tile[1], tile[0]];
      newState.board.push(oriented); newState.boardRightEnd = oriented[1];
    }
    newState.passCount = 0; newState.currentTurn = myRole === "player1" ? "player2" : "player1";
    let status = "playing"; let winnerId: string | null = null;
    if (hand.length === 0) { status = "finished"; winnerId = user!.id; }
    await supabase.from("domino_games").update({ game_state: newState as any, status, winner_id: winnerId, updated_at: new Date().toISOString() }).eq("id", currentGame.id);
    setSelectedTile(null);
  }, [isAI, aiPlaceTile, currentGame, gsOnline, isMyTurnOnline, myHandOnline, myRole, user]);

  const drawTile = useCallback(async () => {
    if (isAI) { aiDrawTile(); return; }
    if (!currentGame || !gsOnline || !isMyTurnOnline) return;
    if (gsOnline.boneyard.length === 0) {
      const newState = JSON.parse(JSON.stringify(gsOnline)) as GameState;
      newState.passCount += 1; newState.currentTurn = myRole === "player1" ? "player2" : "player1";
      let status = "playing"; let winnerId: string | null = null;
      if (newState.passCount >= 2) {
        status = "finished";
        const p1Pips = pipCount(newState.player1Hand); const p2Pips = pipCount(newState.player2Hand);
        winnerId = p1Pips <= p2Pips ? currentGame.player1_id : currentGame.player2_id!;
      }
      await supabase.from("domino_games").update({ game_state: newState as any, status, winner_id: winnerId, updated_at: new Date().toISOString() }).eq("id", currentGame.id);
      return;
    }
    const newState = JSON.parse(JSON.stringify(gsOnline)) as GameState;
    const drawn = newState.boneyard.pop()!;
    const hand = myRole === "player1" ? newState.player1Hand : newState.player2Hand;
    hand.push(drawn);
    if (!hasAnyPlay(hand, newState.boardLeftEnd, newState.boardRightEnd) && newState.boneyard.length === 0) {
      newState.passCount += 1; newState.currentTurn = myRole === "player1" ? "player2" : "player1";
    }
    await supabase.from("domino_games").update({ game_state: newState as any, updated_at: new Date().toISOString() }).eq("id", currentGame.id);
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

  const goToLobby = () => {
    if (isAI) { setAiMode(false); setAiGameState(null); setAiWinner(null); }
    else setCurrentGame(null);
    setView("lobby"); setSelectedTile(null);
  };

  // ── LOBBY (paciencia.co modal style on green felt) ──
  if (view === "lobby") {
    return (
      <div className="relative min-h-[80vh] rounded-2xl overflow-hidden" style={FELT_BG}>
        {FELT_TEXTURE}
        {/* Back button */}
        <div className="relative z-10 p-3">
          <button onClick={onBack} className="flex items-center gap-1 text-white/80 hover:text-white text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar aos Games
          </button>
        </div>

        {/* Center modal */}
        <div className="relative z-10 flex items-center justify-center px-4" style={{ minHeight: "calc(80vh - 60px)" }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-xl overflow-hidden shadow-2xl"
            style={{
              background: "#fdf5e0",
              border: "4px solid #8B6914",
              boxShadow: "0 0 0 2px #a07818, 0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            {/* Title */}
            <div className="text-center pt-6 pb-3">
              <h2 className="text-2xl font-black tracking-wider" style={{ color: "#5a3e0a" }}>
                DOMINÓ
              </h2>
              <p className="text-xs mt-1" style={{ color: "#8a7040" }}>Escolha como jogar</p>
            </div>

            {/* AI Mode */}
            <div className="px-6 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-4 h-4" style={{ color: "#6B4F10" }} />
                <h3 className="text-sm font-bold" style={{ color: "#5a3e0a" }}>DIFICULDADE</h3>
              </div>
              <div className="flex gap-2 justify-center">
                {(["easy", "medium", "hard"] as AIDifficulty[]).map((diff) => {
                  const cfg = DIFFICULTY_CONFIG[diff];
                  return (
                    <button
                      key={diff}
                      onClick={() => startAIGame(diff)}
                      className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 active:scale-95"
                      style={{
                        background: "#fff",
                        border: "2px solid #8B6914",
                        color: "#5a3e0a",
                      }}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="mx-6 my-3" style={{ height: 1, background: "#d4c8a0" }} />

            {/* Online */}
            <div className="px-6 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4" style={{ color: "#6B4F10" }} />
                <h3 className="text-sm font-bold" style={{ color: "#5a3e0a" }}>ONLINE</h3>
              </div>

              <button
                onClick={createGame}
                disabled={loading}
                className="w-full py-3 rounded-lg text-white font-bold text-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(180deg, #8B6914 0%, #6B4F10 100%)", border: "2px solid #a07818" }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                CRIAR PARTIDA
              </button>

              {/* Games list */}
              <div className="flex items-center justify-between mt-3 mb-2">
                <span className="text-xs font-bold" style={{ color: "#8a7040" }}>Partidas disponíveis</span>
                <button onClick={fetchGames} disabled={refreshing} className="text-xs flex items-center gap-1" style={{ color: "#6B4F10" }}>
                  <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} /> Atualizar
                </button>
              </div>

              {games.length === 0 ? (
                <p className="text-center text-xs py-4" style={{ color: "#8a7040" }}>
                  Nenhuma partida disponível.
                </p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {games.map((game) => (
                    <div key={game.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "#f0e8d0", border: "1px solid #d4c8a0" }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "#5a3e0a" }}>{game.player1_name}</p>
                        <p className="text-[10px]" style={{ color: "#8a7040" }}>Aguardando...</p>
                      </div>
                      <button
                        onClick={() => joinGame(game)}
                        disabled={loading || game.player1_id === user?.id}
                        className="px-3 py-1 rounded text-xs font-bold text-white disabled:opacity-50"
                        style={{ background: "#6B4F10" }}
                      >
                        {game.player1_id === user?.id ? "Sua" : "Entrar"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── WAITING ──
  if (view === "waiting") {
    return (
      <div className="relative min-h-[80vh] rounded-2xl overflow-hidden flex items-center justify-center" style={FELT_BG}>
        {FELT_TEXTURE}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 w-full max-w-sm rounded-xl p-8 text-center space-y-4 shadow-2xl"
          style={{ background: "#fdf5e0", border: "4px solid #8B6914" }}
        >
          <Loader2 className="w-12 h-12 animate-spin mx-auto" style={{ color: "#8B6914" }} />
          <h2 className="text-xl font-black" style={{ color: "#5a3e0a" }}>Aguardando oponente...</h2>
          <p className="text-sm" style={{ color: "#8a7040" }}>Compartilhe com um colega!</p>
          <button
            onClick={() => { cancelGame(); setView("lobby"); setCurrentGame(null); }}
            className="px-6 py-2 rounded-lg text-sm font-bold text-white"
            style={{ background: "#8B6914", border: "2px solid #a07818" }}
          >
            Cancelar
          </button>
        </motion.div>
      </div>
    );
  }

  // ── FINISHED ──
  if (view === "finished") {
    return (
      <div ref={gameContainerRef} className="relative min-h-[80vh] rounded-2xl overflow-hidden flex items-center justify-center" style={FELT_BG}>
        {FELT_TEXTURE}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 w-full max-w-sm rounded-xl p-8 text-center space-y-4 shadow-2xl"
          style={{ background: "#fdf5e0", border: "4px solid #8B6914" }}
        >
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }} className="text-7xl">
            {isWinner ? "🏆" : "😔"}
          </motion.div>
          <h2 className="text-2xl font-black" style={{ color: "#5a3e0a" }}>
            {isWinner ? "Você venceu!" : "Você perdeu!"}
          </h2>
          <p className="text-sm" style={{ color: "#8a7040" }}>
            {isWinner ? "Parabéns pela vitória!" : `${opponentName} venceu.`}
          </p>
          <div className="flex gap-3 justify-center">
            <div className="rounded-xl px-4 py-3 text-center" style={{ background: "#f0e8d0", border: "1px solid #d4c8a0" }}>
              <div className="text-2xl font-black" style={{ color: "#5a3e0a" }}>{pipCount(myHand)}</div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "#8a7040" }}>Meus pts</div>
            </div>
            <div className="rounded-xl px-4 py-3 text-center" style={{ background: "#f0e8d0", border: "1px solid #d4c8a0" }}>
              <div className="text-2xl font-black" style={{ color: "#5a3e0a" }}>{pipCount(opponentHand)}</div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "#8a7040" }}>Pts dele</div>
            </div>
          </div>
          <div className="flex gap-2 justify-center pt-2">
            {isAI ? (
              <>
                <button onClick={() => startAIGame(aiDifficulty)} className="px-4 py-2 rounded-lg text-sm font-bold text-white flex items-center gap-2" style={{ background: "#8B6914" }}>
                  <RotateCcw className="w-4 h-4" /> Jogar Novamente
                </button>
                <button onClick={goToLobby} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ color: "#5a3e0a", background: "#f0e8d0", border: "1px solid #d4c8a0" }}>
                  Lobby
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { setView("lobby"); setCurrentGame(null); }} className="px-4 py-2 rounded-lg text-sm font-bold text-white flex items-center gap-2" style={{ background: "#8B6914" }}>
                  <RotateCcw className="w-4 h-4" /> Nova Partida
                </button>
                <button onClick={onBack} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ color: "#5a3e0a", background: "#f0e8d0", border: "1px solid #d4c8a0" }}>
                  Sair
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ── PLAYING (fullscreen green felt table) ──
  if (view === "playing" && gs) {
    return (
      <div
        ref={gameContainerRef}
        className="relative flex flex-col overflow-hidden"
        style={{ ...FELT_BG, minHeight: isFS ? "100vh" : "85vh", borderRadius: isFS ? 0 : 16 }}
      >
        {FELT_TEXTURE}

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-3 py-2">
          <button onClick={goToLobby} className="flex items-center gap-1 text-white/70 hover:text-white text-xs font-medium transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Sair
          </button>
          <button
            onClick={() => isFS ? exitFullscreen() : gameContainerRef.current && requestFullscreen(gameContainerRef.current)}
            className="text-white/70 hover:text-white transition-colors"
          >
            {isFS ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>

        {/* Opponent score badge (top center) */}
        <div className="relative z-10 flex justify-center pb-1">
          <ScoreboardBadge label={opponentName} value={pipCount(opponentHand)} emoji="😐" />
        </div>

        {/* Opponent hand (face down) */}
        <div className="relative z-10 flex justify-center gap-1 pb-2 px-4">
          {opponentHand.map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.03 }}
            >
              <DominoTileVisual tile={[0, 0]} size="sm" faceDown disabled />
            </motion.div>
          ))}
        </div>

        {/* Board area */}
        <div className="relative z-10 flex-1 flex items-center justify-center overflow-auto px-4 py-2">
          {gs.board.length === 0 ? (
            <motion.p
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-white/70 font-bold text-sm"
            >
              Jogue a primeira peça!
            </motion.p>
          ) : (
            <div className="flex items-center gap-0.5 flex-wrap justify-center">
              {gs.board.map((tile, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, delay: i * 0.015 }}
                >
                  <DominoTileVisual tile={tile} size="sm" disabled />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Turn indicator / AI thinking */}
        <div className="relative z-10 text-center py-1">
          {aiThinking ? (
            <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-sm font-bold text-white" style={{ background: "rgba(139,105,20,0.8)" }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> IA pensando...
            </span>
          ) : (
            <motion.span
              animate={isMyTurn ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
              className={`inline-block px-4 py-1 rounded-full text-sm font-bold ${
                isMyTurn ? "text-white" : "text-white/60"
              }`}
              style={isMyTurn ? { background: "rgba(34,120,60,0.9)", boxShadow: "0 0 12px rgba(34,120,60,0.5)" } : { background: "rgba(0,0,0,0.3)" }}
            >
              {isMyTurn ? "✋ Sua vez!" : `Vez de ${opponentName}`}
            </motion.span>
          )}
        </div>

        {/* Side selection modal */}
        <AnimatePresence>
          {selectedTile !== null && gs.board.length > 0 && canPlay(myHand[selectedTile], gs.boardLeftEnd, gs.boardRightEnd) === "both" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="relative z-20 mx-auto rounded-xl p-3 space-y-2 shadow-xl max-w-xs"
              style={{ background: "#fdf5e0", border: "3px solid #8B6914" }}
            >
              <p className="text-sm text-center font-bold" style={{ color: "#5a3e0a" }}>Onde encaixar?</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => placeTileAtSide(selectedTile, "left")}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: "#8B6914" }}>
                  ← Esquerda ({gs.boardLeftEnd})
                </button>
                <button onClick={() => placeTileAtSide(selectedTile, "right")}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: "#8B6914" }}>
                  Direita ({gs.boardRightEnd}) →
                </button>
                <button onClick={() => setSelectedTile(null)} className="px-2 py-1.5 rounded-lg" style={{ color: "#5a3e0a" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* My hand */}
        <div className="relative z-10 px-3 pb-2 pt-1">
          <div className="flex flex-wrap gap-2 justify-center">
            {myHand.map((tile, i) => {
              const match = canPlay(tile, gs.boardLeftEnd, gs.boardRightEnd);
              return (
                <motion.div
                  key={`${tile[0]}-${tile[1]}-${i}`}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
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

        {/* Player score badge (bottom center) */}
        <div className="relative z-10 flex justify-center pb-2">
          <ScoreboardBadge label="EU" value={pipCount(myHand)} emoji="😊" />
        </div>

        {/* Draw / Pass button */}
        {isMyTurn && !canPlayAny && !aiThinking && (
          <div className="relative z-10 text-center pb-3 px-4">
            <button
              onClick={drawTile}
              className="w-full max-w-xs mx-auto py-2.5 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(180deg, #8B6914 0%, #6B4F10 100%)", border: "2px solid #a07818" }}
            >
              {gs.boneyard.length > 0 ? `🦴 Comprar peça (${gs.boneyard.length})` : "⏭️ Passar a vez"}
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
