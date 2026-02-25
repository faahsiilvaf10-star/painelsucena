import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, RotateCcw, RefreshCw, X, Bot, Users, Brain, Plus, Maximize, Minimize, Trophy, Eye, EyeOff } from "lucide-react";
import { NeonAvatar } from "@/components/ui/NeonAvatar";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/useUserRole";

// ── Types ──
type DominoTile = [number, number];
type AIDifficulty = "easy" | "medium" | "hard";
type PlayerKey = "player1" | "player2" | "player3" | "player4";

interface GameState {
  board: DominoTile[];
  boardLeftEnd: number;
  boardRightEnd: number;
  player1Hand: DominoTile[];
  player2Hand: DominoTile[];
  player3Hand?: DominoTile[];
  player4Hand?: DominoTile[];
  boneyard: DominoTile[];
  currentTurn: PlayerKey;
  passCount: number;
  playerCount?: number;
}

interface DominoGameRow {
  id: string;
  player1_id: string;
  player1_name: string;
  player2_id: string | null;
  player2_name: string | null;
  player3_id: string | null;
  player3_name: string | null;
  player4_id: string | null;
  player4_name: string | null;
  max_players: number;
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

function getPlayerKeys(count: number): PlayerKey[] {
  const keys: PlayerKey[] = ["player1", "player2"];
  if (count >= 3) keys.push("player3");
  if (count >= 4) keys.push("player4");
  return keys;
}

function nextTurn(current: PlayerKey, playerCount: number): PlayerKey {
  const keys = getPlayerKeys(playerCount);
  const idx = keys.indexOf(current);
  return keys[(idx + 1) % keys.length];
}

function getHand(state: GameState, player: PlayerKey): DominoTile[] {
  if (player === "player1") return state.player1Hand;
  if (player === "player2") return state.player2Hand;
  if (player === "player3") return state.player3Hand || [];
  if (player === "player4") return state.player4Hand || [];
  return [];
}

function setHand(state: GameState, player: PlayerKey, hand: DominoTile[]) {
  if (player === "player1") state.player1Hand = hand;
  else if (player === "player2") state.player2Hand = hand;
  else if (player === "player3") state.player3Hand = hand;
  else if (player === "player4") state.player4Hand = hand;
}

function createInitialState(playerCount: number = 2): GameState {
  const tiles = shuffleTiles(generateAllTiles());
  const tilesPerPlayer = playerCount === 4 ? 7 : playerCount === 3 ? 9 : 7;
  let idx = 0;
  const hands: DominoTile[][] = [];
  for (let i = 0; i < playerCount; i++) {
    hands.push(tiles.slice(idx, idx + tilesPerPlayer));
    idx += tilesPerPlayer;
  }
  return {
    board: [], boardLeftEnd: -1, boardRightEnd: -1,
    player1Hand: hands[0], player2Hand: hands[1],
    player3Hand: playerCount >= 3 ? hands[2] : undefined,
    player4Hand: playerCount >= 4 ? hands[3] : undefined,
    boneyard: tiles.slice(idx), currentTurn: "player1", passCount: 0,
    playerCount,
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
function aiChooseTile(hand: DominoTile[], state: GameState, difficulty: AIDifficulty): { tileIndex: number; side: "left" | "right"; score: number } | null {
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

function aiPlayTurnForPlayer(state: GameState, player: PlayerKey, difficulty: AIDifficulty): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const pc = newState.playerCount || 2;
  const hand = getHand(newState, player);
  const choice = aiChooseTile(hand, newState, difficulty);
  if (choice) {
    const tile = hand[choice.tileIndex];
    hand.splice(choice.tileIndex, 1);
    setHand(newState, player, hand);
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
    newState.passCount = 0; newState.currentTurn = nextTurn(player, pc);
    return newState;
  }
  if (newState.boneyard.length > 0) {
    const drawn = newState.boneyard.pop()!; hand.push(drawn);
    setHand(newState, player, hand);
    if (hasAnyPlay(hand, newState.boardLeftEnd, newState.boardRightEnd)) return aiPlayTurnForPlayer(newState, player, difficulty);
    if (newState.boneyard.length > 0) return aiPlayTurnForPlayer(newState, player, difficulty);
    newState.passCount += 1; newState.currentTurn = nextTurn(player, pc); return newState;
  }
  newState.passCount += 1; newState.currentTurn = nextTurn(player, pc); return newState;
}

function findWinnerByPips(state: GameState): PlayerKey {
  const pc = state.playerCount || 2;
  const keys = getPlayerKeys(pc);
  let best: PlayerKey = "player1";
  let bestPips = Infinity;
  for (const k of keys) {
    const p = pipCount(getHand(state, k));
    if (p < bestPips) { bestPips = p; best = k; }
  }
  return best;
}

// ── Dot patterns for domino face ──
const DOT_POSITIONS: Record<number, [number, number][]> = {
  0: [],
  1: [[50, 50]],
  2: [[30, 30], [70, 70]],
  3: [[30, 30], [50, 50], [70, 70]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]],
  5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
  6: [[30, 22], [70, 22], [30, 50], [70, 50], [30, 78], [70, 78]],
};

// 6 dots for horizontal board tiles: 3 cols × 2 rows
const DOT_POSITIONS_6_BOARD: [number, number][] = [[22, 30], [50, 30], [78, 30], [22, 70], [50, 70], [78, 70]];

function DominoFace({ value, size, onBoard }: { value: number; size: number; onBoard?: boolean }) {
  const dots = (value === 6 && onBoard) ? DOT_POSITIONS_6_BOARD : (DOT_POSITIONS[value] || []);
  const dotR = Math.max(8, size * 0.17);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="block">
      {dots.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={dotR} fill="#1a1a1a" />
      ))}
    </svg>
  );
}

