import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Minus, Plus, History, Play, Square, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTigrinho, SYMBOL_KEYS } from "@/hooks/useTigrinho";

import tigerImg from "@/assets/tigrinho/tiger.png";
import goldIngotImg from "@/assets/tigrinho/gold-ingot.png";
import coinsImg from "@/assets/tigrinho/coins.png";
import redEnvelopeImg from "@/assets/tigrinho/red-envelope.png";
import lanternImg from "@/assets/tigrinho/lantern.png";
import firecrackerImg from "@/assets/tigrinho/firecracker.png";
import fortuneBagImg from "@/assets/tigrinho/fortune-bag.png";
import diamondImg from "@/assets/tigrinho/diamond.png";

const SYMBOL_IMAGES: Record<string, string> = {
  tiger: tigerImg,
  gold: goldIngotImg,
  coins: coinsImg,
  envelope: redEnvelopeImg,
  lantern: lanternImg,
  firecracker: firecrackerImg,
  bag: fortuneBagImg,
  diamond: diamondImg,
};

const SYMBOL_VALUES: Record<string, number> = {
  tiger: 100,
  gold: 50,
  coins: 25,
  envelope: 15,
  lantern: 10,
  firecracker: 8,
  bag: 5,
  diamond: 3,
};

interface TigrinhoGameProps {
  onBack: () => void;
}

function SymbolImage({ symbolKey, className }: { symbolKey: string; className?: string }) {
  const src = SYMBOL_IMAGES[symbolKey] || tigerImg;
  return (
    <img
      src={src}
      alt={symbolKey}
      className={`w-full h-full object-contain pointer-events-none select-none ${className || ""}`}
      draggable={false}
    />
  );
}

