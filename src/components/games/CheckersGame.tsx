import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Maximize, Minimize, RotateCcw, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

// ── Types ──
type AIDifficulty = "easy" | "medium" | "hard";
type PieceColor = "white" | "black";
type PieceType = "normal" | "king";
interface Piece { color: PieceColor; type: PieceType; }
type Cell = Piece | null;
type Board = Cell[][];
interface Position { row: number; col: number; }
interface Move { from: Position; to: Position; captures: Position[]; }

const BOARD_SIZE = 8;
const DIFFICULTY_CONFIG: Record<AIDifficulty, { label: string; emoji: string; description: string; depth: number }> = {
  easy: { label: "FÁCIL", emoji: "🟢", description: "IA joga aleatoriamente", depth: 1 },
  medium: { label: "MÉDIO", emoji: "🟡", description: "IA com estratégia moderada", depth: 3 },
  hard: { label: "DIFÍCIL", emoji: "🔴", description: "IA com estratégia avançada", depth: 5 },
};

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
      const pCaptures = getCapturesForPiece(board, { row: r, col: c }, piece, []);
      captures.push(...pCaptures);
      if (captures.length === 0) {
        const pSimple = getSimpleMovesForPiece(board, { row: r, col: c }, piece);
        simple.push(...pSimple);
      }
    }
  }
  // Captures are mandatory
  if (captures.length > 0) {
    // Return only max-length captures
    const maxLen = Math.max(...captures.map(m => m.captures.length));
    return captures.filter(m => m.captures.length === maxLen);
  }
  return simple;
}

function getCapturesForPiece(board: Board, pos: Position, piece: Piece, alreadyCaptured: Position[]): Move[] {
  const directions = piece.type === "king"
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : piece.color === "white"
      ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] // normal can capture backwards too in Brazilian rules
      : [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  const results: Move[] = [];

  for (const [dr, dc] of directions) {
    const midR = pos.row + dr;
    const midC = pos.col + dc;
    const endR = pos.row + dr * 2;
    const endC = pos.col + dc * 2;

    if (endR < 0 || endR >= BOARD_SIZE || endC < 0 || endC >= BOARD_SIZE) continue;
    const mid = board[midR][midC];
    const end = board[endR][endC];
    if (!mid || mid.color === piece.color) continue;
    if (end !== null) continue;
    if (alreadyCaptured.some(p => p.row === midR && p.col === midC)) continue;

    // Try multi-jump
    const newBoard = cloneBoard(board);
    newBoard[pos.row][pos.col] = null;
    newBoard[midR][midC] = null;
    newBoard[endR][endC] = piece;
    const newCaptured = [...alreadyCaptured, { row: midR, col: midC }];

    const further = getCapturesForPiece(newBoard, { row: endR, col: endC }, piece, newCaptured);
    if (further.length > 0) {
      for (const f of further) {
        results.push({ from: pos, to: f.to, captures: [{ row: midR, col: midC }, ...f.captures] });
      }
    } else {
      results.push({ from: pos, to: { row: endR, col: endC }, captures: [{ row: midR, col: midC }] });
    }
  }
  return results;
}

function getSimpleMovesForPiece(board: Board, pos: Position, piece: Piece): Move[] {
  const directions = piece.type === "king"
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : piece.color === "white"
      ? [[-1, -1], [-1, 1]]
      : [[1, -1], [1, 1]];

  const moves: Move[] = [];
  for (const [dr, dc] of directions) {
    const nr = pos.row + dr;
    const nc = pos.col + dc;
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
  // Promote to king
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
      // Positional bonus
      const posBonus = p.type === "normal"
        ? (p.color === "black" ? r * 0.1 : (7 - r) * 0.1)
        : 0;
      score += p.color === "black" ? (val + posBonus) : -(val + posBonus);
    }
  }
  return score;
}

// ── AI (Minimax with Alpha-Beta) ──
function minimax(board: Board, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  const color = maximizing ? "black" : "white";
  const moves = getValidMoves(board, color);
  if (depth === 0 || moves.length === 0) return evaluateBoard(board);

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newBoard = applyMove(board, move);
      const ev = minimax(newBoard, depth - 1, alpha, beta, false);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newBoard = applyMove(board, move);
      const ev = minimax(newBoard, depth - 1, alpha, beta, true);
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
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
  let bestMove = moves[0];
  let bestScore = -Infinity;
  for (const move of moves) {
    const newBoard = applyMove(board, move);
    const score = minimax(newBoard, depth - 1, -Infinity, Infinity, false);
    if (score > bestScore) { bestScore = score; bestMove = move; }
  }
  return bestMove;
}

