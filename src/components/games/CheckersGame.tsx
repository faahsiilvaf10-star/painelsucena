import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Maximize, Minimize, RotateCcw, Trophy, Wifi, Monitor, Palette, Zap, Droplets, Sun, Sparkles, Flame, Snowflake, Star, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { NeonAvatar } from "@/components/ui/NeonAvatar";

// ── Types ──
type AIDifficulty = "easy" | "medium" | "hard";
type PieceColor = "white" | "black";
type PieceType = "normal" | "king";
type GameMode = "ai" | "online";
type OnlineStatus = "lobby" | "waiting" | "playing" | "finished";
interface Piece { color: PieceColor; type: PieceType; }
type Cell = Piece | null;
type Board = Cell[][];
interface Position { row: number; col: number; }
interface Move { from: Position; to: Position; captures: Position[]; intermediateSteps?: Position[]; }

interface PieceStyle {
  color: string;
  effect: string;
  team?: string;
}

const PIECE_COLORS: { id: string; label: string; gradient: string; border: string }[] = [
  { id: "classic-white", label: "Clássica", gradient: "radial-gradient(circle at 35% 35%, #ffffff, #e8dcc8)", border: "#c4a870" },
  { id: "red", label: "Vermelho", gradient: "radial-gradient(circle at 35% 35%, #ff4444, #aa1111)", border: "#880000" },
  { id: "blue", label: "Azul", gradient: "radial-gradient(circle at 35% 35%, #4488ff, #1144aa)", border: "#002288" },
  { id: "green", label: "Verde", gradient: "radial-gradient(circle at 35% 35%, #44dd44, #119911)", border: "#006600" },
  { id: "purple", label: "Roxo", gradient: "radial-gradient(circle at 35% 35%, #bb44ff, #7711cc)", border: "#550088" },
  { id: "gold", label: "Dourado", gradient: "radial-gradient(circle at 35% 35%, #ffd700, #b8860b)", border: "#8B6914" },
  { id: "pink", label: "Rosa", gradient: "radial-gradient(circle at 35% 35%, #ff69b4, #cc1177)", border: "#990055" },
  { id: "cyan", label: "Ciano", gradient: "radial-gradient(circle at 35% 35%, #00e5ff, #0088aa)", border: "#005566" },
  { id: "black", label: "Preto", gradient: "radial-gradient(circle at 35% 35%, #444444, #111111)", border: "#000000" },
  { id: "dark-navy", label: "Marinho", gradient: "radial-gradient(circle at 35% 35%, #1a2a5e, #0a1030)", border: "#050820" },
  { id: "dark-red", label: "Vinho", gradient: "radial-gradient(circle at 35% 35%, #8b1a1a, #4a0808)", border: "#2a0000" },
  { id: "dark-green", label: "Musgo", gradient: "radial-gradient(circle at 35% 35%, #2d5a27, #122210)", border: "#0a1508" },
  { id: "silver", label: "Prata", gradient: "radial-gradient(circle at 35% 35%, #d0d0d0, #909090)", border: "#606060" },
  { id: "bronze", label: "Bronze", gradient: "radial-gradient(circle at 35% 35%, #cd7f32, #8a5520)", border: "#5a3510" },
  { id: "orange", label: "Laranja", gradient: "radial-gradient(circle at 35% 35%, #ff8c00, #cc5500)", border: "#993300" },
];

// Brasileirão Serie A teams
const TEAM_BADGES: { id: string; label: string; emoji: string }[] = [
  { id: "flamengo", label: "Flamengo", emoji: "🔴⚫" },
  { id: "palmeiras", label: "Palmeiras", emoji: "🟢" },
  { id: "corinthians", label: "Corinthians", emoji: "⚫⚪" },
  { id: "sao-paulo", label: "São Paulo", emoji: "🔴⚪⚫" },
  { id: "fluminense", label: "Fluminense", emoji: "🟢🔴⚪" },
  { id: "botafogo", label: "Botafogo", emoji: "⭐⚫" },
  { id: "vasco", label: "Vasco", emoji: "⚫⬜" },
  { id: "gremio", label: "Grêmio", emoji: "🔵⚫⚪" },
  { id: "internacional", label: "Internacional", emoji: "🔴⚪" },
  { id: "atletico-mg", label: "Atlético-MG", emoji: "⚫⚪" },
  { id: "cruzeiro", label: "Cruzeiro", emoji: "🔵⚪" },
  { id: "santos", label: "Santos", emoji: "⚪⚫" },
  { id: "bahia", label: "Bahia", emoji: "🔵🔴⚪" },
  { id: "fortaleza", label: "Fortaleza", emoji: "🔵🔴⚪" },
  { id: "athletico-pr", label: "Athletico-PR", emoji: "🔴⚫" },
  { id: "bragantino", label: "Bragantino", emoji: "🔴⚪" },
  { id: "cuiaba", label: "Cuiabá", emoji: "🟢🟡" },
  { id: "goias", label: "Goiás", emoji: "🟢⚪" },
  { id: "coritiba", label: "Coritiba", emoji: "🟢⚪" },
  { id: "america-mg", label: "América-MG", emoji: "🟢⚫" },
];

const TEAM_GRADIENTS: Record<string, { gradient: string; border: string; textColor: string }> = {
  "flamengo": { gradient: "radial-gradient(circle at 35% 35%, #e61e1e, #1a1a1a)", border: "#cc0000", textColor: "#fff" },
  "palmeiras": { gradient: "radial-gradient(circle at 35% 35%, #006437, #003a1f)", border: "#004d28", textColor: "#fff" },
  "corinthians": { gradient: "radial-gradient(circle at 35% 35%, #3a3a3a, #111111)", border: "#000", textColor: "#fff" },
  "sao-paulo": { gradient: "radial-gradient(circle at 35% 35%, #f0f0f0, #cc0000)", border: "#cc0000", textColor: "#000" },
  "fluminense": { gradient: "radial-gradient(circle at 35% 35%, #7b1f3b, #006633)", border: "#7b1f3b", textColor: "#fff" },
  "botafogo": { gradient: "radial-gradient(circle at 35% 35%, #2a2a2a, #000000)", border: "#333", textColor: "#fff" },
  "vasco": { gradient: "radial-gradient(circle at 35% 35%, #ffffff, #1a1a1a)", border: "#000", textColor: "#000" },
  "gremio": { gradient: "radial-gradient(circle at 35% 35%, #0060aa, #001e3c)", border: "#0060aa", textColor: "#fff" },
  "internacional": { gradient: "radial-gradient(circle at 35% 35%, #e31e24, #8b0000)", border: "#cc0000", textColor: "#fff" },
  "atletico-mg": { gradient: "radial-gradient(circle at 35% 35%, #3a3a3a, #000000)", border: "#222", textColor: "#fff" },
  "cruzeiro": { gradient: "radial-gradient(circle at 35% 35%, #003da5, #001a4a)", border: "#003da5", textColor: "#fff" },
  "santos": { gradient: "radial-gradient(circle at 35% 35%, #f5f5f5, #aaaaaa)", border: "#888", textColor: "#000" },
  "bahia": { gradient: "radial-gradient(circle at 35% 35%, #0056a6, #cc0000)", border: "#0056a6", textColor: "#fff" },
  "fortaleza": { gradient: "radial-gradient(circle at 35% 35%, #0056a6, #cc1111)", border: "#0056a6", textColor: "#fff" },
  "athletico-pr": { gradient: "radial-gradient(circle at 35% 35%, #cc0000, #1a1a1a)", border: "#aa0000", textColor: "#fff" },
  "bragantino": { gradient: "radial-gradient(circle at 35% 35%, #e31e24, #ffffff)", border: "#cc0000", textColor: "#fff" },
  "cuiaba": { gradient: "radial-gradient(circle at 35% 35%, #007a33, #ffd700)", border: "#007a33", textColor: "#fff" },
  "goias": { gradient: "radial-gradient(circle at 35% 35%, #006633, #ffffff)", border: "#006633", textColor: "#fff" },
  "coritiba": { gradient: "radial-gradient(circle at 35% 35%, #006633, #eeeeee)", border: "#006633", textColor: "#fff" },
  "america-mg": { gradient: "radial-gradient(circle at 35% 35%, #006633, #1a1a1a)", border: "#006633", textColor: "#fff" },
};