function DominoTileVisual({ tile, size = "md", onClick, disabled, highlight, vertical, faceDown }: {
  tile: DominoTile;
  size?: "xs" | "sm" | "md" | "lg";
  onClick?: () => void;
  disabled?: boolean;
  highlight?: boolean;
  vertical?: boolean;
  faceDown?: boolean;
}) {
  const dims = {
    xs: { w: 36, h: 18, face: 16 },
    sm: { w: 56, h: 28, face: 25 },
    md: { w: 72, h: 36, face: 33 },
    lg: { w: 90, h: 45, face: 42 },
  }[size];

  if (faceDown) {
    const w = vertical ? dims.h + 4 : dims.w + 4;
    const h = vertical ? dims.w + 4 : dims.h + 4;
    return (
      <div
        className="rounded-md shadow-md border border-amber-800/40 overflow-hidden"
        style={{
          width: w,
          height: h,
          background: "linear-gradient(135deg, #8B6914 0%, #6B4F10 50%, #8B6914 100%)",
          boxShadow: "inset 0 1px 2px rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        <div className="w-full h-full flex items-center justify-center" style={{
          backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.08) 3px, rgba(255,255,255,0.08) 4px)",
        }}>
          <div className="rounded-sm" style={{
            width: w * 0.5,
            height: h * 0.5,
            border: "1px solid rgba(255,255,255,0.2)",
          }} />
        </div>
      </div>
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
          <DominoFace value={tile[0]} size={dims.face} onBoard={false} />
        </div>
        <div style={{ width: "60%", height: 1.5, background: "#b8a878", margin: "1px 0" }} />
        <div style={{ width: dims.face, height: dims.face }}>
          <DominoFace value={tile[1]} size={dims.face} onBoard={false} />
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
        <DominoFace value={tile[0]} size={dims.face} onBoard={disabled} />
      </div>
      <div style={{ width: 1.5, height: "60%", background: "#b8a878", margin: "0 1px" }} />
      <div style={{ width: dims.face, height: dims.face }}>
        <DominoFace value={tile[1]} size={dims.face} onBoard={disabled} />
      </div>
    </motion.button>
  );
}

function PlayerBadge({ name, count, avatarUrl, isNeon, showCount = true }: { name: string; count: number; avatarUrl?: string | null; isNeon?: boolean; showCount?: boolean }) {
  const firstName = name.split(" ")[0];
  return (
    <div className="flex flex-col items-center gap-0.5">
      <NeonAvatar
        src={avatarUrl}
        name={name}
        size="sm"
        neonColor={isNeon ? "#c8a44e" : undefined}
        frameColor={isNeon ? "linear-gradient(135deg, #c8a44e, #8B6914, #c8a44e)" : undefined}
        frameAnimation={isNeon ? "pulse" : undefined}
      />
      <span
        className="text-xs font-black tracking-wide"
        style={{
          color: "#c8a44e",
          textShadow: "0 0 6px rgba(200,164,78,0.7), 0 0 12px rgba(200,164,78,0.4)",
          animation: "neon-pulse-name 2s ease-in-out infinite",
        }}
      >
        {firstName}
      </span>
      {showCount && (
        <div
          className="rounded-full px-3 py-0.5 text-center font-black text-sm shadow-md"
          style={{
            background: "linear-gradient(180deg, #8B6914 0%, #6B4F10 100%)",
            color: "#fff",
            border: "2px solid #a07818",
            minWidth: 36,
          }}
        >
          {count}
        </div>
      )}
    </div>
  );
}

const DIFFICULTY_CONFIG: Record<AIDifficulty, { label: string; emoji: string; description: string }> = {
  easy: { label: "FÁCIL", emoji: "🟢", description: "IA joga aleatoriamente" },
  medium: { label: "MÉDIO", emoji: "🟡", description: "IA com estratégia moderada" },
  hard: { label: "DIFÍCIL", emoji: "🔴", description: "IA com estratégia avançada" },
};

const PLAYER_COUNT_CONFIG: { count: number; label: string; emoji: string }[] = [
  { count: 2, label: "2 Jogadores", emoji: "👥" },
  { count: 3, label: "3 Jogadores", emoji: "👥" },
  { count: 4, label: "4 Jogadores", emoji: "👥" },
];

