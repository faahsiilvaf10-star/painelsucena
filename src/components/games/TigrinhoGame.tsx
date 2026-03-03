import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Minus, Plus, History, Play, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTigrinho } from "@/hooks/useTigrinho";

const SPIN_SYMBOLS = ["🐯", "💰", "🧧", "🏮", "🔥", "💎", "🍊", "⭐"];

interface TigrinhoGameProps {
  onBack: () => void;
}

export function TigrinhoGame({ onBack }: TigrinhoGameProps) {
  const { balance, betAmount, setBetAmount, spinning, lastResult, play, history } = useTigrinho();
  const [showHistory, setShowHistory] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [displayGrid, setDisplayGrid] = useState<string[][]>(() =>
    Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => SPIN_SYMBOLS[Math.floor(Math.random() * SPIN_SYMBOLS.length)]))
  );
  const [animatingCols, setAnimatingCols] = useState<boolean[]>([false, false, false]);
  const autoPlayRef = useRef(autoPlay);

  useEffect(() => { autoPlayRef.current = autoPlay; }, [autoPlay]);

  // Animate spinning columns
  useEffect(() => {
    if (!spinning) return;
    setAnimatingCols([true, true, true]);
    const intervals = [0, 1, 2].map((col) => {
      return setInterval(() => {
        setDisplayGrid((prev) => {
          const next = prev.map((r) => [...r]);
          for (let row = 0; row < 3; row++) {
            next[row][col] = SPIN_SYMBOLS[Math.floor(Math.random() * SPIN_SYMBOLS.length)];
          }
          return next;
        });
      }, 80 + col * 20);
    });

    // Stop columns sequentially
    const timers = [0, 1, 2].map((col) =>
      setTimeout(() => {
        clearInterval(intervals[col]);
        setAnimatingCols((prev) => { const n = [...prev]; n[col] = false; return n; });
      }, 1200 + col * 300)
    );

    return () => {
      intervals.forEach(clearInterval);
      timers.forEach(clearTimeout);
    };
  }, [spinning]);

  // Set final result
  useEffect(() => {
    if (lastResult) {
      setDisplayGrid(lastResult.symbols);
    }
  }, [lastResult]);

  // Auto play
  useEffect(() => {
    if (!autoPlay || spinning) return;
    const t = setTimeout(() => {
      if (autoPlayRef.current) play();
    }, 1500);
    return () => clearTimeout(t);
  }, [autoPlay, spinning, play]);

  const isWin = lastResult && lastResult.multiplier > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { setAutoPlay(false); onBack(); }}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">🐯 Tigrinho</h2>
          <p className="text-xs text-muted-foreground">Fortune Tiger</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
          <History className="w-4 h-4 mr-1" /> Histórico
        </Button>
      </div>

      {/* Balance */}
      <Card className="p-4 bg-gradient-to-r from-amber-500/20 to-red-500/20 border-amber-500/30">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Saldo</span>
          <span className="text-2xl font-bold text-amber-500">{balance.toLocaleString()} 🪙</span>
        </div>
      </Card>

      {/* Slot Machine */}
      <Card className="p-6 bg-gradient-to-b from-red-900/30 via-amber-900/20 to-red-900/30 border-amber-600/40 relative overflow-hidden">
        {/* Tiger decoration */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-5xl z-10 select-none">
          <motion.span
            animate={isWin ? { scale: [1, 1.3, 1], rotate: [0, -10, 10, 0] } : {}}
            transition={{ duration: 0.6, repeat: isWin ? 3 : 0 }}
          >
            🐯
          </motion.span>
        </div>

        <div className="pt-10">
          {/* Reel Grid */}
          <div className="bg-black/40 rounded-xl p-4 border-2 border-amber-500/50 shadow-[inset_0_0_30px_rgba(245,158,11,0.1)]">
            <div className="grid grid-cols-3 gap-2">
              {displayGrid.map((row, ri) =>
                row.map((symbol, ci) => (
                  <motion.div
                    key={`${ri}-${ci}`}
                    className={`aspect-square flex items-center justify-center rounded-lg text-3xl md:text-4xl font-bold
                      ${isWin && lastResult?.symbols[ri]?.every((s) => s === lastResult.symbols[ri][0]) && ri === 1
                        ? "bg-amber-500/30 ring-2 ring-amber-400"
                        : "bg-black/30"
                      }`}
                    animate={animatingCols[ci] ? { y: [0, -8, 8, 0] } : {}}
                    transition={{ duration: 0.08, repeat: animatingCols[ci] ? Infinity : 0 }}
                  >
                    {symbol}
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Result */}
          <AnimatePresence>
            {lastResult && !spinning && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={`mt-3 text-center text-lg font-bold ${isWin ? "text-amber-400" : "text-muted-foreground"}`}
              >
                {isWin ? `🎉 x${lastResult.multiplier} — +${lastResult.payout} moedas!` : "Tente novamente!"}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Win coins animation */}
        <AnimatePresence>
          {isWin && !spinning && (
            <>
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={`coin-${i}`}
                  className="absolute text-2xl pointer-events-none"
                  initial={{ opacity: 1, x: `${20 + Math.random() * 60}%`, y: "-10%" }}
                  animate={{ y: "110%", opacity: 0, rotate: 360 }}
                  transition={{ duration: 1.5 + Math.random(), delay: i * 0.1 }}
                >
                  🪙
                </motion.div>
              ))}
            </>
          )}
        </AnimatePresence>
      </Card>

      {/* Bet Controls */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Aposta</span>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" className="h-8 w-8" disabled={spinning} onClick={() => setBetAmount(Math.max(5, betAmount - 5))}>
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-lg font-bold w-16 text-center">{betAmount}</span>
            <Button size="icon" variant="outline" className="h-8 w-8" disabled={spinning} onClick={() => setBetAmount(Math.min(balance, betAmount + 5))}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          {[10, 25, 50, 100].map((v) => (
            <Button key={v} size="sm" variant={betAmount === v ? "default" : "outline"} className="flex-1 text-xs" disabled={spinning} onClick={() => setBetAmount(Math.min(v, balance))}>
              {v}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button className="flex-1 bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-600 hover:to-red-600 text-white font-bold text-base"
            disabled={spinning || betAmount > balance}
            onClick={play}
          >
            {spinning ? "Girando..." : "🐯 Jogar"}
          </Button>
          <Button variant={autoPlay ? "destructive" : "secondary"} size="icon"
            onClick={() => { if (autoPlay) setAutoPlay(false); else { setAutoPlay(true); play(); } }}
            disabled={spinning && !autoPlay}
          >
            {autoPlay ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
        </div>
      </Card>

      {/* Multiplier Table */}
      <div className="flex gap-2 flex-wrap justify-center">
        {[2, 5, 10, 50, 100].map((m) => (
          <Badge key={m} variant="outline" className="text-xs border-amber-500/40 text-amber-600 dark:text-amber-400">
            x{m}
          </Badge>
        ))}
      </div>

      {/* History */}
      {showHistory && (
        <Card className="p-4 space-y-2 max-h-60 overflow-y-auto">
          <h3 className="text-sm font-semibold text-muted-foreground">Últimas jogadas</h3>
          {history.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma jogada ainda</p>}
          {history.map((h: any) => (
            <div key={h.id} className="flex items-center justify-between text-xs border-b border-border/50 pb-1">
              <span>Aposta: {h.bet_amount}</span>
              <span className={h.multiplier > 0 ? "text-green-500 font-bold" : "text-red-400"}>
                x{h.multiplier} {h.multiplier > 0 ? `+${h.payout}` : ""}
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
