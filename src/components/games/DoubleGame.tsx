import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Minus, Plus, ChevronDown, Trophy, Repeat } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDouble, buildRouletteStrip, DoubleColor } from "@/hooks/useDouble";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import sucenaLogo from "@/assets/logo-sucena-double.png";

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
    currentRoundId,
  } = useDouble();

  // Dual bet slots
  const [bet1Amount, setBet1Amount] = useState(1);
  const [bet1Color, setBet1Color] = useState<DoubleColor | null>(null);
  const [bet2Amount, setBet2Amount] = useState(1);
  const [bet2Color, setBet2Color] = useState<DoubleColor | null>(null);
  const [bet2Enabled, setBet2Enabled] = useState(false);
  const [activeBetSlot, setActiveBetSlot] = useState<1 | 2>(1);
  const [showRanking, setShowRanking] = useState(false);

  // Auto-bet state
  const [autoBetActive, setAutoBetActive] = useState(false);
  const [autoBetRounds, setAutoBetRounds] = useState(5);
  const [autoBetRemaining, setAutoBetRemaining] = useState(0);
  const autoBetRef = useRef({
    active: false,
    bet1: { color: null as DoubleColor | null, amount: 0 },
    bet2: { color: null as DoubleColor | null, amount: 0 },
    bet2Enabled: false,
    remaining: 0,
  });
  

  const { data: balanceRanking = [] } = useQuery({
    queryKey: ["double-balance-ranking"],
    queryFn: async () => {
      const { data: balances } = await supabase
        .from("double_balances")
        .select("user_id, balance")
        .order("balance", { ascending: false })
        .limit(10);
      if (!balances?.length) return [];
      const userIds = balances.map(b => b.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      return balances.map(b => ({
        ...b,
        name: profileMap.get(b.user_id)?.full_name || "Jogador",
        avatar_url: profileMap.get(b.user_id)?.avatar_url,
      }));
    },
    refetchInterval: 10000,
  });

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

  const handleColorToggle = (color: DoubleColor) => {
    if (phase !== "betting") return;
    if (activeBetSlot === 1) {
      setBet1Color(prev => (prev === color ? null : color));
    } else {
      setBet2Color(prev => (prev === color ? null : color));
    }
  };

  const handleConfirmBet = async (slot: 1 | 2) => {
    const color = slot === 1 ? bet1Color : bet2Color;
    const amount = slot === 1 ? bet1Amount : bet2Amount;
    if (!color || phase !== "betting") return;
    await placeBet(color, amount);
  };

  // Auto-bet: place bets when a NEW round starts (currentRoundId changes while phase is betting)
  const prevRoundIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentRoundId || currentRoundId === prevRoundIdRef.current) return;
    prevRoundIdRef.current = currentRoundId;

    if (phase !== "betting") return;
    if (!autoBetRef.current.active) return;

    const ref = autoBetRef.current;
    if (ref.remaining <= 0) {
      autoBetRef.current.active = false;
      setAutoBetActive(false);
      setAutoBetRemaining(0);
      return;
    }
    const timer = setTimeout(async () => {
      if (!autoBetRef.current.active) return;
      // Place bet 1
      if (ref.bet1.color) {
        await placeBet(ref.bet1.color, ref.bet1.amount);
      }
      // Place bet 2
      if (ref.bet2Enabled && ref.bet2.color) {
        await placeBet(ref.bet2.color, ref.bet2.amount);
      }
      autoBetRef.current.remaining -= 1;
      setAutoBetRemaining(autoBetRef.current.remaining);
      if (autoBetRef.current.remaining <= 0) {
        autoBetRef.current.active = false;
        setAutoBetActive(false);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [currentRoundId, phase, placeBet]);

  const startAutoBet = () => {
    if (!bet1Color || autoBetRounds <= 0) return;
    autoBetRef.current = {
      active: true,
      bet1: { color: bet1Color, amount: bet1Amount },
      bet2: { color: bet2Color, amount: bet2Amount },
      bet2Enabled,
      remaining: autoBetRounds,
    };
    setAutoBetActive(true);
    setAutoBetRemaining(autoBetRounds);
    // Place immediately if currently betting
    if (phase === "betting") {
      (async () => {
        if (bet1Color) await placeBet(bet1Color, bet1Amount);
        if (bet2Enabled && bet2Color) await placeBet(bet2Color, bet2Amount);
        autoBetRef.current.remaining -= 1;
        setAutoBetRemaining(autoBetRef.current.remaining);
        if (autoBetRef.current.remaining <= 0) {
          autoBetRef.current.active = false;
          setAutoBetActive(false);
        }
      })();
    }
  };

  const stopAutoBet = () => {
    autoBetRef.current.active = false;
    setAutoBetActive(false);
    setAutoBetRemaining(0);
  };

  const adjustAmount = (slot: 1 | 2, delta: number) => {
    const setter = slot === 1 ? setBet1Amount : setBet2Amount;
    setter(prev => Math.max(0.1, Math.round((prev + delta) * 100) / 100));
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
                    {cell.color === "white" ? <img src={sucenaLogo} alt="Sucena" className="w-10 h-10 object-contain" /> : cell.number}
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
            {h.color === "white" ? <img src={sucenaLogo} alt="S" className="w-4 h-4 object-contain" /> : h.number}
          </motion.div>
        ))}
      </div>

      {/* Bet Buttons (color selection) */}
      <div className="grid grid-cols-3 gap-3">
        {(["red", "black", "white"] as DoubleColor[]).map(color => {
          const myBet = myBets.get(color) || 0;
          const disabled = phase !== "betting";
          const selectedColor = activeBetSlot === 1 ? bet1Color : bet2Color;
          const isBet1 = bet1Color === color;
          const isBet2 = bet2Enabled && bet2Color === color;
          return (
            <motion.button
              key={color}
              whileTap={!disabled ? { scale: 0.95 } : undefined}
              disabled={disabled}
              onClick={() => handleColorToggle(color)}
              className={cn(
                "relative rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 transition-all",
                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                color === "red" && "bg-red-600",
                color === "black" && "bg-zinc-800",
                color === "white" && "bg-emerald-500",
                selectedColor === color && "ring-4 ring-amber-400",
                myBet > 0 && selectedColor !== color && "ring-2 ring-amber-400/60"
              )}
            >
              {/* Slot indicators */}
              <div className="absolute top-1 right-1 flex gap-0.5">
                {isBet1 && <span className="text-[8px] bg-white/90 text-zinc-900 rounded px-1 font-bold">A1</span>}
                {isBet2 && <span className="text-[8px] bg-amber-400 text-zinc-900 rounded px-1 font-bold">A2</span>}
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-white/80 flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {color === "white" ? <img src={sucenaLogo} alt="Sucena" className="w-6 h-6 object-contain" /> : color === "red" ? "🔴" : "⚫"}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-white/90">
                {COLOR_LABEL[color]} · {MULTIPLIER[color]}
              </span>
              <span className="text-[9px] text-white/60">
                {colorPercentages[color]}%
              </span>
              {myBet > 0 && (
                <span className="text-[9px] text-amber-300 font-bold">
                  R$ {myBet.toFixed(2)}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
      {/* Hint when bet2 enabled but no color selected */}
      {bet2Enabled && !bet2Color && activeBetSlot === 2 && (
        <p className="text-xs text-amber-600 text-center animate-pulse">👆 Selecione uma cor para a Aposta 2</p>
      )}

      {/* Bet Slot Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeBetSlot === 1 ? "default" : "outline"}
          size="sm"
          className="flex-1"
          onClick={() => setActiveBetSlot(1)}
        >
          Aposta 1 {bet1Color ? `(${COLOR_LABEL[bet1Color]})` : ""}
        </Button>
        <Button
          variant={activeBetSlot === 2 ? "default" : "outline"}
          size="sm"
          className={cn("flex-1", !bet2Enabled && "opacity-50")}
          onClick={() => { setBet2Enabled(true); setActiveBetSlot(2); }}
        >
          Aposta 2 {bet2Enabled && bet2Color ? `(${COLOR_LABEL[bet2Color]})` : bet2Enabled ? "" : "+ Adicionar"}
        </Button>
      </div>

      {/* Bet Amount for active slot */}
      <div className="bg-zinc-200 rounded-xl p-3 border border-zinc-300">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-zinc-800 font-semibold">
            Valor — Aposta {activeBetSlot}
            {(activeBetSlot === 1 ? bet1Color : bet2Color) && (
              <span className="ml-1 text-[10px] text-zinc-500">
                ({COLOR_LABEL[(activeBetSlot === 1 ? bet1Color : bet2Color)!]})
              </span>
            )}
          </p>
          {activeBetSlot === 2 && bet2Enabled && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] text-red-600 hover:text-red-700"
              onClick={() => { setBet2Enabled(false); setBet2Color(null); setActiveBetSlot(1); }}
            >
              Remover
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 bg-zinc-300 border-zinc-400 text-zinc-900"
            onClick={() => adjustAmount(activeBetSlot, -1)}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={activeBetSlot === 1 ? bet1Amount : bet2Amount}
            onChange={e => {
              const v = parseFloat(e.target.value);
              const setter = activeBetSlot === 1 ? setBet1Amount : setBet2Amount;
              if (!isNaN(v) && v >= 0) setter(v);
            }}
            className="flex-1 bg-zinc-300 rounded-lg px-4 py-2 text-center text-lg font-bold text-zinc-900 outline-none border border-zinc-400 focus:ring-2 focus:ring-primary"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 bg-zinc-300 border-zinc-400 text-zinc-900"
            onClick={() => adjustAmount(activeBetSlot, 1)}
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
              className="flex-1 text-xs bg-zinc-300 border-zinc-400 text-zinc-900 hover:bg-zinc-400"
              onClick={() => (activeBetSlot === 1 ? setBet1Amount : setBet2Amount)(v)}
            >
              {v}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <Button variant="outline" size="sm" className="flex-1 bg-zinc-300 border-zinc-400 text-zinc-900"
            onClick={() => (activeBetSlot === 1 ? setBet1Amount : setBet2Amount)(prev => Math.max(0.1, prev / 2))}>½</Button>
          <Button variant="outline" size="sm" className="flex-1 bg-zinc-300 border-zinc-400 text-zinc-900"
            onClick={() => (activeBetSlot === 1 ? setBet1Amount : setBet2Amount)(prev => Math.min(450000, prev * 2))}>2x</Button>
          <Button variant="outline" size="sm" className="flex-1 bg-zinc-300 border-zinc-400 text-zinc-900"
            onClick={() => (activeBetSlot === 1 ? setBet1Amount : setBet2Amount)(balance)}>MAX</Button>
        </div>
      </div>

      {/* Confirm Bet Buttons */}
      {phase === "betting" && (
        <div className="space-y-2">
          {bet1Color && (
            <Button
              className={cn(
                "w-full text-white font-bold py-3 text-base",
                bet1Color === "red" && "bg-red-600 hover:bg-red-700",
                bet1Color === "black" && "bg-zinc-800 hover:bg-zinc-900",
                bet1Color === "white" && "bg-emerald-500 hover:bg-emerald-600"
              )}
              onClick={() => handleConfirmBet(1)}
            >
              Aposta 1: R$ {bet1Amount.toFixed(2)} no {COLOR_LABEL[bet1Color]}
            </Button>
          )}
          {bet2Enabled && bet2Color && (
            <Button
              className={cn(
                "w-full text-white font-bold py-3 text-base",
                bet2Color === "red" && "bg-red-600 hover:bg-red-700",
                bet2Color === "black" && "bg-zinc-800 hover:bg-zinc-900",
                bet2Color === "white" && "bg-emerald-500 hover:bg-emerald-600"
              )}
              onClick={() => handleConfirmBet(2)}
            >
              Aposta 2: R$ {bet2Amount.toFixed(2)} no {COLOR_LABEL[bet2Color]}
            </Button>
          )}
        </div>
      )}

      {/* Auto-Bet Panel */}
      <div className="bg-zinc-200 rounded-xl p-3 border border-zinc-300">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
            <Repeat className="w-3.5 h-3.5" /> Auto-Aposta
          </span>
          {autoBetActive && (
            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold animate-pulse">
              {autoBetRemaining} restante(s)
            </span>
          )}
        </div>
        {autoBetActive && (
          <div className="text-[10px] text-zinc-600 mb-2 space-y-0.5">
            <p>🎯 Aposta 1: R$ {autoBetRef.current.bet1.amount.toFixed(2)} no {autoBetRef.current.bet1.color ? COLOR_LABEL[autoBetRef.current.bet1.color] : "—"}</p>
            {autoBetRef.current.bet2Enabled && autoBetRef.current.bet2.color && (
              <p>🎯 Aposta 2: R$ {autoBetRef.current.bet2.amount.toFixed(2)} no {COLOR_LABEL[autoBetRef.current.bet2.color]}</p>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-zinc-600 whitespace-nowrap">Rodadas:</span>
          <div className="flex items-center gap-1 flex-1">
            <Button variant="outline" size="icon" className="h-7 w-7 bg-zinc-300 border-zinc-400 text-zinc-900"
              onClick={() => setAutoBetRounds(prev => Math.max(1, prev - 1))} disabled={autoBetActive}>
              <Minus className="w-3 h-3" />
            </Button>
            <input type="number" min={1} max={100} value={autoBetRounds}
              onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) setAutoBetRounds(v); }}
              disabled={autoBetActive}
              className="flex-1 bg-zinc-300 rounded-md px-2 py-1 text-center text-sm font-bold text-zinc-900 outline-none border border-zinc-400 focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            <Button variant="outline" size="icon" className="h-7 w-7 bg-zinc-300 border-zinc-400 text-zinc-900"
              onClick={() => setAutoBetRounds(prev => Math.min(100, prev + 1))} disabled={autoBetActive}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2 mb-2">
          {[3, 5, 10, 20].map(v => (
            <Button key={v} variant="outline" size="sm"
              className="flex-1 text-xs bg-zinc-300 border-zinc-400 text-zinc-900 hover:bg-zinc-400"
              onClick={() => setAutoBetRounds(v)} disabled={autoBetActive}>
              {v}x
            </Button>
          ))}
        </div>
        {!autoBetActive ? (
          <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold"
            onClick={startAutoBet} disabled={!bet1Color}>
            Iniciar Auto-Aposta{bet2Enabled && bet2Color ? " (2 apostas)" : ""}
          </Button>
        ) : (
          <Button className="w-full bg-zinc-700 hover:bg-zinc-800 text-white font-bold" onClick={stopAutoBet}>
            Parar Auto-Aposta ({autoBetRemaining})
          </Button>
        )}
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

      {/* Balance Ranking */}
      <div className="bg-zinc-200 rounded-xl border border-zinc-300 overflow-hidden">
        <button
          onClick={() => setShowRanking(prev => !prev)}
          className="w-full flex items-center justify-between p-3 text-zinc-900 font-semibold text-sm"
        >
          <span className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Ranking de Saldo
          </span>
          <ChevronDown className={cn("w-4 h-4 transition-transform", showRanking && "rotate-180")} />
        </button>
        <AnimatePresence>
          {showRanking && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 space-y-1.5">
                {balanceRanking.map((player, i) => (
                  <div
                    key={player.user_id}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
                      i === 0 ? "bg-amber-100 border border-amber-300" :
                      i === 1 ? "bg-zinc-100 border border-zinc-300" :
                      i === 2 ? "bg-orange-50 border border-orange-200" :
                      "bg-white border border-zinc-200"
                    )}
                  >
                    <span className="font-bold text-zinc-500 w-5 text-center">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`}
                    </span>
                    {player.avatar_url ? (
                      <img src={player.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-zinc-300 flex items-center justify-center text-[10px] font-bold text-zinc-600">
                        {player.name.charAt(0)}
                      </div>
                    )}
                    <span className="flex-1 truncate font-medium text-zinc-800">
                      {player.name.split(" ")[0]}
                    </span>
                    <span className="font-bold text-emerald-600">
                      R$ {Number(player.balance).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
                {balanceRanking.length === 0 && (
                  <p className="text-xs text-zinc-500 text-center py-2">Nenhum jogador ainda</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