const PIECE_EFFECTS: { id: string; label: string; icon: React.ReactNode; cssClass: string }[] = [
  { id: "none", label: "Nenhum", icon: <Star className="w-4 h-4" />, cssClass: "" },
  { id: "neon", label: "Neon", icon: <Zap className="w-4 h-4" />, cssClass: "checkers-neon" },
  { id: "rays", label: "Raios", icon: <Sparkles className="w-4 h-4" />, cssClass: "checkers-rays" },
  { id: "rain", label: "Chuva", icon: <Droplets className="w-4 h-4" />, cssClass: "checkers-rain" },
  { id: "sunflower", label: "Girassol", icon: <Sun className="w-4 h-4" />, cssClass: "checkers-sunflower" },
  { id: "fire", label: "Fogo", icon: <Flame className="w-4 h-4" />, cssClass: "checkers-fire" },
  { id: "ice", label: "Gelo", icon: <Snowflake className="w-4 h-4" />, cssClass: "checkers-ice" },
  { id: "sparkle", label: "Brilho", icon: <Sparkles className="w-4 h-4" />, cssClass: "checkers-sparkle" },
];

const BOARD_SIZE = 8;
const DIFFICULTY_CONFIG: Record<AIDifficulty, { label: string; emoji: string; description: string; depth: number }> = {
  easy: { label: "FÁCIL", emoji: "🟢", description: "IA joga aleatoriamente", depth: 1 },
  medium: { label: "MÉDIO", emoji: "🟡", description: "IA com estratégia moderada", depth: 3 },
  hard: { label: "DIFÍCIL", emoji: "🔴", description: "IA com estratégia avançada", depth: 5 },
};

// ── Inject effect keyframes ──
const EFFECTS_STYLE_ID = "checkers-effects-keyframes";
if (typeof document !== "undefined" && !document.getElementById(EFFECTS_STYLE_ID)) {
  const style = document.createElement("style");
  style.id = EFFECTS_STYLE_ID;
  style.textContent = `
    .checkers-neon { box-shadow: 0 0 8px 3px currentColor, 0 0 16px 6px currentColor, inset 0 0 6px 1px rgba(255,255,255,0.3) !important; animation: checkers-neon-pulse 2s ease-in-out infinite !important; }
    @keyframes checkers-neon-pulse { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.4); } }
    
    .checkers-rays { animation: checkers-rays-spin 3s linear infinite !important; }
    .checkers-rays::after { content: ''; position: absolute; inset: -4px; border-radius: 50%; background: conic-gradient(from 0deg, transparent, rgba(255,255,100,0.6), transparent, rgba(255,255,100,0.6), transparent, rgba(255,255,100,0.6), transparent); animation: checkers-rays-counter 2s linear infinite; pointer-events: none; }
    @keyframes checkers-rays-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes checkers-rays-counter { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
    
    .checkers-rain { position: relative; overflow: visible; }
    .checkers-rain::before { content: '💧'; position: absolute; top: -8px; left: 50%; font-size: 8px; animation: checkers-rain-drop 1.2s ease-in infinite; pointer-events: none; }
    .checkers-rain::after { content: '💧'; position: absolute; top: -8px; left: 30%; font-size: 6px; animation: checkers-rain-drop 1.5s ease-in 0.4s infinite; pointer-events: none; }
    @keyframes checkers-rain-drop { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(24px); opacity: 0; } }
    
    .checkers-sunflower { animation: checkers-sunflower-glow 2.5s ease-in-out infinite !important; }
    .checkers-sunflower::after { content: '🌻'; position: absolute; top: -6px; right: -6px; font-size: 10px; animation: checkers-sunflower-bounce 2s ease-in-out infinite; pointer-events: none; }
    @keyframes checkers-sunflower-glow { 0%,100% { box-shadow: 0 0 6px rgba(255,200,0,0.4); } 50% { box-shadow: 0 0 18px rgba(255,200,0,0.8); } }
    @keyframes checkers-sunflower-bounce { 0%,100% { transform: scale(1) rotate(0deg); } 50% { transform: scale(1.2) rotate(15deg); } }
    
    .checkers-fire { animation: checkers-fire-flicker 0.3s ease-in-out infinite alternate !important; }
    .checkers-fire::after { content: '🔥'; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); font-size: 12px; animation: checkers-fire-rise 0.8s ease-in-out infinite; pointer-events: none; }
    @keyframes checkers-fire-flicker { from { box-shadow: 0 0 8px rgba(255,80,0,0.6); } to { box-shadow: 0 0 16px rgba(255,120,0,0.9); } }
    @keyframes checkers-fire-rise { 0%,100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; } 50% { transform: translateX(-50%) translateY(-6px) scale(1.1); opacity: 0.7; } }
    
    .checkers-ice { animation: checkers-ice-shimmer 3s ease-in-out infinite !important; }
    .checkers-ice::after { content: '❄️'; position: absolute; top: -6px; right: -6px; font-size: 9px; animation: checkers-ice-rotate 4s linear infinite; pointer-events: none; }
    @keyframes checkers-ice-shimmer { 0%,100% { box-shadow: 0 0 8px rgba(100,200,255,0.4); filter: brightness(1); } 50% { box-shadow: 0 0 16px rgba(100,200,255,0.8); filter: brightness(1.2); } }
    @keyframes checkers-ice-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    
    .checkers-sparkle { animation: checkers-sparkle-twinkle 1.5s ease-in-out infinite !important; }
    .checkers-sparkle::before { content: '✨'; position: absolute; top: -6px; left: -4px; font-size: 10px; animation: checkers-sparkle-pop 2s ease-in-out infinite; pointer-events: none; }
    .checkers-sparkle::after { content: '✨'; position: absolute; bottom: -4px; right: -4px; font-size: 8px; animation: checkers-sparkle-pop 2s ease-in-out 0.6s infinite; pointer-events: none; }
    @keyframes checkers-sparkle-twinkle { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.3); } }
    @keyframes checkers-sparkle-pop { 0%,100% { transform: scale(0.6); opacity: 0.4; } 50% { transform: scale(1.2); opacity: 1; } }
  `;
  document.head.appendChild(style);
}

// ── Board Logic ──
function createInitialBoard(): Board {
  const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 8; c++)
      if ((r + c) % 2 === 1) board[r][c] = { color: "black", type: "normal" };
  for (let r = 5; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if ((r + c) % 2 === 1) board[r][c] = { color: "white", type: "normal" };
  return board;
}

function cloneBoard(b: Board): Board {
  return b.map(row => row.map(cell => cell ? { ...cell } : null));
}

function getValidMoves(board: Board, color: PieceColor): Move[] {
  const captures: Move[] = [];
  const simple: Move[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = board[r][c];
      if (!piece || piece.color !== color) continue;
      const pCaptures = getCapturesFromOrigin(board, { row: r, col: c }, piece);
      captures.push(...pCaptures);
      if (captures.length === 0) {
        const pSimple = getSimpleMovesForPiece(board, { row: r, col: c }, piece);
        simple.push(...pSimple);
      }
    }
  }
  if (captures.length > 0) return captures;
  return simple;
}

