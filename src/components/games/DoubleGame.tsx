import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Minus, Plus, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDouble, buildRouletteStrip, DoubleColor } from "@/hooks/useDouble";
import { cn } from "@/lib/utils";

interface Props {
  onBack: () => void;
}

const COLOR_MAP: Record<DoubleColor, string> = {
  red: "bg-red-600",
  black: "bg-zinc-800",
  white: "bg-emerald-50",
};

const COLOR_TEXT: Record<DoubleColor, string> = {
  red: "text-white",
  black: "text-white",
  white: "text-zinc-900",
};

const COLOR_LABEL: Record<DoubleColor, string> = {
  red: "Vermelho",
  black: "Preto",
  white: "Branco",
};

const MULTIPLIER: Record<DoubleColor, string> = {
  red: "2x",
  black: "2x",
  white: "14x",
};

export function DoubleGame({ onBack }: Props) {
  const {
    phase,
    timeLeft,
    balance,
    bets,
    myBets,
    history,
    lastResult,
    spinTarget,
    placeBet,
  } = useDouble();

  const [betAmount, setBetAmount] = useState(1);
  const [selectedColor, setSelectedColor] = useState<DoubleColor | null>(null);

  // Oscillating percentages every 5 minutes
  const [colorPercentages, setColorPercentages] = useState({ red: 47, black: 47, white: 6 });
  useEffect(() => {
    const randomize = () => {
      const whiteBase = 6 + (Math.random() * 4 - 2); // 4-8%
      const remaining = 100 - whiteBase;
      const redShift = Math.random() * 6 - 3; // ±3%
      const red = Math.round((remaining / 2 + redShift) * 10) / 10;
      const black = Math.round((remaining - red) * 10) / 10;
      setColorPercentages({ red, black, white: Math.round(whiteBase * 10) / 10 });
    };
    randomize();
    const interval = setInterval(randomize, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  const stripRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const strip = useMemo(() => buildRouletteStrip(), []);
  const CELL_WIDTH = 100;
  const VISIBLE_CELLS = 5;
  const [viewportWidth, setViewportWidth] = useState(VISIBLE_CELLS * CELL_WIDTH);
  const centerOffset = viewportWidth / 2 - CELL_WIDTH / 2;

  useEffect(() => {
    if (!viewportRef.current) return;

    const updateViewport = () => {
      const width = viewportRef.current?.clientWidth || VISIBLE_CELLS * CELL_WIDTH;
      setViewportWidth(width);
    };

    updateViewport();
    const resizeObserver = new ResizeObserver(updateViewport);
    resizeObserver.observe(viewportRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Animate roulette
  useEffect(() => {
    if (!stripRef.current) return;

    if (phase === "betting") {
      stripRef.current.style.transition = "none";
      stripRef.current.style.transform = `translateX(-${15 * CELL_WIDTH - centerOffset}px)`;
    }

    if (phase === "spinning" && spinTarget !== null) {
      const targetPx = spinTarget * CELL_WIDTH - centerOffset;
      stripRef.current.style.transition = "transform 4.6s cubic-bezier(0.15, 0.85, 0.35, 1)";
      stripRef.current.style.transform = `translateX(-${targetPx}px)`;
    }

    // Hard snap at result to guarantee exact visual alignment with the winning cell
    if (phase === "result" && spinTarget !== null) {
      const targetPx = spinTarget * CELL_WIDTH - centerOffset;
      stripRef.current.style.transition = "none";
      stripRef.current.style.transform = `translateX(-${targetPx}px)`;
    }
  }, [phase, spinTarget, centerOffset]);

  const handleBet = async (color: DoubleColor) => {
    if (phase !== "betting") return;
    const success = await placeBet(color, betAmount);
    if (success) {
      setSelectedColor(color);
    }
  };

  const adjustAmount = (delta: number) => {
    setBetAmount(prev => Math.max(0.1, Math.round((prev + delta) * 100) / 100));
  };

  const betsByColor = useMemo(() => {
    const map: Record<DoubleColor, { total: number; count: number }> = {
      red: { total: 0, count: 0 },
      black: { total: 0, count: 0 },
      white: { total: 0, count: 0 },
    };
    bets.forEach(b => {
      const c = b.bet_color as DoubleColor;
      map[c].total += Number(b.bet_amount);
      map[c].count += 1;
    });
    return map;
  }, [bets]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Saldo</p>
          <p className="text-lg font-bold text-emerald-500">
            R$ {balance.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-zinc-900 rounded-xl p-3 text-center border border-zinc-800">
        <AnimatePresence mode="wait">
          {phase === "betting" && (
            <motion.div
              key="betting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-amber-400 font-bold text-sm">
                ⏳ Faça suas apostas — {timeLeft}s
              </p>
              <div className="w-full bg-zinc-700 rounded-full h-1.5 mt-2">
                <motion.div
                  className="bg-amber-400 h-1.5 rounded-full"
                  initial={{ width: "100%" }}
                  animate={{ width: `${(timeLeft / 15) * 100}%` }}
                  transition={{ duration: 1, ease: "linear" }}
                />
              </div>
            </motion.div>
          )}
          {phase === "spinning" && (
            <motion.p
              key="spinning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-cyan-400 font-bold text-sm"
            >
              🎰 Girando...
            </motion.p>
          )}
          {phase === "result" && lastResult && (
            <motion.div
              key="result"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <p className="text-lg font-black">
                <span
                  className={cn(
                    "inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg",
                    COLOR_MAP[lastResult.color],
                    COLOR_TEXT[lastResult.color]
                  )}
                >
                  {lastResult.number}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {COLOR_LABEL[lastResult.color]} — {MULTIPLIER[lastResult.color]}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Roulette */}
      <div className="relative bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
        {/* Center indicator */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
          <ChevronDown className="w-5 h-5 text-amber-400 -mb-1" />
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center rotate-180">
          <ChevronDown className="w-5 h-5 text-amber-400 -mb-1" />
        </div>
        {/* Center line */}
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-amber-400/60 z-10 -translate-x-1/2" />

        <div
          ref={viewportRef}
          className="overflow-hidden py-4 w-full max-w-[500px] mx-auto"
        >
          <div
            ref={stripRef}
            className="flex"
            style={{ width: strip.length * CELL_WIDTH }}
          >
            {strip.map((cell, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{ width: CELL_WIDTH, height: 80 }}
                >
                  <div
                    className={cn(
                      "w-[84px] h-[72px] rounded-xl flex items-center justify-center font-bold text-xl shadow-md border border-white/10",
                      COLOR_MAP[cell.color],
                      COLOR_TEXT[cell.color]
                    )}
                  >
                    {cell.color === "white" ? "⭐" : cell.number}
                  </div>
                </div>
            ))}
          </div>
        </div>
      </div>

      {/* History */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {history.map((h, i) => (
          <motion.div
            key={i}
            initial={i === 0 ? { scale: 0 } : false}
            animate={{ scale: 1 }}
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border border-white/10",
              COLOR_MAP[h.color],
              COLOR_TEXT[h.color]
            )}
          >
            {h.color === "white" ? "⭐" : h.number}
          </motion.div>
        ))}
      </div>

      {/* Bet Amount */}
      <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
        <p className="text-xs text-muted-foreground mb-2">Valor da aposta</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 bg-zinc-800 border-zinc-700"
            onClick={() => adjustAmount(-1)}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <div className="flex-1 bg-zinc-800 rounded-lg px-4 py-2 text-center">
            <span className="text-lg font-bold text-foreground">
              R$ {betAmount.toFixed(2)}
            </span>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 bg-zinc-800 border-zinc-700"
            onClick={() => adjustAmount(1)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          {[0.5, 1, 5, 10, 50, 100].map(v => (
            <Button
              key={v}
              variant="outline"
              size="sm"
              className="flex-1 text-xs bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
              onClick={() => setBetAmount(v)}
            >
              {v}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-zinc-800 border-zinc-700"
            onClick={() => setBetAmount(prev => Math.max(0.1, prev / 2))}
          >
            ½
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-zinc-800 border-zinc-700"
            onClick={() => setBetAmount(prev => Math.min(450000, prev * 2))}
          >
            2x
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-zinc-800 border-zinc-700"
            onClick={() => setBetAmount(balance)}
          >
            MAX
          </Button>
        </div>
      </div>

      {/* Bet Buttons */}
      <div className="grid grid-cols-3 gap-3">
        {(["red", "black", "white"] as DoubleColor[]).map(color => {
          const myBet = myBets.get(color) || 0;
          const disabled = phase !== "betting";
          return (
            <motion.button
              key={color}
              whileTap={!disabled ? { scale: 0.95 } : undefined}
              disabled={disabled}
              onClick={() => handleBet(color)}
              className={cn(
                "relative rounded-xl p-4 flex flex-col items-center gap-1 border-2 transition-all",
                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95",
                color === "red" && "bg-red-600/20 border-red-600/40 hover:border-red-500",
                color === "black" && "bg-zinc-800/40 border-zinc-600/40 hover:border-zinc-500",
                color === "white" && "bg-emerald-50/10 border-emerald-300/40 hover:border-emerald-300",
                myBet > 0 && "ring-2 ring-amber-400"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center font-bold",
                  COLOR_MAP[color],
                  COLOR_TEXT[color]
                )}
              >
                {color === "white" ? "⭐" : color === "red" ? "🔴" : "⚫"}
              </div>
              <span className="text-xs font-semibold text-foreground">
                {COLOR_LABEL[color]}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {MULTIPLIER[color]} · {colorPercentages[color]}%
              </span>
              {myBet > 0 && (
                <span className="text-[10px] text-amber-400 font-bold">
                  R$ {myBet.toFixed(2)}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Live Bets */}
      {bets.length > 0 && (
        <div className="bg-zinc-200 rounded-xl p-3 border border-zinc-300">
          <p className="text-xs text-zinc-800 mb-2 font-semibold">
            Apostas desta rodada ({bets.length})
          </p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(["red", "black", "white"] as DoubleColor[]).map(color => (
              <div key={color} className="text-center">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full mx-auto mb-1",
                    COLOR_MAP[color]
                  )}
                />
                <p className="text-xs font-bold text-zinc-900">
                  R$ {betsByColor[color].total.toFixed(2)}
                </p>
                <p className="text-[10px] text-zinc-700">
                  {betsByColor[color].count} aposta(s)
                </p>
              </div>
            ))}
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {bets.slice(-10).reverse().map(bet => (
              <div
                key={bet.id}
                className="flex items-center gap-2 text-xs py-1 border-b border-zinc-300 last:border-0"
              >
                <div
                  className={cn(
                    "w-3 h-3 rounded-full flex-shrink-0",
                    COLOR_MAP[bet.bet_color as DoubleColor]
                  )}
                />
                <span className="flex-1 truncate text-zinc-700">
                  {bet.user_name}
                </span>
                <span className="font-bold text-zinc-900">
                  R$ {Number(bet.bet_amount).toFixed(2)}
                </span>
                {bet.payout && (
                  <span className="text-emerald-600 font-bold">
                    +R$ {Number(bet.payout).toFixed(2)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