function SpinningReel({ spinning, finalSymbols, colIndex, onStop }: {
  spinning: boolean;
  finalSymbols: string[];
  colIndex: number;
  onStop: () => void;
}) {
  const [displaySymbols, setDisplaySymbols] = useState(finalSymbols);
  const [offset, setOffset] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const speedRef = useRef(0);
  const offsetRef = useRef(0);
  const [isStopping, setIsStopping] = useState(false);

  useEffect(() => {
    if (!spinning) return;
    setIsStopping(false);
    speedRef.current = 18 + colIndex * 2;
    offsetRef.current = 0;

    // Randomize symbols rapidly during spin
    intervalRef.current = setInterval(() => {
      setDisplaySymbols([
        SYMBOL_KEYS[Math.floor(Math.random() * SYMBOL_KEYS.length)],
        SYMBOL_KEYS[Math.floor(Math.random() * SYMBOL_KEYS.length)],
        SYMBOL_KEYS[Math.floor(Math.random() * SYMBOL_KEYS.length)],
      ]);
    }, 80);

    // Animate vertical offset for scroll illusion
    const animate = () => {
      offsetRef.current = (offsetRef.current + speedRef.current) % 100;
      setOffset(offsetRef.current);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);

    // Stop after delay - decelerate then snap
    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsStopping(true);

      // Deceleration phase
      let decelSpeed = speedRef.current;
      const decelerate = () => {
        decelSpeed *= 0.88;
        offsetRef.current = (offsetRef.current + decelSpeed) % 100;
        setOffset(offsetRef.current);
        if (decelSpeed > 0.5) {
          animFrameRef.current = requestAnimationFrame(decelerate);
        } else {
          // Snap to final
          if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
          setOffset(0);
          setDisplaySymbols(finalSymbols);
          setIsStopping(false);
          onStop();
        }
      };
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(decelerate);
    }, 600 + colIndex * 450);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setIsStopping(false);
      setOffset(0);
    };
  }, [spinning]);

  useEffect(() => {
    if (!spinning && !isStopping) {
      setDisplaySymbols(finalSymbols);
      setOffset(0);
    }
  }, [finalSymbols, spinning, isStopping]);

  const isActive = spinning || isStopping;

  return (
    <div className="flex flex-col gap-1.5 relative">
      {displaySymbols.map((s, i) => (
        <div key={i}
          className="w-full aspect-square flex items-center justify-center rounded-md p-1.5 bg-gradient-to-b from-[#1a0a02]/80 to-[#2a1005]/80 relative overflow-hidden"
        >
          <motion.div
            className="w-full h-full flex items-center justify-center"
            animate={isActive
              ? { y: [0, -30, 30, -20, 20, 0], rotateX: [0, 180, 360] }
              : { y: 0, rotateX: 0, scale: [1, 1.05, 1] }
            }
            transition={isActive
              ? { y: { duration: 0.15, repeat: Infinity }, rotateX: { duration: 0.3, repeat: Infinity } }
              : { scale: { duration: 0.4, delay: 0.1 * colIndex } }
            }
            style={{ perspective: 400 }}
          >
            <SymbolImage
              symbolKey={s}
              className={isActive
                ? "blur-[1px] scale-90 opacity-70"
                : "drop-shadow-[0_2px_6px_rgba(255,200,0,0.3)]"
              }
            />
          </motion.div>
          {/* Motion blur overlay during spin */}
          {isActive && (
            <div className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(180deg, rgba(26,10,2,0.5) 0%, transparent 25%, transparent 75%, rgba(26,10,2,0.5) 100%)"
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/** Floating value label on winning cells */
function WinValueOverlay({ symbolKey, betAmount, multiplier, row, col }: {
  symbolKey: string;
  betAmount: number;
  multiplier: number;
  row: number;
  col: number;
}) {
  const baseVal = SYMBOL_VALUES[symbolKey] || 1;
  const cellValue = Math.round((betAmount * multiplier) / 3);

  return (
    <motion.div
      className="absolute z-30 pointer-events-none flex flex-col items-center"
      style={{
        left: `calc(${col * 33.33}% + 20px + ${col * 6}px + 16.66%)`,
        top: `calc(${row * 33.33}% + ${row * 6}px + 16.66%)`,
      }}
      initial={{ opacity: 0, scale: 0.3, y: 10 }}
      animate={{ opacity: [0, 1, 1, 1, 0], scale: [0.3, 1.6, 1.4, 1.3, 0.9], y: [10, -15, -20, -25, -50] }}
      transition={{ duration: 2.5, delay: 0.2 + col * 0.15 }}
    >
      <span className="text-base sm:text-lg font-black px-2.5 py-1 rounded-lg"
        style={{
          background: "linear-gradient(180deg, #FFD700, #FF8C00)",
          color: "#1A0A02",
          boxShadow: "0 4px 20px rgba(255,215,0,0.7), 0 0 30px rgba(255,165,0,0.4)",
          textShadow: "0 1px 0 rgba(255,255,255,0.4)",
          border: "1px solid rgba(255,255,255,0.3)"
        }}
      >
        +{cellValue}
      </span>
    </motion.div>
  );
}

/** Animated payout flying to balance */
function PayoutToBalance({ payout }: { payout: number }) {
  return (
    <motion.div
      className="absolute z-40 pointer-events-none"
      initial={{ opacity: 1, left: "50%", bottom: "35%", x: "-50%", scale: 1.8 }}
      animate={{
        opacity: [1, 1, 1, 0.8, 0],
        left: "75%",
        top: "10%",
        bottom: "auto",
        scale: [1.8, 1.5, 1.2, 0.9, 0.5],
        x: "-50%",
      }}
      transition={{ duration: 2, delay: 1.2, ease: "easeInOut" }}
    >
      <span className="text-2xl sm:text-3xl font-black whitespace-nowrap"
        style={{
          color: "#FFD700",
          textShadow: "0 0 20px rgba(255,215,0,1), 0 0 40px rgba(255,165,0,0.6), 0 3px 6px rgba(0,0,0,0.8)"
        }}
      >
        +{payout} 🪙
      </span>
    </motion.div>
  );
}

/** Balance flash effect */
function BalanceFlash() {
  return (
    <motion.div
      className="absolute inset-0 rounded-lg pointer-events-none z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.6, 0], boxShadow: ["0 0 0px #FFD700", "0 0 20px #FFD700", "0 0 0px #FFD700"] }}
      transition={{ duration: 0.8, delay: 2.2 }}
      style={{ border: "2px solid #FFD700" }}
    />
  );
}

/** Full-screen win celebration with counting */
function WinCelebration({ payout, multiplier, onDismiss }: { payout: number; multiplier: number; onDismiss: () => void }) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = payout / steps;
    const interval = duration / steps;
    
    const timer = setInterval(() => {
      countRef.current = Math.min(countRef.current + increment, payout);
      setCount(Math.round(countRef.current));
      if (countRef.current >= payout) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, [payout]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer"
      onClick={onDismiss}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ background: "radial-gradient(ellipse at center, rgba(139,26,26,0.95) 0%, rgba(0,0,0,0.97) 100%)" }}
    >
      {/* Sparkles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={`spark-${i}`}
          className="absolute text-2xl pointer-events-none"
          initial={{
            opacity: 0,
            x: "50%",
            y: "50%",
            scale: 0,
          }}
          animate={{
            opacity: [0, 1, 0],
            x: `${15 + Math.random() * 70}%`,
            y: `${15 + Math.random() * 70}%`,
            scale: [0, 1.5, 0],
            rotate: [0, 360],
          }}
          transition={{
            duration: 2 + Math.random() * 1.5,
            delay: Math.random() * 1.5,
            repeat: Infinity,
            repeatDelay: Math.random() * 2,
          }}
        >
          {["✨", "🪙", "💰", "⭐", "🎉"][Math.floor(Math.random() * 5)]}
        </motion.div>
      ))}

      {/* Tiger */}
      <motion.img
        src={tigerImg}
        alt="tiger"
        className="w-24 h-24 sm:w-32 sm:h-32 object-contain mb-4"
        animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 8, -5, 5, 0] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />

      {/* PARABÉNS */}
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.2 }}
      >
        <h2 className="text-4xl sm:text-5xl font-black tracking-wider text-center mb-2"
          style={{
            background: "linear-gradient(180deg, #FFD700, #FF8C00, #FFD700)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.6))",
          }}
        >
          🎉 PARABÉNS! 🎉
        </h2>
      </motion.div>

      {/* Multiplier */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-4"
      >
        <span className="text-xl sm:text-2xl font-bold" style={{ color: "#DAA520" }}>
          Multiplicador x{multiplier}
        </span>
      </motion.div>

      {/* Counting value */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 150 }}
        className="relative"
      >
        <div className="px-8 py-4 rounded-2xl"
          style={{
            background: "linear-gradient(180deg, rgba(255,215,0,0.2), rgba(255,140,0,0.15))",
            border: "2px solid rgba(255,215,0,0.4)",
            boxShadow: "0 0 40px rgba(255,215,0,0.3), inset 0 0 20px rgba(255,165,0,0.1)"
          }}
        >
          <div className="text-center">
            <span className="text-xs uppercase tracking-widest font-bold block mb-1" style={{ color: "#DAA520" }}>
              Você ganhou
            </span>
            <motion.span
              className="text-5xl sm:text-6xl font-black block"
              style={{
                color: "#FFD700",
                textShadow: "0 0 30px rgba(255,215,0,0.8), 0 4px 8px rgba(0,0,0,0.5)"
              }}
              animate={count >= payout ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.4 }}
            >
              💰 +{count}
            </motion.span>
            <span className="text-lg block mt-1" style={{ color: "#DAA520" }}>moedas 🪙</span>
          </div>
        </div>
      </motion.div>

      {/* Tap to dismiss */}
      <motion.p
        className="mt-8 text-xs tracking-wider"
        style={{ color: "rgba(218,165,32,0.5)" }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        Toque para continuar
      </motion.p>
    </motion.div>
  );
}

export function TigrinhoGame({ onBack }: TigrinhoGameProps) {
  const { balance, betAmount, setBetAmount, spinning, lastResult, play, history } = useTigrinho();
  const [showHistory, setShowHistory] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [muted, setMuted] = useState(false);
  const [stoppedCols, setStoppedCols] = useState([true, true, true]);
  const [showWinAnim, setShowWinAnim] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [displayGrid, setDisplayGrid] = useState<string[][]>(() =>
    Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => SYMBOL_KEYS[Math.floor(Math.random() * SYMBOL_KEYS.length)]))
  );
  const autoPlayRef = useRef(autoPlay);

  useEffect(() => { autoPlayRef.current = autoPlay; }, [autoPlay]);
  useEffect(() => {
    if (spinning) {
      setStoppedCols([false, false, false]);
      setShowWinAnim(false);
      setShowCelebration(false);
    }
  }, [spinning]);
  useEffect(() => {
    if (lastResult) {
      setDisplayGrid(lastResult.symbols);
      setStoppedCols([true, true, true]);
      if (lastResult.multiplier > 0) {
        setShowWinAnim(true);
        // Show celebration after a short delay for the reel animation to finish
        const celebTimer = setTimeout(() => setShowCelebration(true), 800);
        const hideTimer = setTimeout(() => setShowWinAnim(false), 3500);
        return () => { clearTimeout(celebTimer); clearTimeout(hideTimer); };
      }
    }
  }, [lastResult]);

  useEffect(() => {
    if (!autoPlay || spinning) return;
    const t = setTimeout(() => { if (autoPlayRef.current) play(); }, 2500);
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
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #8B6914, #FFD700, #DAA520, #FFD700, #8B6914)" }} />

        {/* Tiger Header */}
        <div className="relative flex items-center justify-center py-2">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-900/20 to-transparent" />
          <div className="relative flex items-center gap-1">
            <motion.img src={tigerImg} alt="tiger" className="w-12 h-12 object-contain"
              animate={isWin && allStopped ? { scale: [1, 1.3, 1], rotate: [0, -15, 15, 0] } : {}}
              transition={{ duration: 0.8, repeat: isWin && allStopped ? 3 : 0 }}
            />
            <span className="text-xl font-black tracking-wider"
              style={{ background: "linear-gradient(180deg, #FFD700, #FF8C00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}
            >
              FORTUNE TIGER
            </span>
            <motion.img src={tigerImg} alt="tiger" className="w-12 h-12 object-contain scale-x-[-1]"
              animate={isWin && allStopped ? { scale: [1, 1.3, 1], rotate: [0, 15, -15, 0] } : {}}
              transition={{ duration: 0.8, repeat: isWin && allStopped ? 3 : 0 }}
            />
          </div>
        </div>

        {/* Balance */}
        <div className="mx-3 mb-2 rounded-lg px-3 py-1.5 flex items-center justify-between relative"
          style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.5), rgba(20,10,0,0.6), rgba(0,0,0,0.5))" }}
        >
          <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "#DAA520" }}>Saldo</span>
          <span className="text-base font-black tracking-wide" style={{ color: "#FFD700" }}>
            {balance.toLocaleString("pt-BR")} <span className="text-xs">🪙</span>
          </span>
          {/* Balance flash on win */}
          <AnimatePresence>
            {showWinAnim && <BalanceFlash />}
          </AnimatePresence>
        </div>

        {/* Reel Area */}
        <div className="mx-3 mb-3 rounded-xl p-2 relative"
          style={{
            background: "linear-gradient(180deg, #0D0503 0%, #1A0A02 50%, #0D0503 100%)",
            boxShadow: "inset 0 0 30px rgba(0,0,0,0.8), 0 0 15px rgba(255,165,0,0.1)"
          }}
        >
          <div className="absolute inset-0 rounded-xl border border-amber-700/40 pointer-events-none" />

          {/* Win line indicators */}
          <div className="absolute left-0 top-0 bottom-0 w-5 flex flex-col justify-around items-center z-10 pointer-events-none">
            {[0, 1, 2].map(i => (
              <div key={i} className={`w-3 h-3 rounded-full border-2 text-[6px] flex items-center justify-center font-bold ${winningRows.includes(i) ? "border-yellow-400 bg-yellow-400 text-black" : "border-amber-800/60 text-amber-800/60"}`}>{i + 1}</div>
            ))}
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-5 flex flex-col justify-around items-center z-10 pointer-events-none">
            {[0, 1, 2].map(i => (
              <div key={i} className={`w-3 h-3 rounded-full border-2 text-[6px] flex items-center justify-center font-bold ${winningRows.includes(i) ? "border-yellow-400 bg-yellow-400 text-black" : "border-amber-800/60 text-amber-800/60"}`}>{i + 1}</div>
            ))}
          </div>

          {/* 3x3 Grid */}
          <div className="grid grid-cols-3 gap-1.5 px-5">
            {[0, 1, 2].map(col => (
              <SpinningReel
                key={col}
                spinning={spinning && !stoppedCols[col]}
                finalSymbols={[displayGrid[0]?.[col] || "tiger", displayGrid[1]?.[col] || "gold", displayGrid[2]?.[col] || "coins"]}
                colIndex={col}
                onStop={() => handleColStop(col)}
              />
            ))}
          </div>

          {/* Win value overlays on winning cells */}
          <AnimatePresence>
            {showWinAnim && lastResult && winningRows.map(row =>
              [0, 1, 2].map(col => (
                <WinValueOverlay
                  key={`val-${row}-${col}`}
                  symbolKey={lastResult.symbols[row][col]}
                  betAmount={betAmount}
                  multiplier={lastResult.multiplier}
                  row={row}
                  col={col}
                />
              ))
            )}
          </AnimatePresence>

          {/* Win line overlays */}
          {winningRows.map(row => (
            <motion.div key={`wl-${row}`} className="absolute left-5 right-5 h-[2px] pointer-events-none z-20"
              style={{ top: `calc(${(row * 33.33) + 16.66}% + ${row * 2}px)`, background: "linear-gradient(90deg, transparent, #FFD700, #FF6600, #FFD700, transparent)", boxShadow: "0 0 10px rgba(255,215,0,0.6)" }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
          ))}
        </div>

        {/* Payout flying to balance */}
        <AnimatePresence>
          {showWinAnim && lastResult && lastResult.payout > 0 && (
            <PayoutToBalance payout={lastResult.payout} />
          )}
        </AnimatePresence>

        {/* Result Banner - only show on win */}
        <AnimatePresence>
          {isWin && lastResult && !spinning && allStopped && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mx-3 mb-2 rounded-lg py-2 text-center"
              style={{ background: "linear-gradient(90deg, rgba(255,165,0,0.15), rgba(255,215,0,0.25), rgba(255,165,0,0.15))" }}
            >
              <motion.span className="text-lg font-black" style={{ color: "#FFD700" }}
                animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 0.5, repeat: 3 }}
              >
                🎉 x{lastResult.multiplier} — +{lastResult.payout} moedas!
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Falling coins */}
        <AnimatePresence>
          {isWin && !spinning && allStopped && (
            <>
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div key={`c-${i}`} className="absolute text-xl pointer-events-none z-30"
                  initial={{ opacity: 1, x: `${10 + Math.random() * 80}%`, y: "-5%" }}
                  animate={{ y: "105%", opacity: [1, 1, 0], rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)] }}
                  transition={{ duration: 1.8 + Math.random() * 0.8, delay: i * 0.08, ease: "easeIn" }}
                >
                  🪙
                </motion.div>
              ))}
            </>
          )}
        </AnimatePresence>

        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #8B6914, #FFD700, #DAA520, #FFD700, #8B6914)" }} />
      </div>

      {/* Controls */}
      <div className="rounded-xl p-3 space-y-3" style={{ background: "linear-gradient(180deg, #2D1810, #1A0D08)", border: "1px solid rgba(139,105,20,0.3)" }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#DAA520" }}>Aposta</span>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30" style={{ background: "linear-gradient(180deg, #8B6914, #5C4A0A)", color: "#FFD700" }} disabled={spinning} onClick={() => setBetAmount(Math.max(5, betAmount - 5))}><Minus className="w-3.5 h-3.5" /></button>
            <div className="w-20 text-center py-1 rounded-md text-lg font-black" style={{ background: "rgba(0,0,0,0.5)", color: "#FFD700" }}>{betAmount}</div>
            <button className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30" style={{ background: "linear-gradient(180deg, #8B6914, #5C4A0A)", color: "#FFD700" }} disabled={spinning} onClick={() => setBetAmount(Math.min(balance, betAmount + 5))}><Plus className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        <div className="flex gap-1.5">
          {[10, 25, 50, 100, 250].map(v => (
            <button key={v} className={`flex-1 py-1.5 rounded-md text-xs font-bold ${betAmount === v ? "ring-1 ring-yellow-400" : ""}`}
              style={{ background: betAmount === v ? "linear-gradient(180deg, #DAA520, #8B6914)" : "rgba(255,255,255,0.05)", color: betAmount === v ? "#000" : "#DAA520" }}
              disabled={spinning} onClick={() => setBetAmount(Math.min(v, balance))}
            >{v}</button>
          ))}
        </div>

        <div className="flex gap-2">
          <motion.button className="flex-1 py-3 rounded-xl font-black text-base tracking-wide disabled:opacity-40"
            style={{ background: spinning ? "linear-gradient(180deg, #5C4A0A, #3D3205)" : "linear-gradient(180deg, #FFD700, #FF8C00, #CC7000)", color: spinning ? "#8B6914" : "#1A0A02", boxShadow: spinning ? "none" : "0 4px 20px rgba(255,140,0,0.4)" }}
            disabled={spinning || betAmount > balance} onClick={play} whileTap={{ scale: 0.97 }}
          >{spinning ? "⏳ GIRANDO..." : "🐯 GIRAR"}</motion.button>
          <button className={`w-12 rounded-xl flex items-center justify-center ${autoPlay ? "ring-2 ring-red-500" : ""}`}
            style={{ background: autoPlay ? "linear-gradient(180deg, #8B1A1A, #5C0A0A)" : "rgba(255,255,255,0.08)", color: autoPlay ? "#FF6B6B" : "#DAA520" }}
            onClick={() => { if (autoPlay) setAutoPlay(false); else { setAutoPlay(true); play(); } }}
            disabled={spinning && !autoPlay}
          >{autoPlay ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}</button>
        </div>
      </div>

      {/* Multipliers */}
      <div className="flex gap-1.5 justify-center flex-wrap">
        {[{ m: 2, c: "#4A9" }, { m: 5, c: "#49F" }, { m: 10, c: "#A4F" }, { m: 50, c: "#F4A" }, { m: 100, c: "#F44" }].map(({ m, c }) => (
          <span key={m} className="px-2.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${c}22`, color: c, border: `1px solid ${c}44` }}>x{m}</span>
        ))}
      </div>

      {/* History */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="rounded-xl overflow-hidden" style={{ background: "linear-gradient(180deg, #1A0D08, #0D0503)", border: "1px solid rgba(139,105,20,0.2)" }}
          >
            <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#DAA520" }}>Últimas Jogadas</h3>
              {history.length === 0 && <p className="text-xs text-center py-4" style={{ color: "#5C4A0A" }}>Nenhuma jogada ainda</p>}
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

      {/* Win Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && lastResult && lastResult.multiplier > 0 && (
          <WinCelebration
            payout={lastResult.payout}
            multiplier={lastResult.multiplier}
            onDismiss={() => setShowCelebration(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