function getCapturesFromOrigin(board: Board, pos: Position, piece: Piece): Move[] {
  const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const results: Move[] = [];
  function recurse(b: Board, curPos: Position, captured: Position[], steps: Position[]) {
    let found = false;
    for (const [dr, dc] of directions) {
      const midR = curPos.row + dr, midC = curPos.col + dc;
      const endR = curPos.row + dr * 2, endC = curPos.col + dc * 2;
      if (endR < 0 || endR >= BOARD_SIZE || endC < 0 || endC >= BOARD_SIZE) continue;
      const mid = b[midR][midC], end = b[endR][endC];
      if (!mid || mid.color === piece.color) continue;
      if (end !== null) continue;
      if (captured.some(p => p.row === midR && p.col === midC)) continue;
      found = true;
      const nb = cloneBoard(b);
      nb[curPos.row][curPos.col] = null;
      nb[midR][midC] = null;
      nb[endR][endC] = piece;
      recurse(nb, { row: endR, col: endC }, [...captured, { row: midR, col: midC }], [...steps, { row: endR, col: endC }]);
    }
    if (!found && captured.length > 0) {
      results.push({ from: pos, to: steps[steps.length - 1], captures: captured, intermediateSteps: steps });
    }
  }
  recurse(board, pos, [], []);
  return results;
}

function getSimpleMovesForPiece(board: Board, pos: Position, piece: Piece): Move[] {
  const directions = piece.type === "king" ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : piece.color === "white" ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
  const moves: Move[] = [];
  for (const [dr, dc] of directions) {
    const nr = pos.row + dr, nc = pos.col + dc;
    if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
    if (board[nr][nc] === null) moves.push({ from: pos, to: { row: nr, col: nc }, captures: [] });
  }
  return moves;
}

function applyMove(board: Board, move: Move): Board {
  const newBoard = cloneBoard(board);
  const piece = newBoard[move.from.row][move.from.col]!;
  newBoard[move.from.row][move.from.col] = null;
  for (const cap of move.captures) newBoard[cap.row][cap.col] = null;
  if (piece.color === "white" && move.to.row === 0) piece.type = "king";
  if (piece.color === "black" && move.to.row === 7) piece.type = "king";
  newBoard[move.to.row][move.to.col] = piece;
  return newBoard;
}

function countPieces(board: Board, color: PieceColor): number {
  let count = 0;
  for (const row of board) for (const cell of row) if (cell?.color === color) count++;
  return count;
}

function evaluateBoard(board: Board): number {
  let score = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r][c];
      if (!p) continue;
      const val = p.type === "king" ? 3 : 1;
      const posBonus = p.type === "normal" ? (p.color === "black" ? r * 0.1 : (7 - r) * 0.1) : 0;
      score += p.color === "black" ? (val + posBonus) : -(val + posBonus);
    }
  }
  return score;
}

