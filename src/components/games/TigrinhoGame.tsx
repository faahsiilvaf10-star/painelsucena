import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Minus, Plus, History, Play, Square, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTigrinho } from "@/hooks/useTigrinho";

const SYMBOLS = [
  { emoji: "🐯", name: "tiger", value: 100 },
  { emoji: "💰", name: "gold", value: 50 },
  { emoji: "🧧", name: "envelope", value: 25 },
  { emoji: "🏮", name: "lantern", value: 15 },
  { emoji: "🔥", name: "fire", value: 10 },
  { emoji: "💎", name: "diamond", value: 8 },
  { emoji: "🍊", name: "orange", value: 5 },
  { emoji: "⭐", name: "star", value: 3 },
];

interface TigrinhoGameProps {
  onBack: () => void;
}

function ReelSymbol({ symbol, isWinning, delay }: { symbol: string; isWinning: boolean; delay: number }) {
  return (
    <motion.div
      className={`
        w-full aspect-square flex items-center justify-center text-3xl sm:text-4xl md:text-5xl
        rounded-md relative select-none
        ${isWinning
          ? "bg-gradient-to-b from-yellow-400/30 to-amber-600/30 ring-2 ring-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)]"
          : "bg-gradient-to-b from-[#1a0a02]/80 to-[#2a1005]/80"
        }
      `}
      initial={isWinning ? { scale: 1 } : {}}
      animate={isWinning ? { scale: [1, 1.08, 1], transition: { duration: 0.5, repeat: Infinity, delay } } : {}}
    >
      <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] filter">{symbol}</span>
      {isWinning && (
        <motion.div
          className="absolute inset-0 rounded-md border-2 border-yellow-300/60"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

function SpinningReel({ symbols, spinning, finalSymbols, colIndex, onStop }: {
  symbols: string[];
  spinning: boolean;
  finalSymbols: string[];
  colIndex: number;
  onStop: () => void;
}) {
  const [displaySymbols, setDisplaySymbols] = useState(finalSymbols);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!spinning) return;

    let tick = 0;
    intervalRef.current = setInterval(() => {
      setDisplaySymbols([
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
      ]);
      tick++;
    }, 60);

    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDisplaySymbols(finalSymbols);
      onStop();
    }, 800 + colIndex * 400);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [spinning]);

  useEffect(() => {
    if (!spinning) setDisplaySymbols(finalSymbols);
  }, [finalSymbols, spinning]);

  return (
    <div className="flex flex-col gap-1.5">
      {displaySymbols.map((s, i) => (
        <div key={i} className={`
          w-full aspect-square flex items-center justify-center text-3xl sm:text-4xl md:text-5xl
          rounded-md select-none transition-all duration-100
          bg-gradient-to-b from-[#1a0a02]/80 to-[#2a1005]/80
        `}>
          <span className={`drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${spinning ? 'blur-[1px]' : ''}`}>{s}</span>
        </div>
      ))}
    </div>
  );
}