// ── Fullscreen helpers ──
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

// ── Green Felt Background ──
const FELT_BG: React.CSSProperties = {
  background: "radial-gradient(ellipse at center, #2d8a4e 0%, #1e6b3a 40%, #145428 80%, #0e3d1c 100%)",
};
const FELT_TEXTURE = (
  <div className="absolute inset-0 pointer-events-none" style={{
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
  }} />
);

// ── Board colors matching paciencia.co ──
const LIGHT_SQUARE = "#e8c882";
const DARK_SQUARE = "#8B5E34";
const WHITE_PIECE_BG = "radial-gradient(circle at 35% 35%, #ffffff, #e8dcc8)";
const BLACK_PIECE_BG = "radial-gradient(circle at 35% 35%, #5a3a1a, #2a1a0a)";
const WHITE_PIECE_BORDER = "#c4a870";
const BLACK_PIECE_BORDER = "#1a0a00";

// ── Main Component ──
export function CheckersGame({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [view, setView] = useState<"lobby" | "playing" | "finished">("lobby");
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
  const [ranking, setRanking] = useState<{ user_id: string; user_name: string; wins: number; losses: number }[]>([]);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const aiThinkingRef = useRef(false);

  const playerName = profile?.full_name || "Jogador";

  // Fullscreen tracking
  useEffect(() => {
    const handler = () => setIsFS(isFullscreenActive());
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      document.removeEventListener("webkitfullscreenchange", handler);
    };
  }, []);

  useEffect(() => {
    if (view === "playing" && gameContainerRef.current && !isFullscreenActive()) {
      requestFullscreen(gameContainerRef.current);
    }
  }, [view]);

  useEffect(() => {
    if (view !== "playing" && isFullscreenActive()) exitFullscreen();
  }, [view]);

  // Fetch ranking
  const fetchRanking = useCallback(async () => {
    const { data } = await supabase.from("domino_stats").select("*").order("wins", { ascending: false }).limit(20);
    setRanking((data as any[]) || []);
  }, []);

  useEffect(() => { fetchRanking(); }, [fetchRanking]);

  // Save stats
  const saveStats = useCallback(async (won: boolean) => {
    if (!user) return;
    const { data: myStats } = await supabase.from("domino_stats").select("*").eq("user_id", user.id).maybeSingle();
    if (myStats) {
      await supabase.from("domino_stats").update({
        wins: (myStats as any).wins + (won ? 1 : 0),
        losses: (myStats as any).losses + (won ? 0 : 1),
        user_name: playerName,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
    } else {
      await supabase.from("domino_stats").insert({
        user_id: user.id, user_name: playerName,
        wins: won ? 1 : 0, losses: won ? 0 : 1,
      });
    }
    fetchRanking();
  }, [user, playerName, fetchRanking]);

  // Check for game end
  const checkGameEnd = useCallback((b: Board, turn: PieceColor) => {
    const moves = getValidMoves(b, turn);
    if (moves.length === 0) {
      const w = turn === "white" ? "black" : "white";
      setWinner(countPieces(b, "white") === 0 && countPieces(b, "black") === 0 ? "draw" : w);
      setView("finished");
      if (w === "white") saveStats(true);
      else if (w === "black") saveStats(false);
      return true;
    }
    return false;
  }, [saveStats]);

  // AI turn
  useEffect(() => {
    if (view !== "playing" || currentTurn !== "black" || aiThinkingRef.current || winner) return;
    aiThinkingRef.current = true;
    setAiThinking(true);
    const delay = aiDifficulty === "easy" ? 500 : aiDifficulty === "medium" ? 800 : 1200;
    const timer = setTimeout(() => {
      const move = aiChooseMove(board, aiDifficulty);
      if (!move) {
        setWinner("white");
        setView("finished");
        saveStats(true);
      } else {
        const newBoard = applyMove(board, move);
        setBoard(newBoard);
        setLastMove(move);
        if (move.captures.length > 0) setCapturedBlack(prev => prev);
        setCapturedWhite(prev => prev + move.captures.length);
        setCurrentTurn("white");
        if (!checkGameEnd(newBoard, "white")) {
          // ok
        }
      }
      setAiThinking(false);
      aiThinkingRef.current = false;
    }, delay);
    return () => { clearTimeout(timer); aiThinkingRef.current = false; };
  }, [view, currentTurn, board, aiDifficulty, winner, checkGameEnd, saveStats]);

  // Calculate valid moves when turn changes
  useEffect(() => {
    if (view === "playing" && currentTurn === "white" && !winner) {
      setValidMoves(getValidMoves(board, "white"));
    }
  }, [board, currentTurn, view, winner]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (currentTurn !== "white" || aiThinking || winner) return;

    const piece = board[row][col];

    // If clicking on a highlighted move target
    if (selectedPos && highlightedMoves.length > 0) {
      const move = highlightedMoves.find(m => m.to.row === row && m.to.col === col);
      if (move) {
        const newBoard = applyMove(board, move);
        setBoard(newBoard);
        setLastMove(move);
        setCapturedBlack(prev => prev + move.captures.length);
        setSelectedPos(null);
        setHighlightedMoves([]);
        setCurrentTurn("black");
        checkGameEnd(newBoard, "black");
        return;
      }
    }

    // Select a piece
    if (piece && piece.color === "white") {
      const pieceMoves = validMoves.filter(m => m.from.row === row && m.from.col === col);
      if (pieceMoves.length > 0) {
        setSelectedPos({ row, col });
        setHighlightedMoves(pieceMoves);
      } else {
        setSelectedPos(null);
        setHighlightedMoves([]);
      }
      return;
    }

    // Deselect
    setSelectedPos(null);
    setHighlightedMoves([]);
  }, [board, currentTurn, aiThinking, winner, selectedPos, highlightedMoves, validMoves, checkGameEnd]);

  const startGame = (difficulty: AIDifficulty) => {
    setAiDifficulty(difficulty);
    setBoard(createInitialBoard());
    setCurrentTurn("white");
    setSelectedPos(null);
    setHighlightedMoves([]);
    setValidMoves([]);
    setWinner(null);
    setLastMove(null);
    setCapturedWhite(0);
    setCapturedBlack(0);
    aiThinkingRef.current = false;
    setView("playing");
  };

  const goToLobby = () => {
    setView("lobby");
    setWinner(null);
    if (isFullscreenActive()) exitFullscreen();
  };

  const isWinner = winner === "white";

  // ── LOBBY ──
  if (view === "lobby") {
    return (
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div className="relative min-h-[80vh] rounded-2xl overflow-hidden flex-1" style={FELT_BG}>
          {FELT_TEXTURE}
          <div className="relative z-10 flex items-center justify-center min-h-[80vh] px-4 py-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md rounded-xl overflow-hidden shadow-2xl"
              style={{ background: "#fdf5e0", border: "4px solid #8B6914", boxShadow: "0 0 0 2px #a07818, 0 8px 32px rgba(0,0,0,0.4)" }}
            >
              {/* Header */}
              <div className="pt-6 pb-3 text-center" style={{ background: "linear-gradient(180deg, #fdf5e0 0%, #f5ebd0 100%)" }}>
                <div className="text-5xl mb-2">♟️</div>
                <h2 className="text-2xl font-black tracking-wider" style={{ color: "#5a3e0a" }}>DAMAS</h2>
                <p className="text-xs mt-1" style={{ color: "#8a7040" }}>Jogo de Estratégia • vs IA</p>
              </div>

              <div className="px-5 pb-5 space-y-4">
                {/* Back */}
                <button
                  onClick={onBack}
                  className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
                  style={{ color: "#8a7040" }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar aos Games
                </button>

                {/* Difficulty */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-center tracking-wider uppercase" style={{ color: "#5a3e0a" }}>Dificuldade</h3>
                  <div className="flex gap-2 justify-center">
                    {(Object.entries(DIFFICULTY_CONFIG) as [AIDifficulty, typeof DIFFICULTY_CONFIG["easy"]][]).map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => setAiDifficulty(key)}
                        className="px-4 py-2 rounded-lg text-xs font-bold transition-all"
                        style={{
                          background: aiDifficulty === key ? "#8B6914" : "#f0e8d0",
                          color: aiDifficulty === key ? "#fff" : "#5a3e0a",
                          border: aiDifficulty === key ? "2px solid #a07818" : "2px solid #d4c8a0",
                        }}
                      >
                        {cfg.emoji} {cfg.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-center" style={{ color: "#8a7040" }}>{DIFFICULTY_CONFIG[aiDifficulty].description}</p>
                </div>

                {/* Start */}
                <button
                  onClick={() => startGame(aiDifficulty)}
                  className="w-full py-3 rounded-xl text-lg font-black text-white tracking-wider transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "linear-gradient(180deg, #8B6914 0%, #6B4F10 100%)", border: "3px solid #a07818", boxShadow: "0 4px 12px rgba(107,79,16,0.4)" }}
                >
                  INICIAR
                </button>
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
                Nenhuma partida finalizada ainda.
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
            {isWinner ? "🏆" : winner === "draw" ? "🤝" : "😔"}
          </motion.div>
          <h2 className="text-2xl font-black" style={{ color: "#5a3e0a" }}>
            {isWinner ? "Você venceu!" : winner === "draw" ? "Empate!" : "Você perdeu!"}
          </h2>
          <p className="text-sm" style={{ color: "#8a7040" }}>
            {isWinner ? "Parabéns pela vitória!" : winner === "draw" ? "Ninguém ganhou desta vez." : `IA (${DIFFICULTY_CONFIG[aiDifficulty].label}) venceu.`}
          </p>
          <div className="flex gap-3 justify-center">
            <div className="rounded-xl px-4 py-3 text-center" style={{ background: "#f0e8d0", border: "1px solid #d4c8a0" }}>
              <div className="text-2xl font-black" style={{ color: "#5a3e0a" }}>{capturedBlack}</div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "#8a7040" }}>Capturas suas</div>
            </div>
            <div className="rounded-xl px-4 py-3 text-center" style={{ background: "#f0e8d0", border: "1px solid #d4c8a0" }}>
              <div className="text-2xl font-black" style={{ color: "#5a3e0a" }}>{capturedWhite}</div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "#8a7040" }}>Capturas IA</div>
            </div>
          </div>
          <div className="flex gap-2 justify-center pt-2">
            <button onClick={() => startGame(aiDifficulty)} className="px-4 py-2 rounded-lg text-sm font-bold text-white flex items-center gap-2" style={{ background: "#8B6914" }}>
              <RotateCcw className="w-4 h-4" /> Jogar Novamente
            </button>
            <button onClick={goToLobby} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ color: "#5a3e0a", background: "#f0e8d0", border: "1px solid #d4c8a0" }}>
              Lobby
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── PLAYING ──
  const whiteCount = countPieces(board, "white");
  const blackCount = countPieces(board, "black");

  // Pieces that have valid moves (to highlight them)
  const movablePieces = new Set(validMoves.map(m => `${m.from.row}-${m.from.col}`));

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
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60 font-medium">Damas vs IA ({DIFFICULTY_CONFIG[aiDifficulty].label})</span>
          <button
            onClick={() => isFS ? exitFullscreen() : gameContainerRef.current && requestFullscreen(gameContainerRef.current)}
            className="text-white/70 hover:text-white transition-colors"
          >
            {isFS ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* AI captured pieces display */}
      <div className="relative z-10 flex justify-center items-center gap-2 pb-1">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.3)" }}>
          <div className="w-4 h-4 rounded-full border" style={{ background: BLACK_PIECE_BG, borderColor: BLACK_PIECE_BORDER }} />
          <span className="text-white text-xs font-bold">IA • {blackCount} peças</span>
        </div>
      </div>

      {/* Board */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-2 py-2">
        <div
          className="rounded-lg overflow-hidden shadow-2xl"
          style={{
            border: "4px solid #5a3a1a",
            boxShadow: "0 0 0 2px #3a2410, 0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <div className="grid grid-cols-8" style={{ width: "min(85vw, 85vh, 480px)", height: "min(85vw, 85vh, 480px)" }}>
            {board.map((row, r) =>
              row.map((cell, c) => {
                const isDark = (r + c) % 2 === 1;
                const isSelected = selectedPos?.row === r && selectedPos?.col === c;
                const isHighlighted = highlightedMoves.some(m => m.to.row === r && m.to.col === c);
                const isLastFrom = lastMove?.from.row === r && lastMove?.from.col === c;
                const isLastTo = lastMove?.to.row === r && lastMove?.to.col === c;
                const isCaptured = lastMove?.captures.some(p => p.row === r && p.col === c);
                const isMovable = currentTurn === "white" && cell?.color === "white" && movablePieces.has(`${r}-${c}`);

                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => isDark ? handleCellClick(r, c) : undefined}
                    className="relative flex items-center justify-center transition-colors"
                    style={{
                      background: isDark
                        ? isSelected ? "#6B8E23" : isHighlighted ? "#90EE90" : isLastFrom || isLastTo ? "#a0a060" : DARK_SQUARE
                        : LIGHT_SQUARE,
                      cursor: isDark ? "pointer" : "default",
                      aspectRatio: "1",
                    }}
                  >
                    {/* Highlight dot for valid moves */}
                    {isHighlighted && !cell && (
                      <div className="absolute w-[30%] h-[30%] rounded-full bg-green-500/60" />
                    )}

                    {/* Capture indicator */}
                    {isCaptured && (
                      <motion.div
                        initial={{ scale: 1, opacity: 0.6 }}
                        animate={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute w-[60%] h-[60%] rounded-full bg-red-500/40"
                      />
                    )}

                    {/* Piece */}
                    {cell && (
                      <motion.div
                        layout
                        initial={false}
                        animate={isMovable && !aiThinking ? { scale: [1, 1.05, 1] } : {}}
                        transition={isMovable ? { duration: 1.5, repeat: Infinity } : {}}
                        className="relative flex items-center justify-center rounded-full"
                        style={{
                          width: "78%",
                          height: "78%",
                          background: cell.color === "white" ? WHITE_PIECE_BG : BLACK_PIECE_BG,
                          border: `2.5px solid ${cell.color === "white" ? WHITE_PIECE_BORDER : BLACK_PIECE_BORDER}`,
                          boxShadow: isSelected
                            ? `0 0 12px 3px rgba(100,180,50,0.6), 0 4px 8px rgba(0,0,0,0.3)`
                            : `0 3px 6px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,${cell.color === "white" ? "0.6" : "0.15"})`,
                          cursor: cell.color === "white" && isMovable ? "pointer" : "default",
                        }}
                      >
                        {/* Inner ring */}
                        <div
                          className="absolute rounded-full"
                          style={{
                            width: "65%",
                            height: "65%",
                            border: `1.5px solid ${cell.color === "white" ? "rgba(180,150,100,0.5)" : "rgba(255,255,255,0.15)"}`,
                          }}
                        />
                        {/* Crown for kings */}
                        {cell.type === "king" && (
                          <span className="text-[clamp(10px,2.5vw,18px)] select-none" style={{ filter: cell.color === "white" ? "none" : "brightness(2)" }}>
                            👑
                          </span>
                        )}
                      </motion.div>
                    )}
                  </div>
                );
              })
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
        ) : (
          <motion.span
            animate={currentTurn === "white" ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={`inline-block px-4 py-1 rounded-full text-sm font-bold ${currentTurn === "white" ? "text-white" : "text-white/60"}`}
            style={currentTurn === "white" ? { background: "rgba(34,120,60,0.9)", boxShadow: "0 0 12px rgba(34,120,60,0.5)" } : { background: "rgba(0,0,0,0.3)" }}
          >
            {currentTurn === "white" ? "✋ Sua vez!" : "Vez da IA"}
          </motion.span>
        )}
      </div>

      {/* Player info */}
      <div className="relative z-10 flex justify-center items-center gap-2 pt-1 pb-3">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.3)" }}>
          <div className="w-4 h-4 rounded-full border" style={{ background: WHITE_PIECE_BG, borderColor: WHITE_PIECE_BORDER }} />
          <span className="text-white text-xs font-bold">{playerName} • {whiteCount} peças</span>
        </div>
      </div>
    </div>
  );
}