function minimax(board: Board, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  const color = maximizing ? "black" : "white";
  const moves = getValidMoves(board, color);
  if (depth === 0 || moves.length === 0) return evaluateBoard(board);
  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const ev = minimax(applyMove(board, move), depth - 1, alpha, beta, false);
      maxEval = Math.max(maxEval, ev); alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const ev = minimax(applyMove(board, move), depth - 1, alpha, beta, true);
      minEval = Math.min(minEval, ev); beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function aiChooseMove(board: Board, difficulty: AIDifficulty): Move | null {
  const moves = getValidMoves(board, "black");
  if (moves.length === 0) return null;
  if (difficulty === "easy") return moves[Math.floor(Math.random() * moves.length)];
  const depth = DIFFICULTY_CONFIG[difficulty].depth;
  let bestMove = moves[0], bestScore = -Infinity;
  for (const move of moves) {
    const score = minimax(applyMove(board, move), depth - 1, -Infinity, Infinity, false);
    if (score > bestScore) { bestScore = score; bestMove = move; }
  }
  return bestMove;
}

// ── Fullscreen ──
function requestFullscreen(el: HTMLElement) {
  if (el.requestFullscreen) el.requestFullscreen();
  else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
}
function exitFullscreen() {
  if (document.exitFullscreen) document.exitFullscreen();
  else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
}
function isFullscreenActive() {
  return !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
}

// ── Styling ──
const FELT_BG: React.CSSProperties = {
  background: "radial-gradient(ellipse at center, #2d8a4e 0%, #1e6b3a 40%, #145428 80%, #0e3d1c 100%)",
};
const FELT_TEXTURE = (
  <div className="absolute inset-0 pointer-events-none" style={{
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
  }} />
);
const LIGHT_SQUARE = "#e8c882";
const DARK_SQUARE = "#8B5E34";
const BLACK_PIECE_BG = "radial-gradient(circle at 35% 35%, #5a3a1a, #2a1a0a)";
const BLACK_PIECE_BORDER = "#1a0a00";

function getPieceVisual(color: PieceColor, style: PieceStyle) {
  if (color === "black") return { bg: BLACK_PIECE_BG, border: BLACK_PIECE_BORDER, teamLabel: "" };
  // Team mode
  if (style.team) {
    const t = TEAM_GRADIENTS[style.team];
    if (t) return { bg: t.gradient, border: t.border, teamLabel: TEAM_BADGES.find(b => b.id === style.team)?.label?.[0]?.toUpperCase() || "" };
  }
  const found = PIECE_COLORS.find(c => c.id === style.color);
  if (found) return { bg: found.gradient, border: found.border, teamLabel: "" };
  return { bg: PIECE_COLORS[0].gradient, border: PIECE_COLORS[0].border, teamLabel: "" };
}

// ── Main Component ──
export function CheckersGame({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [view, setView] = useState<"lobby" | "playing" | "finished">("lobby");
  const [gameMode, setGameMode] = useState<GameMode>("ai");
  const [board, setBoard] = useState<Board>(createInitialBoard());
  const [currentTurn, setCurrentTurn] = useState<PieceColor>("white");
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [highlightedMoves, setHighlightedMoves] = useState<Move[]>([]);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>("medium");
  const [aiThinking, setAiThinking] = useState(false);
  const [winner, setWinner] = useState<PieceColor | "draw" | null>(null);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [capturedWhite, setCapturedWhite] = useState(0);
  const [capturedBlack, setCapturedBlack] = useState(0);
  const [isFS, setIsFS] = useState(false);
  const [ranking, setRanking] = useState<{ user_id: string; user_name: string; avatar_url: string | null; wins: number; losses: number }[]>([]);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const aiThinkingRef = useRef(false);

  const [isAnimating, setIsAnimating] = useState(false);
  const [fadingPieces, setFadingPieces] = useState<Position[]>([]);
  const [animatingPiece, setAnimatingPiece] = useState<{ piece: Piece; pos: Position } | null>(null);
  const [hiddenPos, setHiddenPos] = useState<Position | null>(null);

  // Piece customization
  const [pieceStyle, setPieceStyle] = useState<PieceStyle>({ color: "classic-white", effect: "none" });
  const [showCustomizer, setShowCustomizer] = useState(false);

  // Online multiplayer
  const [onlineGameId, setOnlineGameId] = useState<string | null>(null);
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>("lobby");
  const [myOnlineColor, setMyOnlineColor] = useState<PieceColor>("white");
  const [opponentName, setOpponentName] = useState<string>("");
  const [opponentAvatar, setOpponentAvatar] = useState<string | null>(null);
  const [waitingGames, setWaitingGames] = useState<any[]>([]);
  const subscriptionRef = useRef<any>(null);

  const playerName = profile?.full_name || "Jogador";
  const playerAvatar = profile?.avatar_url || null;
  const firstName = playerName.split(" ")[0];

  // ── ANIMATION (slower) ──
  const animateMove = useCallback((b: Board, move: Move, onDone: (finalBoard: Board) => void) => {
    const piece = b[move.from.row][move.from.col]!;
    if (!move.intermediateSteps || move.intermediateSteps.length <= 1) {
      const newBoard = applyMove(b, move);
      if (move.captures.length > 0) {
        setFadingPieces([...move.captures]);
        setTimeout(() => { setFadingPieces([]); onDone(newBoard); }, 600);
      } else {
        onDone(newBoard);
      }
      return;
    }
    setIsAnimating(true);
    setHiddenPos(move.from);
    setAnimatingPiece({ piece, pos: move.from });
    const steps = move.intermediateSteps;
    let stepIdx = 0;
    const capturedSoFar: Position[] = [];
    const nextStep = () => {
      if (stepIdx >= steps.length) {
        setAnimatingPiece(null);
        setHiddenPos(null);
        setIsAnimating(false);
        setTimeout(() => setFadingPieces([]), 600);
        onDone(applyMove(b, move));
        return;
      }
      const target = steps[stepIdx];
      if (move.captures[stepIdx]) {
        capturedSoFar.push(move.captures[stepIdx]);
        setFadingPieces([...capturedSoFar]);
      }
      setAnimatingPiece({ piece, pos: target });
      stepIdx++;
      setTimeout(nextStep, 700); // Much slower - 700ms per step
    };
    setTimeout(nextStep, 200);
  }, []);

  // ── Fullscreen tracking ──
  useEffect(() => {
    const handler = () => setIsFS(isFullscreenActive());
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    return () => { document.removeEventListener("fullscreenchange", handler); document.removeEventListener("webkitfullscreenchange", handler); };
  }, []);

  useEffect(() => {
    if (view === "playing" && gameContainerRef.current && !isFullscreenActive()) requestFullscreen(gameContainerRef.current);
  }, [view]);

  useEffect(() => {
    if (view !== "playing" && isFullscreenActive()) exitFullscreen();
  }, [view]);

  // ── Ranking (online only) ──
  const fetchRanking = useCallback(async () => {
    const { data } = await supabase.from("checkers_stats").select("*").order("wins", { ascending: false }).limit(20);
    setRanking((data as any[]) || []);
  }, []);

  useEffect(() => { fetchRanking(); }, [fetchRanking]);

  const saveOnlineStats = useCallback(async (won: boolean) => {
    if (!user) return;
    const { data: myStats } = await supabase.from("checkers_stats").select("*").eq("user_id", user.id).maybeSingle();
    if (myStats) {
      await supabase.from("checkers_stats").update({
        wins: (myStats as any).wins + (won ? 1 : 0),
        losses: (myStats as any).losses + (won ? 0 : 1),
        user_name: firstName,
        avatar_url: playerAvatar,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
    } else {
      await supabase.from("checkers_stats").insert({
        user_id: user.id, user_name: firstName, avatar_url: playerAvatar,
        wins: won ? 1 : 0, losses: won ? 0 : 1,
      });
    }
    fetchRanking();
  }, [user, firstName, playerAvatar, fetchRanking]);

  // ── Check game end ──
  const checkGameEnd = useCallback((b: Board, turn: PieceColor, isOnline: boolean) => {
    const moves = getValidMoves(b, turn);
    if (moves.length === 0) {
      const w = turn === "white" ? "black" : "white";
      setWinner(countPieces(b, "white") === 0 && countPieces(b, "black") === 0 ? "draw" : w);
      setView("finished");
      if (isOnline) {
        const myColor = myOnlineColor;
        if (w === myColor) saveOnlineStats(true);
        else saveOnlineStats(false);
      }
      return true;
    }
    return false;
  }, [saveOnlineStats, myOnlineColor]);

  // ── AI turn ──
  useEffect(() => {
    if (gameMode !== "ai" || view !== "playing" || currentTurn !== "black" || aiThinkingRef.current || winner || isAnimating) return;
    aiThinkingRef.current = true;
    setAiThinking(true);
    const delay = aiDifficulty === "easy" ? 600 : aiDifficulty === "medium" ? 1000 : 1500;
    const timer = setTimeout(() => {
      const move = aiChooseMove(board, aiDifficulty);
      if (!move) {
        setWinner("white"); setView("finished");
        setAiThinking(false); aiThinkingRef.current = false;
      } else {
        animateMove(board, move, (newBoard) => {
          setBoard(newBoard); setLastMove(move);
          setCapturedWhite(prev => prev + move.captures.length);
          setCurrentTurn("white");
          setAiThinking(false); aiThinkingRef.current = false;
          checkGameEnd(newBoard, "white", false);
        });
      }
    }, delay);
    return () => { clearTimeout(timer); aiThinkingRef.current = false; };
  }, [gameMode, view, currentTurn, board, aiDifficulty, winner, checkGameEnd, isAnimating, animateMove]);

  // ── Valid moves ──
  useEffect(() => {
    if (view === "playing" && !winner) {
      if (gameMode === "ai" && currentTurn === "white") {
        setValidMoves(getValidMoves(board, "white"));
      } else if (gameMode === "online" && currentTurn === myOnlineColor) {
        setValidMoves(getValidMoves(board, myOnlineColor));
      } else {
        setValidMoves([]);
      }
    }
  }, [board, currentTurn, view, winner, gameMode, myOnlineColor]);

  // ── Online: fetch waiting games ──
  const fetchWaitingGames = useCallback(async () => {
    const { data } = await supabase.from("checkers_games").select("*").eq("status", "waiting").neq("player1_id", user?.id || "");
    setWaitingGames((data as any[]) || []);
  }, [user]);

  // ── Online: create game ──
  const createOnlineGame = useCallback(async () => {
    if (!user) return;
    const initBoard = createInitialBoard();
    const { data, error } = await supabase.from("checkers_games").insert({
      player1_id: user.id,
      player1_name: firstName,
      player1_avatar_url: playerAvatar,
      board: initBoard as any,
      player1_piece_style: pieceStyle as any,
      status: "waiting",
    }).select().single();
    if (error || !data) return;
    setOnlineGameId((data as any).id);
    setMyOnlineColor("white");
    setOnlineStatus("waiting");
  }, [user, firstName, playerAvatar, pieceStyle]);

  // ── Online: join game ──
  const joinOnlineGame = useCallback(async (gameId: string) => {
    if (!user) return;
    const { data, error } = await supabase.from("checkers_games").update({
      player2_id: user.id,
      player2_name: firstName,
      player2_avatar_url: playerAvatar,
      player2_piece_style: pieceStyle as any,
      status: "playing",
    }).eq("id", gameId).select().single();
    if (error || !data) return;
    const g = data as any;
    setOnlineGameId(g.id);
    setMyOnlineColor("black");
    setBoard(g.board);
    setOpponentName(g.player1_name);
    setOpponentAvatar(g.player1_avatar_url);
    setCurrentTurn("white");
    setOnlineStatus("playing");
    setView("playing");
  }, [user, firstName, playerAvatar, pieceStyle]);

  // ── Online: subscribe to game changes ──
  useEffect(() => {
    if (!onlineGameId || gameMode !== "online") return;
    const channel = supabase.channel(`checkers-game-${onlineGameId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "checkers_games", filter: `id=eq.${onlineGameId}` }, (payload) => {
        const g = payload.new as any;
        if (g.status === "playing" && onlineStatus === "waiting") {
          // Opponent joined
          setBoard(g.board);
          setOpponentName(g.player2_name);
          setOpponentAvatar(g.player2_avatar_url);
          setCurrentTurn(g.current_turn);
          setOnlineStatus("playing");
          setView("playing");
        } else if (g.status === "playing") {
          // Move update
          setBoard(g.board);
          setCurrentTurn(g.current_turn);
          setCapturedWhite(g.captured_white);
          setCapturedBlack(g.captured_black);
          if (g.last_move) setLastMove(g.last_move);
        } else if (g.status === "finished") {
          setBoard(g.board);
          const winnerId = g.winner_id;
          if (!winnerId) setWinner("draw");
          else if (winnerId === user?.id) { setWinner(myOnlineColor); saveOnlineStats(true); }
          else { setWinner(myOnlineColor === "white" ? "black" : "white"); saveOnlineStats(false); }
          setView("finished");
        }
      })
      .subscribe();
    subscriptionRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [onlineGameId, gameMode, onlineStatus, user, myOnlineColor, saveOnlineStats]);

  // ── Online: send move ──
  const sendOnlineMove = useCallback(async (newBoard: Board, move: Move, nextTurn: PieceColor, capW: number, capB: number) => {
    if (!onlineGameId) return;
    const whiteCount = countPieces(newBoard, "white");
    const blackCount = countPieces(newBoard, "black");
    const nextMoves = getValidMoves(newBoard, nextTurn);
    let status = "playing";
    let winnerId: string | null = null;
    if (nextMoves.length === 0 || whiteCount === 0 || blackCount === 0) {
      status = "finished";
      winnerId = (nextTurn === myOnlineColor) ? (myOnlineColor === "white" ? (null) : user?.id || null) : user?.id || null;
      // If the next turn player has no moves, current player wins
      if (nextMoves.length === 0) winnerId = user?.id || null;
    }
    await supabase.from("checkers_games").update({
      board: newBoard as any,
      current_turn: nextTurn,
      last_move: move as any,
      captured_white: capW,
      captured_black: capB,
      status,
      winner_id: winnerId,
      updated_at: new Date().toISOString(),
    }).eq("id", onlineGameId);
  }, [onlineGameId, user, myOnlineColor]);

  // ── Cell click handler ──
  const handleCellClick = useCallback((row: number, col: number) => {
    const isMyTurn = gameMode === "ai" ? currentTurn === "white" : currentTurn === myOnlineColor;
    if (!isMyTurn || aiThinking || winner || isAnimating) return;
    const piece = board[row][col];

    if (selectedPos && highlightedMoves.length > 0) {
      const move = highlightedMoves.find(m => m.to.row === row && m.to.col === col);
      if (move) {
        setSelectedPos(null); setHighlightedMoves([]);
        animateMove(board, move, (newBoard) => {
          setBoard(newBoard); setLastMove(move);
          const newCapB = capturedBlack + (move.captures.length * (currentTurn === "white" ? 1 : 0));
          const newCapW = capturedWhite + (move.captures.length * (currentTurn === "black" ? 1 : 0));
          if (currentTurn === "white") setCapturedBlack(newCapB); else setCapturedWhite(newCapW);
          const nextTurn: PieceColor = currentTurn === "white" ? "black" : "white";
          setCurrentTurn(nextTurn);
          if (gameMode === "online") {
            sendOnlineMove(newBoard, move, nextTurn, currentTurn === "black" ? newCapW : capturedWhite, currentTurn === "white" ? newCapB : capturedBlack);
          }
          checkGameEnd(newBoard, nextTurn, gameMode === "online");
        });
        return;
      }
    }

    const myColor = gameMode === "ai" ? "white" : myOnlineColor;
    if (piece && piece.color === myColor) {
      const pieceMoves = validMoves.filter(m => m.from.row === row && m.from.col === col);
      if (pieceMoves.length > 0) { setSelectedPos({ row, col }); setHighlightedMoves(pieceMoves); }
      else { setSelectedPos(null); setHighlightedMoves([]); }
      return;
    }
    setSelectedPos(null); setHighlightedMoves([]);
  }, [board, currentTurn, aiThinking, winner, selectedPos, highlightedMoves, validMoves, checkGameEnd, isAnimating, animateMove, gameMode, myOnlineColor, capturedBlack, capturedWhite, sendOnlineMove]);

  const startAIGame = (difficulty: AIDifficulty) => {
    setGameMode("ai"); setAiDifficulty(difficulty);
    setBoard(createInitialBoard()); setCurrentTurn("white");
    setSelectedPos(null); setHighlightedMoves([]); setValidMoves([]);
    setWinner(null); setLastMove(null);
    setCapturedWhite(0); setCapturedBlack(0);
    aiThinkingRef.current = false; setView("playing");
  };

  const goToLobby = () => {
    setView("lobby"); setWinner(null); setOnlineStatus("lobby"); setOnlineGameId(null);
    if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
    if (isFullscreenActive()) exitFullscreen();
  };

  const isWinner = gameMode === "ai" ? winner === "white" : winner === myOnlineColor;

  // ── Piece visual helpers ──
  const getMyPieceVisual = () => getPieceVisual("white", pieceStyle);
  const effectClass = PIECE_EFFECTS.find(e => e.id === pieceStyle.effect)?.cssClass || "";

  // ── Render Piece ──
  const renderPiece = (cell: Piece, isMovable: boolean, isSelected: boolean, size: "board" | "indicator") => {
    const isMyPiece = gameMode === "ai" ? cell.color === "white" : cell.color === myOnlineColor;
    
    // AI/opponent pieces always use default style - no effects, no customization
    if (!isMyPiece) {
      return (
        <div
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: size === "board" ? "78%" : 16,
            height: size === "board" ? "78%" : 16,
            background: BLACK_PIECE_BG,
            border: `2.5px solid ${BLACK_PIECE_BORDER}`,
            boxShadow: isSelected
              ? `0 0 12px 3px rgba(100,180,50,0.6), 0 4px 8px rgba(0,0,0,0.3)`
              : `0 3px 6px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.15)`,
            cursor: isMovable ? "pointer" : "default",
          }}
        >
          {size === "board" && (
            <div className="absolute rounded-full pointer-events-none" style={{
              width: "65%", height: "65%",
              border: "1.5px solid rgba(255,255,255,0.15)",
            }} />
          )}
          {cell.type === "king" && size === "board" && (
            <span className="text-[clamp(10px,2.5vw,18px)] select-none pointer-events-none" style={{ filter: "brightness(2)" }}>👑</span>
          )}
        </div>
      );
    }

    // Player's customized piece
    const visual = getMyPieceVisual();
    return (
      <div
        className={`relative flex items-center justify-center rounded-full ${effectClass}`}
        style={{
          width: size === "board" ? "78%" : 16,
          height: size === "board" ? "78%" : 16,
          background: visual.bg,
          border: `2.5px solid ${visual.border}`,
          boxShadow: isSelected
            ? `0 0 12px 3px rgba(100,180,50,0.6), 0 4px 8px rgba(0,0,0,0.3)`
            : `0 3px 6px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.6)`,
          cursor: isMovable ? "pointer" : "default",
          color: visual.border,
        }}
      >
        {size === "board" && !visual.teamLabel && (
          <div className="absolute rounded-full pointer-events-none" style={{
            width: "65%", height: "65%",
            border: "1.5px solid rgba(180,150,100,0.5)",
          }} />
        )}
        {size === "board" && visual.teamLabel && (
          <span className="text-[clamp(8px,2vw,14px)] font-black select-none pointer-events-none" style={{ color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
            {visual.teamLabel}
          </span>
        )}
        {cell.type === "king" && size === "board" && (
          <span className="text-[clamp(10px,2.5vw,18px)] select-none pointer-events-none">👑</span>
        )}
      </div>
    );
  };

  // ── CUSTOMIZER PANEL ──
  const [customizerTab, setCustomizerTab] = useState<"cores" | "times">("cores");
  const customizerPanel = (
    <AnimatePresence>
      {showCustomizer && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
          className="rounded-xl overflow-hidden shadow-2xl"
          style={{ background: "#fdf5e0", border: "3px solid #8B6914" }}
        >
          <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: "#d4c8a0" }}>
            <Palette className="w-4 h-4" style={{ color: "#8B6914" }} />
            <h3 className="text-sm font-black" style={{ color: "#5a3e0a" }}>Personalizar Peças</h3>
          </div>
          <div className="px-4 py-3 space-y-3">
            {/* Tabs: Cores / Times */}
            <div className="flex gap-2">
              <button onClick={() => setCustomizerTab("cores")}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{ background: customizerTab === "cores" ? "#8B6914" : "#f0e8d0", color: customizerTab === "cores" ? "#fff" : "#5a3e0a", border: customizerTab === "cores" ? "2px solid #a07818" : "1px solid #d4c8a0" }}>
                🎨 Cores
              </button>
              <button onClick={() => setCustomizerTab("times")}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{ background: customizerTab === "times" ? "#8B6914" : "#f0e8d0", color: customizerTab === "times" ? "#fff" : "#5a3e0a", border: customizerTab === "times" ? "2px solid #a07818" : "1px solid #d4c8a0" }}>
                ⚽ Times
              </button>
            </div>

            {customizerTab === "cores" && (
              <div>
                <p className="text-xs font-bold mb-2" style={{ color: "#5a3e0a" }}>Cor da Peça</p>
                <div className="flex flex-wrap gap-2">
                  {PIECE_COLORS.map(c => (
                    <button key={c.id}
                      onClick={(e) => { e.stopPropagation(); setPieceStyle(p => ({ ...p, color: c.id, team: undefined })); }}
                      className="w-9 h-9 rounded-full transition-all flex-shrink-0 relative z-10"
                      style={{
                        background: c.gradient,
                        border: pieceStyle.color === c.id && !pieceStyle.team ? `3px solid #8B6914` : `2px solid ${c.border}`,
                        boxShadow: pieceStyle.color === c.id && !pieceStyle.team ? "0 0 8px rgba(139,105,20,0.5)" : "0 2px 4px rgba(0,0,0,0.2)",
                        transform: pieceStyle.color === c.id && !pieceStyle.team ? "scale(1.15)" : "scale(1)",
                      }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            )}

            {customizerTab === "times" && (
              <div>
                <p className="text-xs font-bold mb-2" style={{ color: "#5a3e0a" }}>Escudo do Time</p>
                <div className="grid grid-cols-4 gap-1.5 max-h-52 overflow-y-auto pr-1">
                  {TEAM_BADGES.map(t => {
                    const tg = TEAM_GRADIENTS[t.id];
                    return (
                      <button key={t.id}
                        onClick={(e) => { e.stopPropagation(); setPieceStyle(p => ({ ...p, team: t.id })); }}
                        className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-all"
                        style={{
                          background: pieceStyle.team === t.id ? "#8B6914" : "#f0e8d0",
                          border: pieceStyle.team === t.id ? "2px solid #a07818" : "1px solid #d4c8a0",
                          transform: pieceStyle.team === t.id ? "scale(1.05)" : "scale(1)",
                        }}
                      >
                        <div className="w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ background: tg?.gradient, border: `2px solid ${tg?.border}` }}>
                          <span className="text-[8px] font-black" style={{ color: tg?.textColor, textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>
                            {t.label.substring(0, 3).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold truncate w-full text-center" style={{ color: pieceStyle.team === t.id ? "#fff" : "#5a3e0a" }}>
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-bold mb-2" style={{ color: "#5a3e0a" }}>Efeito Visual</p>
              <div className="flex flex-wrap gap-1.5">
                {PIECE_EFFECTS.map(e => (
                  <button key={e.id} onClick={(ev) => { ev.stopPropagation(); setPieceStyle(p => ({ ...p, effect: e.id })); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all relative z-10"
                    style={{
                      background: pieceStyle.effect === e.id ? "#8B6914" : "#f0e8d0",
                      color: pieceStyle.effect === e.id ? "#fff" : "#5a3e0a",
                      border: pieceStyle.effect === e.id ? "2px solid #a07818" : "1px solid #d4c8a0",
                    }}
                  >
                    {e.icon} {e.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Preview */}
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#f0e8d0" }}>
              <span className="text-xs font-bold" style={{ color: "#8a7040" }}>Preview:</span>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center relative ${effectClass}`}
                style={{
                  background: getPieceVisual("white", pieceStyle).bg,
                  border: `2.5px solid ${getPieceVisual("white", pieceStyle).border}`,
                  boxShadow: "0 3px 6px rgba(0,0,0,0.3)",
                  color: getPieceVisual("white", pieceStyle).border,
                }}
              >
                {getPieceVisual("white", pieceStyle).teamLabel ? (
                  <span className="text-[10px] font-black select-none pointer-events-none" style={{ color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
                    {getPieceVisual("white", pieceStyle).teamLabel}
                  </span>
                ) : (
                  <div className="absolute rounded-full pointer-events-none" style={{ width: "65%", height: "65%", border: "1.5px solid rgba(180,150,100,0.5)" }} />
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ── LOBBY ──
  if (view === "lobby") {
    return (
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div className="relative min-h-[80vh] rounded-2xl overflow-hidden flex-1" style={FELT_BG}>
          {FELT_TEXTURE}
          <div className="relative z-10 flex items-center justify-center min-h-[80vh] px-4 py-4">
            <div className="w-full max-w-md space-y-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="rounded-xl overflow-hidden shadow-2xl"
                style={{ background: "#fdf5e0", border: "4px solid #8B6914", boxShadow: "0 0 0 2px #a07818, 0 8px 32px rgba(0,0,0,0.4)" }}
              >
                <div className="pt-6 pb-3 text-center" style={{ background: "linear-gradient(180deg, #fdf5e0 0%, #f5ebd0 100%)" }}>
                  <div className="text-5xl mb-2">♟️</div>
                  <h2 className="text-2xl font-black tracking-wider" style={{ color: "#5a3e0a" }}>DAMAS</h2>
                  <p className="text-xs mt-1" style={{ color: "#8a7040" }}>Jogo de Estratégia</p>
                </div>

                <div className="px-5 pb-5 space-y-4">
                  <button onClick={onBack} className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80" style={{ color: "#8a7040" }}>
                    <ArrowLeft className="w-3.5 h-3.5" /> Voltar aos Games
                  </button>

                  {/* Mode selection */}
                  <div className="flex gap-2">
                    <button onClick={() => setGameMode("ai")}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-all"
                      style={{ background: gameMode === "ai" ? "#8B6914" : "#f0e8d0", color: gameMode === "ai" ? "#fff" : "#5a3e0a", border: gameMode === "ai" ? "2px solid #a07818" : "2px solid #d4c8a0" }}>
                      <Monitor className="w-4 h-4" /> vs IA
                    </button>
                    <button onClick={() => { setGameMode("online"); fetchWaitingGames(); }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-all"
                      style={{ background: gameMode === "online" ? "#8B6914" : "#f0e8d0", color: gameMode === "online" ? "#fff" : "#5a3e0a", border: gameMode === "online" ? "2px solid #a07818" : "2px solid #d4c8a0" }}>
                      <Wifi className="w-4 h-4" /> Online
                    </button>
                  </div>

                  {/* AI mode */}
                  {gameMode === "ai" && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-center tracking-wider uppercase" style={{ color: "#5a3e0a" }}>Dificuldade</h3>
                      <div className="flex gap-2 justify-center">
                        {(Object.entries(DIFFICULTY_CONFIG) as [AIDifficulty, typeof DIFFICULTY_CONFIG["easy"]][]).map(([key, cfg]) => (
                          <button key={key} onClick={() => setAiDifficulty(key)}
                            className="px-4 py-2 rounded-lg text-xs font-bold transition-all"
                            style={{ background: aiDifficulty === key ? "#8B6914" : "#f0e8d0", color: aiDifficulty === key ? "#fff" : "#5a3e0a", border: aiDifficulty === key ? "2px solid #a07818" : "2px solid #d4c8a0" }}>
                            {cfg.emoji} {cfg.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-center" style={{ color: "#8a7040" }}>{DIFFICULTY_CONFIG[aiDifficulty].description}</p>
                      <p className="text-[10px] text-center italic" style={{ color: "#8a7040" }}>⚠️ Partidas vs IA não contam no Ranking</p>
                      <button onClick={() => startAIGame(aiDifficulty)}
                        className="w-full py-3 rounded-xl text-lg font-black text-white tracking-wider transition-transform hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: "linear-gradient(180deg, #8B6914 0%, #6B4F10 100%)", border: "3px solid #a07818", boxShadow: "0 4px 12px rgba(107,79,16,0.4)" }}>
                        INICIAR vs IA
                      </button>
                    </div>
                  )}

                  {/* Online mode */}
                  {gameMode === "online" && onlineStatus === "lobby" && (
                    <div className="space-y-3">
                      <button onClick={createOnlineGame}
                        className="w-full py-3 rounded-xl text-lg font-black text-white tracking-wider transition-transform hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: "linear-gradient(180deg, #2d8a4e 0%, #1e6b3a 100%)", border: "3px solid #3aaa60", boxShadow: "0 4px 12px rgba(30,107,58,0.4)" }}>
                        🎮 CRIAR SALA
                      </button>
                      <button onClick={fetchWaitingGames} className="w-full text-xs font-bold text-center py-1" style={{ color: "#8a7040" }}>
                        🔄 Atualizar salas
                      </button>
                      {waitingGames.length === 0 ? (
                        <p className="text-xs text-center py-3" style={{ color: "#8a7040" }}>Nenhuma sala disponível. Crie uma!</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {waitingGames.map((g: any) => (
                            <div key={g.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "#f0e8d0", border: "1px solid #d4c8a0" }}>
                              <div className="flex items-center gap-2">
                                <NeonAvatar src={g.player1_avatar_url} name={g.player1_name} size="xs" />
                                <span className="text-xs font-bold" style={{ color: "#5a3e0a" }}>{g.player1_name}</span>
                              </div>
                              <button onClick={() => joinOnlineGame(g.id)}
                                className="px-3 py-1 rounded-lg text-xs font-bold text-white"
                                style={{ background: "#8B6914" }}>
                                Entrar
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Waiting for opponent */}
                  {gameMode === "online" && onlineStatus === "waiting" && (
                    <div className="text-center space-y-3 py-4">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="text-4xl inline-block">⏳</motion.div>
                      <p className="text-sm font-bold" style={{ color: "#5a3e0a" }}>Aguardando oponente...</p>
                      <p className="text-xs" style={{ color: "#8a7040" }}>Compartilhe com alguém do sistema!</p>
                      <button onClick={goToLobby} className="px-4 py-2 rounded-lg text-xs font-bold" style={{ color: "#5a3e0a", background: "#f0e8d0", border: "1px solid #d4c8a0" }}>
                        Cancelar
                      </button>
                    </div>
                  )}

                  {/* Customizer toggle */}
                  <button onClick={() => setShowCustomizer(v => !v)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all"
                    style={{ background: "#f0e8d0", color: "#5a3e0a", border: "1px solid #d4c8a0" }}>
                    <Palette className="w-3.5 h-3.5" /> {showCustomizer ? "Fechar" : "Personalizar"} Peças
                  </button>
                </div>
              </motion.div>

              {customizerPanel}
            </div>
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
          <p className="text-[10px] text-center pb-1" style={{ color: "#8a7040" }}>🌐 Somente partidas online</p>
          <div className="px-3 pb-4 space-y-1 max-h-[420px] overflow-y-auto">
            {ranking.length === 0 ? (
              <p className="text-center text-xs py-6" style={{ color: "#8a7040" }}>Nenhuma partida online finalizada ainda.</p>
            ) : ranking.map((r, i) => {
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`;
              const isMe = r.user_id === user?.id;
              return (
                <div key={r.user_id}
                  className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                  style={{ background: isMe ? "#e8ddb8" : i % 2 === 0 ? "#f5efd8" : "#fdf5e0", border: isMe ? "2px solid #8B6914" : "1px solid transparent" }}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm w-7 text-center">{medal}</span>
                    <NeonAvatar src={r.avatar_url} name={r.user_name} size="xs" />
                    <span className="text-xs font-bold truncate max-w-[80px]" style={{ color: "#5a3e0a" }}>
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

  // ── FINISHED ──
  if (view === "finished") {
    return (
      <div ref={gameContainerRef} className="relative min-h-[80vh] rounded-2xl overflow-hidden flex items-center justify-center" style={FELT_BG}>
        {FELT_TEXTURE}
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 w-full max-w-sm rounded-xl p-8 text-center space-y-4 shadow-2xl"
          style={{ background: "#fdf5e0", border: "4px solid #8B6914" }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }} className="text-7xl">
            {isWinner ? "🏆" : winner === "draw" ? "🤝" : "😔"}
          </motion.div>
          <h2 className="text-2xl font-black" style={{ color: "#5a3e0a" }}>
            {isWinner ? "Você venceu!" : winner === "draw" ? "Empate!" : "Você perdeu!"}
          </h2>
          <p className="text-sm" style={{ color: "#8a7040" }}>
            {gameMode === "ai"
              ? (isWinner ? "Parabéns!" : winner === "draw" ? "Ninguém venceu." : `IA (${DIFFICULTY_CONFIG[aiDifficulty].label}) venceu.`)
              : (isWinner ? `Você venceu contra ${opponentName}!` : `${opponentName} venceu!`)}
          </p>
          {gameMode === "online" && (
            <p className="text-xs font-bold" style={{ color: "#2d7a2d" }}>✅ Resultado salvo no Ranking</p>
          )}
          {gameMode === "ai" && (
            <p className="text-[10px] italic" style={{ color: "#8a7040" }}>Partidas vs IA não contam no Ranking</p>
          )}
          <div className="flex gap-3 justify-center">
            <div className="rounded-xl px-4 py-3 text-center" style={{ background: "#f0e8d0", border: "1px solid #d4c8a0" }}>
              <div className="text-2xl font-black" style={{ color: "#5a3e0a" }}>{capturedBlack}</div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "#8a7040" }}>Suas capturas</div>
            </div>
            <div className="rounded-xl px-4 py-3 text-center" style={{ background: "#f0e8d0", border: "1px solid #d4c8a0" }}>
              <div className="text-2xl font-black" style={{ color: "#5a3e0a" }}>{capturedWhite}</div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "#8a7040" }}>Capturas adv.</div>
            </div>
          </div>
          <div className="flex gap-2 justify-center pt-2">
            {gameMode === "ai" && (
              <button onClick={() => startAIGame(aiDifficulty)} className="px-4 py-2 rounded-lg text-sm font-bold text-white flex items-center gap-2" style={{ background: "#8B6914" }}>
                <RotateCcw className="w-4 h-4" /> Jogar Novamente
              </button>
            )}
            <button onClick={goToLobby} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ color: "#5a3e0a", background: "#f0e8d0", border: "1px solid #d4c8a0" }}>Lobby</button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── PLAYING ──
  const whiteCount = countPieces(board, "white");
  const blackCount = countPieces(board, "black");
  const movablePieces = new Set(validMoves.map(m => `${m.from.row}-${m.from.col}`));
  const isMyTurn = gameMode === "ai" ? currentTurn === "white" : currentTurn === myOnlineColor;

  return (
    <div ref={gameContainerRef} className="relative flex flex-col overflow-hidden"
      style={{ ...FELT_BG, minHeight: isFS ? "100vh" : "85vh", borderRadius: isFS ? 0 : 16 }}>
      {FELT_TEXTURE}

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-3 py-2">
        <button onClick={goToLobby} className="flex items-center gap-1 text-white/70 hover:text-white text-xs font-medium transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Sair
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60 font-medium">
            {gameMode === "ai" ? `Damas vs IA (${DIFFICULTY_CONFIG[aiDifficulty].label})` : `Online vs ${opponentName}`}
          </span>
          <button onClick={() => isFS ? exitFullscreen() : gameContainerRef.current && requestFullscreen(gameContainerRef.current)}
            className="text-white/70 hover:text-white transition-colors">
            {isFS ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Opponent info */}
      <div className="relative z-10 flex justify-center items-center gap-2 pb-1">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.3)" }}>
          {gameMode === "online" ? (
            <NeonAvatar src={opponentAvatar} name={opponentName || "Oponente"} size="xs" />
          ) : (
            <div className="w-4 h-4 rounded-full border" style={{ background: BLACK_PIECE_BG, borderColor: BLACK_PIECE_BORDER }} />
          )}
          <span className="text-white text-xs font-bold">
            {gameMode === "ai" ? `IA • ${blackCount} peças` : `${opponentName} • ${gameMode === "online" && myOnlineColor === "white" ? blackCount : whiteCount} peças`}
          </span>
        </div>
      </div>

      {/* Board */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-2 py-2">
        <div className="rounded-lg overflow-hidden shadow-2xl relative"
          style={{ border: "4px solid #5a3a1a", boxShadow: "0 0 0 2px #3a2410, 0 8px 32px rgba(0,0,0,0.5)" }}>
          <div className="grid grid-cols-8 relative" style={{ width: "min(85vw, 85vh, 480px)", height: "min(85vw, 85vh, 480px)" }}>
            {board.map((row, r) =>
              row.map((cell, c) => {
                const isDark = (r + c) % 2 === 1;
                const isSelected = selectedPos?.row === r && selectedPos?.col === c;
                const isHighlighted = highlightedMoves.some(m => m.to.row === r && m.to.col === c);
                const isLastFrom = lastMove?.from.row === r && lastMove?.from.col === c;
                const isLastTo = lastMove?.to.row === r && lastMove?.to.col === c;
                const isCaptured = lastMove?.captures.some(p => p.row === r && p.col === c);
                const myColor = gameMode === "ai" ? "white" : myOnlineColor;
                const isMovable = isMyTurn && cell?.color === myColor && movablePieces.has(`${r}-${c}`) && !isAnimating;
                const isFading = fadingPieces.some(p => p.row === r && p.col === c);
                const isHidden = hiddenPos?.row === r && hiddenPos?.col === c;
                const showPiece = cell && !isHidden && !isFading;

                return (
                  <div key={`${r}-${c}`} onClick={() => isDark ? handleCellClick(r, c) : undefined}
                    className="relative flex items-center justify-center"
                    style={{
                      background: isDark
                        ? isSelected ? "#6B8E23" : isHighlighted ? "#5a9e3a" : isLastFrom || isLastTo ? "#a0a060" : DARK_SQUARE
                        : LIGHT_SQUARE,
                      cursor: isDark && !isAnimating ? "pointer" : "default",
                      aspectRatio: "1", transition: "background 0.2s ease",
                    }}>
                    {isHighlighted && !cell && !isAnimating && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="absolute w-[30%] h-[30%] rounded-full"
                        style={{ background: "rgba(80,200,80,0.7)", boxShadow: "0 0 8px rgba(80,200,80,0.4)" }} />
                    )}
                    {isCaptured && !isAnimating && (
                      <motion.div initial={{ scale: 1, opacity: 0.6 }} animate={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="absolute w-[60%] h-[60%] rounded-full" style={{ background: "rgba(220,60,60,0.4)" }} />
                    )}
                    {isFading && cell && (
                      <motion.div initial={{ scale: 1, opacity: 1 }} animate={{ scale: 0.3, opacity: 0, y: 10 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="absolute flex items-center justify-center rounded-full"
                        style={{ width: "78%", height: "78%", background: cell.color === "white" ? getPieceVisual("white", pieceStyle).bg : BLACK_PIECE_BG, border: `2.5px solid ${cell.color === "white" ? getPieceVisual("white", pieceStyle).border : BLACK_PIECE_BORDER}` }} />
                    )}
                    {showPiece && (
                      <motion.div layout initial={false}
                        animate={isMovable && !aiThinking ? { scale: [1, 1.05, 1] } : {}}
                        transition={isMovable ? { duration: 1.5, repeat: Infinity } : { layout: { duration: 0.5, ease: "easeInOut" } }}>
                        {renderPiece(cell, isMovable, isSelected, "board")}
                      </motion.div>
                    )}
                  </div>
                );
              })
            )}

            {/* Animating piece overlay */}
            {animatingPiece && (
              <motion.div className="absolute flex items-center justify-center rounded-full pointer-events-none"
                animate={{ left: `${(animatingPiece.pos.col / 8) * 100}%`, top: `${(animatingPiece.pos.row / 8) * 100}%` }}
                transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                style={{ width: `${100 / 8}%`, height: `${100 / 8}%`, zIndex: 50, padding: "11%" }}>
                <div className={`w-full h-full rounded-full flex items-center justify-center ${animatingPiece.piece.color === "white" || (gameMode === "online" && animatingPiece.piece.color === myOnlineColor) ? effectClass : ""}`}
                  style={{
                    background: animatingPiece.piece.color === "white" || (gameMode === "online" && animatingPiece.piece.color === myOnlineColor) ? getPieceVisual("white", pieceStyle).bg : BLACK_PIECE_BG,
                    border: `2.5px solid ${animatingPiece.piece.color === "white" || (gameMode === "online" && animatingPiece.piece.color === myOnlineColor) ? getPieceVisual("white", pieceStyle).border : BLACK_PIECE_BORDER}`,
                    boxShadow: `0 6px 16px rgba(0,0,0,0.4), 0 0 20px rgba(100,180,50,0.3)`,
                    color: animatingPiece.piece.color === "white" ? getPieceVisual("white", pieceStyle).border : BLACK_PIECE_BORDER,
                  }}>
                  <div className="absolute rounded-full" style={{
                    width: "65%", height: "65%",
                    border: `1.5px solid ${animatingPiece.piece.color === "white" ? "rgba(180,150,100,0.5)" : "rgba(255,255,255,0.15)"}`,
                  }} />
                  {animatingPiece.piece.type === "king" && (
                    <span className="text-[clamp(10px,2.5vw,18px)] select-none" style={{ filter: animatingPiece.piece.color === "white" ? "none" : "brightness(2)" }}>👑</span>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Turn indicator */}
      <div className="relative z-10 text-center py-1">
        {aiThinking ? (
          <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-sm font-bold text-white" style={{ background: "rgba(139,105,20,0.8)" }}>
            <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>⚙️</motion.span> IA pensando...
          </span>
        ) : !isMyTurn && gameMode === "online" ? (
          <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-sm font-bold text-white/60" style={{ background: "rgba(0,0,0,0.3)" }}>
            <motion.span animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>⏳</motion.span> Vez de {opponentName}...
          </span>
        ) : (
          <motion.span animate={isMyTurn ? { scale: [1, 1.05, 1] } : {}} transition={{ duration: 1.5, repeat: Infinity }}
            className={`inline-block px-4 py-1 rounded-full text-sm font-bold ${isMyTurn ? "text-white" : "text-white/60"}`}
            style={isMyTurn ? { background: "rgba(34,120,60,0.9)", boxShadow: "0 0 12px rgba(34,120,60,0.5)" } : { background: "rgba(0,0,0,0.3)" }}>
            {isMyTurn ? "✋ Sua vez!" : "Vez do oponente"}
          </motion.span>
        )}
      </div>

      {/* Player info */}
      <div className="relative z-10 flex justify-center items-center gap-2 pt-1 pb-3">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.3)" }}>
          <NeonAvatar src={playerAvatar} name={firstName} size="xs" frameColor={profile?.frame_color} neonColor={profile?.neon_color} frameAnimation={profile?.frame_animation} />
          <span className="text-white text-xs font-bold">{firstName} • {gameMode === "ai" ? whiteCount : (myOnlineColor === "white" ? whiteCount : blackCount)} peças</span>
        </div>
      </div>
    </div>
  );
}