const AI_NAMES: Record<PlayerKey, string> = {
  player1: "Você",
  player2: "IA 1",
  player3: "IA 2",
  player4: "IA 3",
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

const NEON_NAME_STYLE_ID = "domino-neon-name-keyframes";
if (typeof document !== "undefined" && !document.getElementById(NEON_NAME_STYLE_ID)) {
  const s = document.createElement("style");
  s.id = NEON_NAME_STYLE_ID;
  s.textContent = `@keyframes neon-pulse-name { 0%, 100% { opacity: 1; text-shadow: 0 0 6px rgba(200,164,78,0.7), 0 0 12px rgba(200,164,78,0.4); } 50% { opacity: 0.6; text-shadow: 0 0 2px rgba(200,164,78,0.3); } }`;
  document.head.appendChild(s);
}

const FELT_BG: React.CSSProperties = {
  background: "radial-gradient(ellipse at center, #2d8a4e 0%, #1e6b3a 40%, #145428 80%, #0e3d1c 100%)",
};

const FELT_TEXTURE = (
  <div className="absolute inset-0 pointer-events-none" style={{
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
  }} />
);

// ── Board Layout ──
// Real domino: first tile is centered, subsequent tiles extend outward
// from center. When they hit the edge, rows snake back.
const TILE_W = 60;
const TILE_H = 34;
const TILE_GAP = 2;
const DOUBLE_W = 34;

function tileWidth(tile: DominoTile) {
  return tile[0] === tile[1] ? DOUBLE_W : TILE_W;
}

function SnakeBoard({ board }: { board: DominoTile[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedCountRef = useRef(0);
  const [cw, setCw] = useState(600);

  useEffect(() => { renderedCountRef.current = board.length; });
  const alreadyRendered = renderedCountRef.current;

  useEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      if (containerRef.current) setCw(containerRef.current.clientWidth - 16);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // The board array is ordered: board[0] is the first tile played (center),
  // tiles added to the right end come after, tiles added to the left come before.
  // We just render them in order and center the first row, then snake.
  const maxWidth = Math.max(cw - 16, 120);

  // Build rows: first row is centered, subsequent rows snake
  type RowData = { tiles: { tile: DominoTile; idx: number }[]; direction: "ltr" | "rtl" };
  const rows: RowData[] = [];
  let currentRow: { tile: DominoTile; idx: number }[] = [];
  let rowWidth = 0;

  for (let i = 0; i < board.length; i++) {
    const tile = board[i];
    const tw = tileWidth(tile);
    const needed = currentRow.length > 0 ? tw + TILE_GAP : tw;

    if (rowWidth + needed > maxWidth && currentRow.length > 0) {
      const dir = rows.length % 2 === 0 ? "ltr" : "rtl";
      rows.push({ tiles: currentRow, direction: dir });
      currentRow = [];
      rowWidth = 0;
    }
    currentRow.push({ tile, idx: i });
    rowWidth += currentRow.length === 1 ? tw : tw + TILE_GAP;
  }
  if (currentRow.length > 0) {
    const dir = rows.length % 2 === 0 ? "ltr" : "rtl";
    rows.push({ tiles: currentRow, direction: dir });
  }

  return (
    <div ref={containerRef} className="w-full px-2 py-2" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {rows.map((row, rowIdx) => {
        const displayTiles = row.direction === "rtl" ? [...row.tiles].reverse() : row.tiles;
        const justify = rows.length === 1
          ? "center"
          : rowIdx === 0
            ? "center"
            : row.direction === "ltr"
              ? "flex-start"
              : "flex-end";

        // Calculate row height based on tallest tile (doubles are ~62px, normal ~34px)
        const hasDouble = row.tiles.some(t => t.tile[0] === t.tile[1]);
        const rowHeight = hasDouble ? 66 : 38;

        return (
          <div
            key={`row-${rowIdx}`}
            className="flex items-center flex-shrink-0"
            style={{ gap: TILE_GAP, justifyContent: justify, minHeight: rowHeight }}
          >
            {displayTiles.map(({ tile, idx }) => {
              const isDouble = tile[0] === tile[1];
              const isNew = idx >= alreadyRendered;
              return (
                <motion.div
                  key={`board-${idx}-${tile[0]}-${tile[1]}`}
                  initial={isNew ? { scale: 0, opacity: 0 } : false}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={isNew ? { duration: 0.4, ease: "backOut" } : { duration: 0 }}
                  className="flex items-center justify-center flex-shrink-0"
                >
                  <DominoTileVisual tile={tile} size="sm" disabled vertical={isDouble} />
                </motion.div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Helper: get online player role ──
function getMyRole(game: DominoGameRow, userId: string): PlayerKey {
  if (game.player1_id === userId) return "player1";
  if (game.player2_id === userId) return "player2";
  if (game.player3_id === userId) return "player3";
  if (game.player4_id === userId) return "player4";
  return "player1";
}

function getOnlinePlayerName(game: DominoGameRow, key: PlayerKey): string {
  if (key === "player1") return game.player1_name || "Jogador 1";
  if (key === "player2") return game.player2_name || "Jogador 2";
  if (key === "player3") return game.player3_name || "Jogador 3";
  if (key === "player4") return game.player4_name || "Jogador 4";
  return "Jogador";
}

function getOnlinePlayerId(game: DominoGameRow, key: PlayerKey): string | null {
  if (key === "player1") return game.player1_id;
  if (key === "player2") return game.player2_id;
  if (key === "player3") return game.player3_id;
  if (key === "player4") return game.player4_id;
  return null;
}

function getJoinedCount(game: DominoGameRow): number {
  let count = 1; // player1 always exists
  if (game.player2_id) count++;
  if (game.player3_id) count++;
  if (game.player4_id) count++;
  return count;
}

// ── Main Component ──
export function DominoGame({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { isAdmin } = useIsAdmin();
  const [revealOpponents, setRevealOpponents] = useState(false);
  const [view, setView] = useState<"lobby" | "waiting" | "playing" | "finished">("lobby");
  const [games, setGames] = useState<DominoGameRow[]>([]);
  const [currentGame, setCurrentGame] = useState<DominoGameRow | null>(null);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [ranking, setRanking] = useState<{ user_id: string; user_name: string; wins: number; losses: number }[]>([]);
  const [statsSaved, setStatsSaved] = useState(false);
  const [isFS, setIsFS] = useState(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [onlinePlayerCount, setOnlinePlayerCount] = useState(2);
  const [opponentAvatars, setOpponentAvatars] = useState<Record<string, string | null>>({});

  // AI mode state
  const [aiMode, setAiMode] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>("medium");
  const [aiPlayerCount, setAiPlayerCount] = useState(2);
  const [aiGameState, setAiGameState] = useState<GameState | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiWinner, setAiWinner] = useState<PlayerKey | null>(null);
  const aiThinkingRef = useRef(false);

  const playerName = profile?.full_name || "Jogador";
  const myRole = currentGame ? getMyRole(currentGame, user?.id || "") : "player1";
  const gsOnline = currentGame?.game_state;
  const maxPlayers = currentGame?.max_players || 2;
  const pc = gsOnline?.playerCount || maxPlayers;

  const isMyTurnOnline = gsOnline?.currentTurn === myRole;
  const myHandOnline = gsOnline ? getHand(gsOnline, myRole) : [];

  // Fetch opponent avatars for online games
  useEffect(() => {
    if (aiMode || !currentGame) return;
    const ids: string[] = [];
    if (currentGame.player1_id) ids.push(currentGame.player1_id);
    if (currentGame.player2_id) ids.push(currentGame.player2_id);
    if (currentGame.player3_id) ids.push(currentGame.player3_id);
    if (currentGame.player4_id) ids.push(currentGame.player4_id);
    const otherIds = ids.filter(id => id !== user?.id);
    if (otherIds.length === 0) return;
    supabase.from("profiles").select("user_id, avatar_url").in("user_id", otherIds).then(({ data }) => {
      if (data) {
        const map: Record<string, string | null> = {};
        for (const p of data) map[p.user_id] = p.avatar_url;
        setOpponentAvatars(map);
      }
    });
  }, [currentGame?.player1_id, currentGame?.player2_id, currentGame?.player3_id, currentGame?.player4_id, aiMode, user?.id]);

  // Build online opponents
  type OpponentInfo = { key: PlayerKey; name: string; hand: DominoTile[]; avatarUrl?: string | null };
  const onlineOpponents: OpponentInfo[] = [];
  if (currentGame && gsOnline && !aiMode) {
    const keys = getPlayerKeys(pc).filter(k => k !== myRole);
    for (const k of keys) {
      const pid = getOnlinePlayerId(currentGame, k);
      onlineOpponents.push({
        key: k,
        name: getOnlinePlayerName(currentGame, k),
        hand: getHand(gsOnline, k),
        avatarUrl: pid ? opponentAvatars[pid] : null,
      });
    }
  }

  const isMyTurnAI = aiGameState?.currentTurn === "player1";
  const myHandAI = aiGameState?.player1Hand || [];
  const gsAI = aiGameState;

  const isAI = aiMode && view === "playing";
  const isAIFinished = aiMode && view === "finished";
  const gs = isAI || isAIFinished ? gsAI : gsOnline;
  const isMyTurn = isAI ? isMyTurnAI : isMyTurnOnline;
  const myHand = isAI || isAIFinished ? myHandAI : myHandOnline;

  // Build AI opponents list
  const aiOpponents: OpponentInfo[] = [];
  if ((isAI || isAIFinished) && gsAI) {
    const aiPc = gsAI.playerCount || 2;
    const keys = getPlayerKeys(aiPc).filter(k => k !== "player1");
    for (const k of keys) {
      aiOpponents.push({ key: k, name: AI_NAMES[k], hand: getHand(gsAI, k) });
    }
  }

  // Unified opponents for display
  const displayOpponents: OpponentInfo[] = isAI || isAIFinished ? aiOpponents : onlineOpponents;

  // Winner label for AI
  const aiWinnerLabel = aiWinner
    ? (aiWinner === "player1" ? "Você" : AI_NAMES[aiWinner])
    : "";

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

  useEffect(() => {
    if (view === "playing" && gameContainerRef.current && !isFullscreen()) {
      requestFullscreen(gameContainerRef.current);
    }
  }, [view]);

  useEffect(() => {
    if (view !== "playing" && isFullscreen()) exitFullscreen();
  }, [view]);

  // ── AI turn effect ──
  useEffect(() => {
    if (!aiMode || !gsAI || gsAI.currentTurn === "player1" || aiThinkingRef.current) return;
    if (aiWinner) return;
    const currentPlayer = gsAI.currentTurn;
    const aiPc = gsAI.playerCount || 2;
    aiThinkingRef.current = true;
    setAiThinking(true);
    const delay = 2000;
    const timer = setTimeout(() => {
      const newState = aiPlayTurnForPlayer(gsAI, currentPlayer, aiDifficulty);
      const currentHand = getHand(newState, currentPlayer);
      if (currentHand.length === 0) {
        setAiWinner(currentPlayer); setAiGameState(newState); setView("finished");
      } else if (newState.passCount >= aiPc) {
        const winner = findWinnerByPips(newState);
        setAiWinner(winner); setAiGameState(newState); setView("finished");
      } else {
        setAiGameState(newState);
      }
      setAiThinking(false); aiThinkingRef.current = false;
    }, delay);
    return () => { clearTimeout(timer); aiThinkingRef.current = false; };
  }, [aiMode, gsAI, gsAI?.currentTurn, aiDifficulty, aiWinner]);

  // ── Online game functions ──
  const fetchGames = useCallback(async () => {
    setRefreshing(true);
    const { data } = await supabase.from("domino_games").select("*").eq("status", "waiting").order("created_at", { ascending: false });
    setGames((data as any[]) || []);
    setRefreshing(false);
  }, []);

  const fetchRanking = useCallback(async () => {
    const { data } = await supabase.from("domino_stats").select("*").order("wins", { ascending: false }).limit(20);
    setRanking((data as any[]) || []);
  }, []);

  const saveOnlineStats = useCallback(async (winnerId: string | null) => {
    if (!user || !currentGame || statsSaved) return;
    setStatsSaved(true);
    const myId = user.id;
    const iWon = winnerId === myId;

    const { data: myStats } = await supabase.from("domino_stats").select("*").eq("user_id", myId).maybeSingle();
    if (myStats) {
      await supabase.from("domino_stats").update({
        wins: (myStats as any).wins + (iWon ? 1 : 0),
        losses: (myStats as any).losses + (iWon ? 0 : 1),
        user_name: playerName,
        updated_at: new Date().toISOString(),
      }).eq("user_id", myId);
    } else {
      await supabase.from("domino_stats").insert({
        user_id: myId, user_name: playerName,
        wins: iWon ? 1 : 0, losses: iWon ? 0 : 1,
      });
    }
    fetchRanking();
  }, [user, currentGame, playerName, statsSaved, fetchRanking]);

  useEffect(() => { if (view === "lobby") { fetchGames(); fetchRanking(); } }, [view, fetchGames, fetchRanking]);

  useEffect(() => {
    if (!isAI && currentGame?.status === "finished" && currentGame?.winner_id && !statsSaved) {
      saveOnlineStats(currentGame.winner_id);
    }
  }, [currentGame?.status, currentGame?.winner_id, isAI, saveOnlineStats, statsSaved]);

  useEffect(() => {
    if (view === "lobby" || view === "waiting") setStatsSaved(false);
  }, [view]);

  // Realtime subscription for online games
  useEffect(() => {
    if (!currentGame?.id || aiMode) return;
    const channel = supabase.channel(`domino-${currentGame.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "domino_games", filter: `id=eq.${currentGame.id}` },
        (payload) => {
          const updated = payload.new as any;
          setCurrentGame(updated);
          if (updated.status === "playing" && (view === "waiting")) setView("playing");
          if (updated.status === "finished") setView("finished");
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentGame?.id, view, aiMode]);

  const createGame = useCallback(async (maxP: number = 2) => {
    if (!user) return;
    setLoading(true);
    const state = createInitialState(maxP);
    const { data, error } = await supabase.from("domino_games")
      .insert({
        player1_id: user.id,
        player1_name: playerName,
        game_state: state as any,
        status: maxP === 2 ? "waiting" : "waiting",
        max_players: maxP,
      } as any)
      .select().single();
    if (error) { toast.error("Erro ao criar partida"); setLoading(false); return; }
    setCurrentGame(data as any); setView("waiting"); setLoading(false);
  }, [user, playerName]);

  const joinGame = useCallback(async (game: DominoGameRow) => {
    if (!user) return;
    if (game.player1_id === user.id || game.player2_id === user.id || game.player3_id === user.id || game.player4_id === user.id) {
      toast.error("Você já está nesta partida"); return;
    }
    setLoading(true);

    const maxP = game.max_players || 2;
    const joined = getJoinedCount(game);

    // Determine which slot to fill
    const updateData: any = { updated_at: new Date().toISOString() };

    if (!game.player2_id) {
      updateData.player2_id = user.id;
      updateData.player2_name = playerName;
    } else if (!game.player3_id && maxP >= 3) {
      updateData.player3_id = user.id;
      updateData.player3_name = playerName;
    } else if (!game.player4_id && maxP >= 4) {
      updateData.player4_id = user.id;
      updateData.player4_name = playerName;
    } else {
      toast.error("Partida lotada"); setLoading(false); fetchGames(); return;
    }

    // If this fill completes the game, start it
    if (joined + 1 >= maxP) {
      updateData.status = "playing";
    }

    const { data, error } = await supabase.from("domino_games")
      .update(updateData)
      .eq("id", game.id).eq("status", "waiting").select().single();
    if (error) { toast.error("Partida não disponível"); setLoading(false); fetchGames(); return; }

    setCurrentGame(data as any);
    if ((data as any).status === "playing") {
      setView("playing");
    } else {
      setView("waiting");
    }
    setLoading(false);
  }, [user, playerName, fetchGames]);

  const cancelGame = useCallback(async () => {
    if (!currentGame) return;
    await supabase.from("domino_games").delete().eq("id", currentGame.id);
    setCurrentGame(null); setView("lobby");
  }, [currentGame]);

  const startAIGame = useCallback((difficulty: AIDifficulty, playerCount: number = 2) => {
    setAiMode(true); setAiDifficulty(difficulty); setAiPlayerCount(playerCount); setAiWinner(null);
    setAiGameState(createInitialState(playerCount)); setSelectedTile(null); setView("playing");
  }, []);

  const aiPlaceTile = useCallback((tileIndex: number, side: "left" | "right") => {
    if (!gsAI || gsAI.currentTurn !== "player1") return;
    const tile = gsAI.player1Hand[tileIndex];
    if (!tile) return;
    const newState = JSON.parse(JSON.stringify(gsAI)) as GameState;
    const aiPc = newState.playerCount || 2;
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
    newState.passCount = 0; newState.currentTurn = nextTurn("player1", aiPc);
    if (hand.length === 0) { setAiWinner("player1"); setAiGameState(newState); setView("finished"); return; }
    setAiGameState(newState); setSelectedTile(null);
  }, [gsAI]);

  const aiDrawTile = useCallback(() => {
    if (!gsAI || gsAI.currentTurn !== "player1") return;
    const newState = JSON.parse(JSON.stringify(gsAI)) as GameState;
    const aiPc = newState.playerCount || 2;
    if (newState.boneyard.length === 0) {
      newState.passCount += 1; newState.currentTurn = nextTurn("player1", aiPc);
      if (newState.passCount >= aiPc) {
        const winner = findWinnerByPips(newState);
        setAiWinner(winner); setAiGameState(newState); setView("finished"); return;
      }
      setAiGameState(newState); return;
    }
    // Keep drawing until player can play or boneyard is empty
    while (newState.boneyard.length > 0) {
      const drawn = newState.boneyard.pop()!;
      newState.player1Hand.push(drawn);
      if (hasAnyPlay(newState.player1Hand, newState.boardLeftEnd, newState.boardRightEnd)) {
        setAiGameState(newState); return;
      }
    }
    // Boneyard empty and still can't play — pass
    newState.passCount += 1; newState.currentTurn = nextTurn("player1", aiPc);
    if (newState.passCount >= aiPc) {
      const winner = findWinnerByPips(newState);
      setAiWinner(winner); setAiGameState(newState); setView("finished"); return;
    }
    setAiGameState(newState);
  }, [gsAI]);

  const placeTileAtSide = useCallback(async (tileIndex: number, side: "left" | "right") => {
    if (isAI) { aiPlaceTile(tileIndex, side); return; }
    if (!currentGame || !gsOnline || !isMyTurnOnline) return;
    const tile = myHandOnline[tileIndex]; if (!tile) return;
    const newState = JSON.parse(JSON.stringify(gsOnline)) as GameState;
    const onlinePc = newState.playerCount || maxPlayers;
    const hand = getHand(newState, myRole);
    hand.splice(tileIndex, 1);
    setHand(newState, myRole, hand);
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
    newState.passCount = 0; newState.currentTurn = nextTurn(myRole, onlinePc);
    let status = "playing"; let winnerId: string | null = null;
    if (hand.length === 0) { status = "finished"; winnerId = user!.id; }
    await supabase.from("domino_games").update({ game_state: newState as any, status, winner_id: winnerId, updated_at: new Date().toISOString() }).eq("id", currentGame.id);
    setSelectedTile(null);
  }, [isAI, aiPlaceTile, currentGame, gsOnline, isMyTurnOnline, myHandOnline, myRole, user, maxPlayers]);

  const drawTile = useCallback(async () => {
    if (isAI) { aiDrawTile(); return; }
    if (!currentGame || !gsOnline || !isMyTurnOnline) return;
    const onlinePc = gsOnline.playerCount || maxPlayers;
    if (gsOnline.boneyard.length === 0) {
      const newState = JSON.parse(JSON.stringify(gsOnline)) as GameState;
      newState.passCount += 1; newState.currentTurn = nextTurn(myRole, onlinePc);
      let status = "playing"; let winnerId: string | null = null;
      if (newState.passCount >= onlinePc) {
        status = "finished";
        const winnerKey = findWinnerByPips(newState);
        winnerId = getOnlinePlayerId(currentGame, winnerKey);
      }
      await supabase.from("domino_games").update({ game_state: newState as any, status, winner_id: winnerId, updated_at: new Date().toISOString() }).eq("id", currentGame.id);
      return;
    }
    const newState = JSON.parse(JSON.stringify(gsOnline)) as GameState;
    const hand = getHand(newState, myRole);
    // Keep drawing until player can play or boneyard is empty
    while (newState.boneyard.length > 0) {
      const drawn = newState.boneyard.pop()!;
      hand.push(drawn);
      setHand(newState, myRole, hand);
      if (hasAnyPlay(hand, newState.boardLeftEnd, newState.boardRightEnd)) {
        await supabase.from("domino_games").update({ game_state: newState as any, updated_at: new Date().toISOString() }).eq("id", currentGame.id);
        return;
      }
    }
    // Boneyard empty and still can't play — pass
    newState.passCount += 1; newState.currentTurn = nextTurn(myRole, onlinePc);
    let status = "playing"; let winnerId: string | null = null;
    if (newState.passCount >= onlinePc) {
      status = "finished";
      const winnerKey = findWinnerByPips(newState);
      winnerId = getOnlinePlayerId(currentGame, winnerKey);
    }
    await supabase.from("domino_games").update({ game_state: newState as any, status, winner_id: winnerId, updated_at: new Date().toISOString() }).eq("id", currentGame.id);
  }, [isAI, aiDrawTile, currentGame, gsOnline, isMyTurnOnline, myRole, maxPlayers]);

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
  const isWinner = isAI || isAIFinished ? aiWinner === "player1" : currentGame?.winner_id === user?.id;

  // Online winner name
  const onlineWinnerName = currentGame && currentGame.winner_id
    ? (currentGame.winner_id === currentGame.player1_id ? currentGame.player1_name
      : currentGame.winner_id === currentGame.player2_id ? currentGame.player2_name
      : currentGame.winner_id === currentGame.player3_id ? currentGame.player3_name
      : currentGame.winner_id === currentGame.player4_id ? currentGame.player4_name
      : "Alguém")
    : "";

  const goToLobby = () => {
    if (aiMode) { setAiMode(false); setAiGameState(null); setAiWinner(null); }
    else setCurrentGame(null);
    setView("lobby"); setSelectedTile(null);
  };

  // ── LOBBY ──
  if (view === "lobby") {
    return (
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div className="relative min-h-[80vh] rounded-2xl overflow-hidden flex-1" style={FELT_BG}>
          {FELT_TEXTURE}
          <div className="relative z-10 p-3">
            <button onClick={onBack} className="flex items-center gap-1 text-white/80 hover:text-white text-sm font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar aos Games
            </button>
          </div>

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
              <div className="text-center pt-6 pb-3">
                <h2 className="text-2xl font-black tracking-wider" style={{ color: "#5a3e0a" }}>DOMINÓ</h2>
                <p className="text-xs mt-1" style={{ color: "#8a7040" }}>Escolha como jogar</p>
              </div>

              {/* Player count selector for AI */}
              <div className="px-6 pb-2">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="w-4 h-4" style={{ color: "#6B4F10" }} />
                  <h3 className="text-sm font-bold" style={{ color: "#5a3e0a" }}>VS IA</h3>
                </div>
                <div className="flex gap-2 justify-center mb-2">
                  {PLAYER_COUNT_CONFIG.map((pcc) => (
                    <button
                      key={pcc.count}
                      onClick={() => setAiPlayerCount(pcc.count)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95"
                      style={{
                        background: aiPlayerCount === pcc.count ? "#8B6914" : "#fff",
                        color: aiPlayerCount === pcc.count ? "#fff" : "#5a3e0a",
                        border: `2px solid ${aiPlayerCount === pcc.count ? "#a07818" : "#8B6914"}`,
                      }}
                    >
                      {pcc.count}P
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 justify-center">
                  {(["easy", "medium", "hard"] as AIDifficulty[]).map((diff) => {
                    const cfg = DIFFICULTY_CONFIG[diff];
                    return (
                      <button
                        key={diff}
                        onClick={() => startAIGame(diff, aiPlayerCount)}
                        className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 active:scale-95"
                        style={{ background: "#fff", border: "2px solid #8B6914", color: "#5a3e0a" }}
                      >
                        {cfg.emoji} {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mx-6 my-3" style={{ height: 1, background: "#d4c8a0" }} />

              {/* Online section */}
              <div className="px-6 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4" style={{ color: "#6B4F10" }} />
                  <h3 className="text-sm font-bold" style={{ color: "#5a3e0a" }}>ONLINE</h3>
                </div>

                {/* Online player count selector */}
                <div className="flex gap-2 justify-center mb-3">
                  {PLAYER_COUNT_CONFIG.map((pcc) => (
                    <button
                      key={pcc.count}
                      onClick={() => setOnlinePlayerCount(pcc.count)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95"
                      style={{
                        background: onlinePlayerCount === pcc.count ? "#8B6914" : "#fff",
                        color: onlinePlayerCount === pcc.count ? "#fff" : "#5a3e0a",
                        border: `2px solid ${onlinePlayerCount === pcc.count ? "#a07818" : "#8B6914"}`,
                      }}
                    >
                      {pcc.emoji} {pcc.count}P
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => createGame(onlinePlayerCount)}
                  disabled={loading}
                  className="w-full py-3 rounded-lg text-white font-bold text-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(180deg, #8B6914 0%, #6B4F10 100%)", border: "2px solid #a07818" }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  CRIAR PARTIDA ({onlinePlayerCount} jogadores)
                </button>

                <div className="flex items-center justify-between mt-3 mb-2">
                  <span className="text-xs font-bold" style={{ color: "#8a7040" }}>Partidas disponíveis</span>
                  <button onClick={fetchGames} disabled={refreshing} className="text-xs flex items-center gap-1" style={{ color: "#6B4F10" }}>
                    <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} /> Atualizar
                  </button>
                </div>

                {games.length === 0 ? (
                  <p className="text-center text-xs py-4" style={{ color: "#8a7040" }}>Nenhuma partida disponível.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {games.map((game) => {
                      const joined = getJoinedCount(game);
                      const mp = (game as any).max_players || 2;
                      const alreadyIn = game.player1_id === user?.id || game.player2_id === user?.id || game.player3_id === user?.id || game.player4_id === user?.id;
                      return (
                        <div key={game.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "#f0e8d0", border: "1px solid #d4c8a0" }}>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: "#5a3e0a" }}>{game.player1_name}</p>
                            <p className="text-[10px]" style={{ color: "#8a7040" }}>
                              {joined}/{mp} jogadores
                            </p>
                          </div>
                          <button
                            onClick={() => joinGame(game)}
                            disabled={loading || alreadyIn}
                            className="px-3 py-1 rounded text-xs font-bold text-white disabled:opacity-50"
                            style={{ background: "#6B4F10" }}
                          >
                            {alreadyIn ? "Sua" : "Entrar"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Ranking panel */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="w-full lg:w-72 rounded-xl overflow-hidden shadow-2xl flex-shrink-0"
          style={{ background: "#fdf5e0", border: "4px solid #8B6914", boxShadow: "0 0 0 2px #a07818, 0 8px 32px rgba(0,0,0,0.4)" }}
        >
          <div className="flex items-center gap-2 justify-center pt-4 pb-2">
            <Trophy className="w-5 h-5" style={{ color: "#8B6914" }} />
            <h3 className="text-lg font-black tracking-wider" style={{ color: "#5a3e0a" }}>RANKING</h3>
          </div>
          <div className="px-3 pb-4 space-y-1 max-h-[420px] overflow-y-auto">
            {ranking.length === 0 ? (
              <p className="text-center text-xs py-6" style={{ color: "#8a7040" }}>
                Nenhuma partida online finalizada ainda.
              </p>
            ) : ranking.map((r, i) => {
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`;
              const isMe = r.user_id === user?.id;
              return (
                <div
                  key={r.user_id}
                  className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                  style={{
                    background: isMe ? "#e8ddb8" : i % 2 === 0 ? "#f5efd8" : "#fdf5e0",
                    border: isMe ? "2px solid #8B6914" : "1px solid transparent",
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm w-7 text-center">{medal}</span>
                    <span className="text-xs font-bold truncate max-w-[100px]" style={{ color: "#5a3e0a" }}>
                      {r.user_name}{isMe ? " (eu)" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold">
                    <span style={{ color: "#2d7a2d" }}>✅{r.wins}</span>
                    <span style={{ color: "#a03030" }}>❌{r.losses}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    );
  }

  // ── WAITING ──
  if (view === "waiting") {
    const waitingJoined = currentGame ? getJoinedCount(currentGame) : 1;
    const waitingMax = currentGame?.max_players || 2;
    const isCreator = currentGame?.player1_id === user?.id;

    // Build list of joined players
    const joinedNames: string[] = [];
    if (currentGame) {
      joinedNames.push(currentGame.player1_name);
      if (currentGame.player2_name) joinedNames.push(currentGame.player2_name);
      if (currentGame.player3_name) joinedNames.push(currentGame.player3_name);
      if (currentGame.player4_name) joinedNames.push(currentGame.player4_name);
    }

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
          <h2 className="text-xl font-black" style={{ color: "#5a3e0a" }}>
            Aguardando jogadores...
          </h2>
          <p className="text-sm font-bold" style={{ color: "#8a7040" }}>
            {waitingJoined}/{waitingMax} jogadores
          </p>
          <div className="space-y-1">
            {joinedNames.map((name, i) => (
              <div key={i} className="text-sm px-3 py-1.5 rounded-lg" style={{ background: "#f0e8d0", color: "#5a3e0a" }}>
                {i === 0 ? "👑 " : "✅ "}{name}
              </div>
            ))}
            {Array.from({ length: waitingMax - waitingJoined }).map((_, i) => (
              <div key={`empty-${i}`} className="text-sm px-3 py-1.5 rounded-lg" style={{ background: "#f5efd8", color: "#b8a878" }}>
                ⏳ Aguardando...
              </div>
            ))}
          </div>
          <p className="text-xs" style={{ color: "#8a7040" }}>Compartilhe com colegas!</p>
          {isCreator && (
            <button
              onClick={() => { cancelGame(); setView("lobby"); setCurrentGame(null); }}
              className="px-6 py-2 rounded-lg text-sm font-bold text-white"
              style={{ background: "#8B6914", border: "2px solid #a07818" }}
            >
              Cancelar
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  // ── FINISHED ──
  if (view === "finished") {
    const finishedIsAI = aiMode;
    const allPlayers: { name: string; count: number }[] = [];
    if (finishedIsAI && gsAI) {
      allPlayers.push({ name: "Você", count: gsAI.player1Hand.length });
      for (const op of aiOpponents) {
        allPlayers.push({ name: op.name, count: op.hand.length });
      }
    } else if (currentGame && gsOnline) {
      // Online finished
      const keys = getPlayerKeys(pc);
      for (const k of keys) {
        const isMe = k === myRole;
        const pName = isMe ? "Você" : getOnlinePlayerName(currentGame, k);
        allPlayers.push({ name: pName, count: getHand(gsOnline, k).length });
      }
    }

    const winnerLabel = finishedIsAI
      ? (isWinner ? "Você venceu!" : `${aiWinnerLabel} venceu!`)
      : (isWinner ? "Você venceu!" : `${onlineWinnerName} venceu!`);

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
            {winnerLabel}
          </h2>
          <div className="flex gap-2 justify-center flex-wrap">
            {allPlayers.map((p, i) => (
              <div key={i} className="rounded-xl px-4 py-3 text-center" style={{ background: "#f0e8d0", border: "1px solid #d4c8a0" }}>
                <div className="text-2xl font-black" style={{ color: "#5a3e0a" }}>{p.count}</div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: "#8a7040" }}>{p.name}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-center pt-2">
            {finishedIsAI ? (
              <>
                <button onClick={() => startAIGame(aiDifficulty, aiPlayerCount)} className="px-4 py-2 rounded-lg text-sm font-bold text-white flex items-center gap-2" style={{ background: "#8B6914" }}>
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

  // ── PLAYING ──
  if (view === "playing" && gs) {
    const currentTurnName = isAI
      ? (gs.currentTurn === "player1" ? "Você" : AI_NAMES[gs.currentTurn])
      : (gs.currentTurn === myRole ? "Você" : (currentGame ? getOnlinePlayerName(currentGame, gs.currentTurn) : "Oponente"));

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

        {/* --- TABLE LAYOUT --- */}
        {(() => {
          const opCount = displayOpponents.length;
          const isTableLayout = opCount >= 2; // 3+ players total

          // Helper: render opponent badge + facedown tiles
          const renderOpponent = (op: typeof displayOpponents[0], direction: "horizontal" | "vertical") => {
            const tileSize = direction === "vertical" ? "xs" as const : "sm" as const;
            const showReal = isAdmin && revealOpponents;

            const eyeButton = isAdmin ? (
              <button
                onClick={(e) => { e.stopPropagation(); setRevealOpponents(prev => !prev); }}
                className="p-0.5 rounded-full hover:bg-white/20 transition-colors"
                title={revealOpponents ? "Ocultar pedras" : "Revelar pedras"}
              >
                {revealOpponents ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-white/50" />}
              </button>
            ) : null;

            if (direction === "vertical") {
              return (
                <div className="flex flex-col items-center gap-0.5">
                  <PlayerBadge name={op.name} count={op.hand.length} avatarUrl={op.avatarUrl} isNeon={gs?.currentTurn === op.key} showCount={false} />
                  {eyeButton}
                  <div className="flex flex-col gap-px justify-center items-center">
                    {op.hand.map((_, i) => (
                      <DominoTileVisual key={i} tile={showReal ? op.hand[i] : [0, 0]} size={tileSize} faceDown={!showReal} disabled vertical />
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1">
                  <PlayerBadge name={op.name} count={op.hand.length} avatarUrl={op.avatarUrl} isNeon={gs?.currentTurn === op.key} showCount={false} />
                  {eyeButton}
                </div>
                <div className="flex flex-row gap-0.5 justify-center items-center">
                  {op.hand.map((_, i) => (
                    <DominoTileVisual key={i} tile={showReal ? op.hand[i] : [0, 0]} size={tileSize} faceDown={!showReal} disabled />
                  ))}
                </div>
              </div>
            );
          };

          if (!isTableLayout) {
            // 2 players: classic top-bottom layout
            return (
              <>
                {/* Single opponent on top */}
                <div className="relative z-10">
                  {displayOpponents.map((op) => {
                    const showReal = isAdmin && revealOpponents;
                    return (
                      <div key={op.key}>
                        <div className="flex justify-center items-center gap-1 pb-0.5">
                          <PlayerBadge name={op.name} count={op.hand.length} avatarUrl={op.avatarUrl} isNeon={gs?.currentTurn === op.key} showCount={false} />
                          {isAdmin && (
                            <button
                              onClick={() => setRevealOpponents(prev => !prev)}
                              className="p-0.5 rounded-full hover:bg-white/20 transition-colors"
                              title={revealOpponents ? "Ocultar pedras" : "Revelar pedras"}
                            >
                              {revealOpponents ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-white/50" />}
                            </button>
                          )}
                        </div>
                        <div className="flex justify-center gap-1 pb-1 px-4">
                          {op.hand.map((_, i) => (
                            <motion.div key={i} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.03 }}>
                              <DominoTileVisual tile={showReal ? op.hand[i] : [0, 0]} size="sm" faceDown={!showReal} disabled />
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Board */}
                <div className="relative z-10 flex-1 flex items-center overflow-auto px-2 py-2">
                  {gs.board.length === 0 ? (
                    <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} className="text-white/70 font-bold text-sm w-full text-center">
                      Jogue a primeira peça!
                    </motion.p>
                  ) : (
                    <SnakeBoard board={gs.board} />
                  )}
                </div>
              </>
            );
          }

          // 3-4 players: table layout
          // top opponent, left opponent, (right opponent if 4 players), board in center
          const topOp = displayOpponents[0];
          const leftOp = displayOpponents[1];
          const rightOp = displayOpponents.length >= 3 ? displayOpponents[2] : null;

          return (
            <>
              {/* Top opponent */}
              <div className="relative z-10 flex justify-center py-1">
                {renderOpponent(topOp, "horizontal")}
              </div>

              {/* Middle row: left opponent | board | right opponent */}
              <div className="relative z-10 flex-1 flex items-stretch overflow-hidden">
                {/* Left opponent */}
                <div className="flex items-center justify-center px-0.5 flex-shrink-0" style={{ minWidth: 30 }}>
                  {renderOpponent(leftOp, "vertical")}
                </div>

                {/* Board */}
                <div className="flex-1 flex items-center overflow-auto px-1 py-1">
                  {gs.board.length === 0 ? (
                    <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} className="text-white/70 font-bold text-sm w-full text-center">
                      Jogue a primeira peça!
                    </motion.p>
                  ) : (
                    <SnakeBoard board={gs.board} />
                  )}
                </div>

                {/* Right opponent (4 players only) */}
                {rightOp ? (
                  <div className="flex items-center justify-center px-0.5 flex-shrink-0" style={{ minWidth: 30 }}>
                    {renderOpponent(rightOp, "vertical")}
                  </div>
                ) : (
                  <div style={{ minWidth: 20 }} />
                )}
              </div>
            </>
          );
        })()}

        {/* Turn indicator */}
        <div className="relative z-10 text-center py-1">
          {aiThinking ? (
            <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-sm font-bold text-white" style={{ background: "rgba(139,105,20,0.8)" }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> {currentTurnName} pensando...
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
              {isMyTurn ? "✋ Sua vez!" : `Vez de ${currentTurnName}`}
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

        {/* Player score badge */}
        <div className="relative z-10 flex justify-center pb-2">
          <PlayerBadge name={playerName} count={myHand.length} avatarUrl={profile?.avatar_url} isNeon={isMyTurn} />
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