export function TigrinhoGame({ onBack }: TigrinhoGameProps) {
  const { balance, betAmount, setBetAmount, spinning, lastResult, play, history } = useTigrinho();
  const [showHistory, setShowHistory] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [muted, setMuted] = useState(false);
  const [stoppedCols, setStoppedCols] = useState([true, true, true]);
  const [displayGrid, setDisplayGrid] = useState<string[][]>(() =>
    Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].emoji))
  );
  const autoPlayRef = useRef(autoPlay);

  useEffect(() => { autoPlayRef.current = autoPlay; }, [autoPlay]);

  useEffect(() => {
    if (spinning) {
      setStoppedCols([false, false, false]);
    }
  }, [spinning]);

  useEffect(() => {
    if (lastResult) {
      setDisplayGrid(lastResult.symbols);
      setStoppedCols([true, true, true]);
    }
  }, [lastResult]);

  // Auto play
  useEffect(() => {
    if (!autoPlay || spinning) return;
    const t = setTimeout(() => {
      if (autoPlayRef.current) play();
    }, 2000);
    return () => clearTimeout(t);
  }, [autoPlay, spinning, play]);

  const handleColStop = useCallback((col: number) => {
    setStoppedCols(prev => { const n = [...prev]; n[col] = true; return n; });
  }, []);

  const isWin = lastResult && lastResult.multiplier > 0;
  const allStopped = stoppedCols.every(Boolean);

  const winningRows = lastResult && !spinning && allStopped
    ? lastResult.symbols.map((row, ri) => row.every(s => s === row[0]) ? ri : -1).filter(r => r >= 0)
    : [];

  return (
    <div className="space-y-3 max-w-lg mx-auto pb-8">
      {/* Top Bar */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => { setAutoPlay(false); onBack(); }}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground truncate">Fortune Tiger</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMuted(!muted)}>
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setShowHistory(!showHistory)}>
          <History className="w-4 h-4" />
        </Button>
      </div>

      {/* Main Machine Frame */}
      <div className="relative rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #8B1A1A 0%, #5C0A0A 30%, #3D0505 100%)",
          boxShadow: "0 0 40px rgba(139, 26, 26, 0.4), inset 0 1px 0 rgba(255,215,0,0.3)"
        }}
      >
        {/* Gold trim top */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #8B6914, #FFD700, #DAA520, #FFD700, #8B6914)" }} />

        {/* Tiger Header */}
        <div className="relative flex items-center justify-center py-3">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-900/20 to-transparent" />
          <div className="relative flex items-center gap-2">
            <motion.span
              className="text-4xl"
              animate={isWin && allStopped ? {
                scale: [1, 1.3, 1],
                rotate: [0, -15, 15, -10, 10, 0],
              } : {}}
              transition={{ duration: 0.8, repeat: isWin && allStopped ? 3 : 0 }}
            >
              🐯
            </motion.span>
            <span className="text-xl font-black tracking-wider"
              style={{
                background: "linear-gradient(180deg, #FFD700, #FF8C00)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "none",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
              }}
            >
              FORTUNE TIGER
            </span>
            <motion.span
              className="text-4xl scale-x-[-1]"
              animate={isWin && allStopped ? {
                scale: [1, 1.3, 1],
                rotate: [0, 15, -15, 10, -10, 0],
              } : {}}
              transition={{ duration: 0.8, repeat: isWin && allStopped ? 3 : 0 }}
            >
              🐯
            </motion.span>
          </div>
        </div>

        {/* Balance Display */}
        <div className="mx-3 mb-2 rounded-lg px-3 py-1.5 flex items-center justify-between"
          style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.5), rgba(20,10,0,0.6), rgba(0,0,0,0.5))" }}
        >
          <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "#DAA520" }}>Saldo</span>
          <span className="text-base font-black tracking-wide" style={{ color: "#FFD700" }}>
            {balance.toLocaleString("pt-BR")} <span className="text-xs">🪙</span>
          </span>
        </div>

        {/* Reel Area */}
        <div className="mx-3 mb-3 rounded-xl p-2 relative"
          style={{
            background: "linear-gradient(180deg, #0D0503 0%, #1A0A02 50%, #0D0503 100%)",
            boxShadow: "inset 0 0 30px rgba(0,0,0,0.8), 0 0 15px rgba(255,165,0,0.1)"
          }}
        >
          {/* Gold inner border */}
          <div className="absolute inset-0 rounded-xl border border-amber-700/40 pointer-events-none" />

          {/* Win lines indicators */}
          <div className="absolute left-0 top-0 bottom-0 w-5 flex flex-col justify-around items-center z-10 pointer-events-none">
            {[0, 1, 2].map(i => (
              <div key={i} className={`w-3 h-3 rounded-full border-2 text-[6px] flex items-center justify-center font-bold
                ${winningRows.includes(i) ? "border-yellow-400 bg-yellow-400 text-black" : "border-amber-800/60 text-amber-800/60"}`}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-5 flex flex-col justify-around items-center z-10 pointer-events-none">
            {[0, 1, 2].map(i => (
              <div key={i} className={`w-3 h-3 rounded-full border-2 text-[6px] flex items-center justify-center font-bold
                ${winningRows.includes(i) ? "border-yellow-400 bg-yellow-400 text-black" : "border-amber-800/60 text-amber-800/60"}`}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* 3x3 Grid */}
          <div className="grid grid-cols-3 gap-1.5 px-5">
            {[0, 1, 2].map(col => (
              <SpinningReel
                key={col}
                symbols={SYMBOLS.map(s => s.emoji)}
                spinning={spinning && !stoppedCols[col]}
                finalSymbols={[displayGrid[0]?.[col] || "🐯", displayGrid[1]?.[col] || "💰", displayGrid[2]?.[col] || "🧧"]}
                colIndex={col}
                onStop={() => handleColStop(col)}
              />
            ))}
          </div>

          {/* Win line overlays */}
          {winningRows.map(row => (
            <motion.div
              key={`winline-${row}`}
              className="absolute left-5 right-5 h-[2px] pointer-events-none z-20"
              style={{
                top: `calc(${(row * 33.33) + 16.66}% + ${row * 2}px)`,
                background: "linear-gradient(90deg, transparent, #FFD700, #FF6600, #FFD700, transparent)",
                boxShadow: "0 0 10px rgba(255,215,0,0.6)"
              }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
          ))}
        </div>

        {/* Result Banner */}
        <AnimatePresence>
          {lastResult && !spinning && allStopped && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-3 mb-2 rounded-lg py-2 text-center"
              style={{
                background: isWin
                  ? "linear-gradient(90deg, rgba(255,165,0,0.15), rgba(255,215,0,0.25), rgba(255,165,0,0.15))"
                  : "rgba(0,0,0,0.3)"
              }}
            >
              {isWin ? (
                <div>
                  <motion.span
                    className="text-lg font-black"
                    style={{ color: "#FFD700" }}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 0.5, repeat: 3 }}
                  >
                    🎉 x{lastResult.multiplier} — +{lastResult.payout} moedas!
                  </motion.span>
                </div>
              ) : (
                <span className="text-sm" style={{ color: "#8B6914" }}>Gire novamente...</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Falling coins on win */}
        <AnimatePresence>
          {isWin && !spinning && allStopped && (
            <>
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={`coin-${i}`}
                  className="absolute text-xl pointer-events-none z-30"
                  initial={{
                    opacity: 1,
                    x: `${10 + Math.random() * 80}%`,
                    y: "-5%"
                  }}
                  animate={{
                    y: "105%",
                    opacity: [1, 1, 0],
                    rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
                    x: `${10 + Math.random() * 80}%`,
                  }}
                  transition={{
                    duration: 1.8 + Math.random() * 0.8,
                    delay: i * 0.08,
                    ease: "easeIn"
                  }}
                >
                  {Math.random() > 0.5 ? "🪙" : "💰"}
                </motion.div>
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Gold trim bottom */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #8B6914, #FFD700, #DAA520, #FFD700, #8B6914)" }} />
      </div>

      {/* Controls Panel */}
      <div className="rounded-xl p-3 space-y-3"
        style={{
          background: "linear-gradient(180deg, #2D1810, #1A0D08)",
          border: "1px solid rgba(139,105,20,0.3)"
        }}
      >
        {/* Bet Amount */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#DAA520" }}>Aposta</span>
          <div className="flex items-center gap-2">
            <button
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors disabled:opacity-30"
              style={{ background: "linear-gradient(180deg, #8B6914, #5C4A0A)", color: "#FFD700" }}
              disabled={spinning}
              onClick={() => setBetAmount(Math.max(5, betAmount - 5))}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <div className="w-20 text-center py-1 rounded-md text-lg font-black"
              style={{ background: "rgba(0,0,0,0.5)", color: "#FFD700" }}
            >
              {betAmount}
            </div>
            <button
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors disabled:opacity-30"
              style={{ background: "linear-gradient(180deg, #8B6914, #5C4A0A)", color: "#FFD700" }}
              disabled={spinning}
              onClick={() => setBetAmount(Math.min(balance, betAmount + 5))}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick bet buttons */}
        <div className="flex gap-1.5">
          {[10, 25, 50, 100, 250].map((v) => (
            <button
              key={v}
              className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
                betAmount === v ? "ring-1 ring-yellow-400" : ""
              }`}
              style={{
                background: betAmount === v
                  ? "linear-gradient(180deg, #DAA520, #8B6914)"
                  : "rgba(255,255,255,0.05)",
                color: betAmount === v ? "#000" : "#DAA520"
              }}
              disabled={spinning}
              onClick={() => setBetAmount(Math.min(v, balance))}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Play Buttons */}
        <div className="flex gap-2">
          <motion.button
            className="flex-1 py-3 rounded-xl font-black text-base tracking-wide disabled:opacity-40"
            style={{
              background: spinning
                ? "linear-gradient(180deg, #5C4A0A, #3D3205)"
                : "linear-gradient(180deg, #FFD700, #FF8C00, #CC7000)",
              color: spinning ? "#8B6914" : "#1A0A02",
              boxShadow: spinning ? "none" : "0 4px 20px rgba(255,140,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)"
            }}
            disabled={spinning || betAmount > balance}
            onClick={play}
            whileTap={{ scale: 0.97 }}
          >
            {spinning ? "⏳ GIRANDO..." : "🐯 GIRAR"}
          </motion.button>

          <button
            className={`w-12 rounded-xl flex items-center justify-center transition-all ${
              autoPlay ? "ring-2 ring-red-500" : ""
            }`}
            style={{
              background: autoPlay
                ? "linear-gradient(180deg, #8B1A1A, #5C0A0A)"
                : "rgba(255,255,255,0.08)",
              color: autoPlay ? "#FF6B6B" : "#DAA520"
            }}
            onClick={() => {
              if (autoPlay) setAutoPlay(false);
              else { setAutoPlay(true); play(); }
            }}
            disabled={spinning && !autoPlay}
          >
            {autoPlay ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Multiplier chips */}
      <div className="flex gap-1.5 justify-center flex-wrap">
        {[
          { m: 2, color: "#4A9" },
          { m: 5, color: "#49F" },
          { m: 10, color: "#A4F" },
          { m: 50, color: "#F4A" },
          { m: 100, color: "#F44" },
        ].map(({ m, color }) => (
          <span key={m} className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
          >
            x{m}
          </span>
        ))}
      </div>

      {/* History */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl overflow-hidden"
            style={{ background: "linear-gradient(180deg, #1A0D08, #0D0503)", border: "1px solid rgba(139,105,20,0.2)" }}
          >
            <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#DAA520" }}>
                Últimas Jogadas
              </h3>
              {history.length === 0 && (
                <p className="text-xs text-center py-4" style={{ color: "#5C4A0A" }}>Nenhuma jogada ainda</p>
              )}
              {history.map((h: any) => (
                <div key={h.id} className="flex items-center justify-between text-xs py-1 border-b border-amber-900/20">
                  <span style={{ color: "#8B6914" }}>Aposta: {h.bet_amount}</span>
                  <span className="font-bold" style={{ color: h.multiplier > 0 ? "#4ADE80" : "#EF4444" }}>
                    {h.multiplier > 0 ? `x${h.multiplier} +${h.payout}` : "x0"}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
