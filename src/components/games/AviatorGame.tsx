import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plane, TrendingUp, Wallet, History, Rocket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAviator, AviatorPhase } from "@/hooks/useAviator";

interface AviatorGameProps {
  onBack: () => void;
}

// Airplane SVG component
function AirplaneSVG({ phase }: { phase: AviatorPhase }) {
  return (
    <motion.div
      className="relative"
      animate={phase === "crashed" ? { rotate: 90, y: 40, opacity: 0.5 } : { rotate: -15 }}
      transition={{ duration: phase === "crashed" ? 0.5 : 0.3 }}
    >
      <Rocket className="w-12 h-12 text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.6)]" />
    </motion.div>
  );
}

// Animated cloud
function Cloud({ delay, size, y }: { delay: number; size: number; y: number }) {
  return (
    <motion.div
      className="absolute text-white/5 pointer-events-none select-none"
      style={{ top: `${y}%`, fontSize: `${size}px` }}
      initial={{ right: "-10%" }}
      animate={{ right: "110%" }}
      transition={{ duration: 8 + delay * 2, repeat: Infinity, ease: "linear", delay }}
    >
      ☁️
    </motion.div>
  );
}

// Crash history dot
function CrashDot({ value }: { value: number }) {
  const color = value < 1.5 ? "bg-red-500" : value < 3 ? "bg-amber-500" : value < 10 ? "bg-emerald-500" : "bg-purple-500";
  return (
    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${color}`}>
      {value.toFixed(2)}x
    </span>
  );
}

export function AviatorGame({ onBack }: AviatorGameProps) {
  const {
    phase, multiplier, lastCrash, crashHistory,
    waitCountdown, balance, currentBet, roundBets,
    isProcessing, placeBet, cashOut,
  } = useAviator();

  const [betAmount, setBetAmount] = useState("10");
  const [autoCashout, setAutoCashout] = useState("");
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);
  const [autoBetEnabled, setAutoBetEnabled] = useState(false);
  const autoCashoutRef = useRef(autoCashout);
  autoCashoutRef.current = autoCashout;

  // Auto cashout logic
  useEffect(() => {
    if (
      phase === "running" &&
      autoCashoutEnabled &&
      autoCashoutRef.current &&
      currentBet &&
      !currentBet.cashed_out_at
    ) {
      const target = parseFloat(autoCashoutRef.current);
      if (!isNaN(target) && multiplier >= target) {
        cashOut();
      }
    }
  }, [multiplier, phase, currentBet, autoCashoutEnabled, cashOut]);

  // Auto bet logic
  useEffect(() => {
    if (phase === "waiting" && autoBetEnabled && !currentBet) {
      const amount = parseFloat(betAmount);
      if (!isNaN(amount) && amount > 0) {
        const t = setTimeout(() => placeBet(amount), 500);
        return () => clearTimeout(t);
      }
    }
  }, [phase, autoBetEnabled, currentBet, betAmount, placeBet]);

  const handleBet = () => {
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) return;
    placeBet(amount);
  };

  const multiplierColor =
    phase === "crashed"
      ? "text-red-500"
      : multiplier < 2
      ? "text-white"
      : multiplier < 5
      ? "text-emerald-400"
      : "text-yellow-400";

  const graphHeight = Math.min(80, ((multiplier - 1) / 10) * 80);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Rocket className="w-6 h-6 text-red-500" />
        <h1 className="text-xl font-bold text-foreground">Aviator</h1>
        <div className="ml-auto flex items-center gap-2">
          <Wallet className="w-4 h-4 text-emerald-500" />
          <span className="font-bold text-emerald-500">R$ {balance.toFixed(2)}</span>
        </div>
      </div>

      {/* Crash History */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {crashHistory.slice(0, 15).map((c, i) => (
          <CrashDot key={i} value={c} />
        ))}
      </div>

      {/* Game Display */}
      <Card className="border-0 overflow-hidden">
        <CardContent className="p-0">
          <div
            className="relative w-full h-[280px] md:h-[340px] overflow-hidden"
            style={{
              background: "linear-gradient(180deg, #0c0e1a 0%, #141629 40%, #1a1f3d 100%)",
            }}
          >
            {/* Stars */}
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-px h-px bg-white/40 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 60}%`,
                  width: `${1 + Math.random() * 2}px`,
                  height: `${1 + Math.random() * 2}px`,
                }}
              />
            ))}

            {/* Clouds */}
            {phase === "running" && (
              <>
                <Cloud delay={0} size={40} y={30} />
                <Cloud delay={2} size={30} y={50} />
                <Cloud delay={4} size={50} y={20} />
                <Cloud delay={6} size={35} y={60} />
              </>
            )}

            {/* Growth curve line */}
            {phase === "running" && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <motion.path
                  d={`M 40 ${280 - 40} Q ${40 + graphHeight * 2} ${280 - 40 - graphHeight * 2} ${40 + graphHeight * 3} ${280 - 40 - graphHeight * 3}`}
                  stroke="rgba(239,68,68,0.4)"
                  strokeWidth="2"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5 }}
                />
              </svg>
            )}

            {/* Airplane */}
            <motion.div
              className="absolute"
              animate={{
                bottom: phase === "running" ? `${20 + graphHeight}%` : phase === "crashed" ? "10%" : "20%",
                left: phase === "running" ? `${15 + Math.min(graphHeight, 50)}%` : "15%",
              }}
              transition={{ type: "tween", duration: 0.3 }}
            >
              <AirplaneSVG phase={phase} />
              
              {/* Trail */}
              {phase === "running" && (
                <motion.div
                  className="absolute -left-8 top-1/2 -translate-y-1/2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="w-8 h-1 bg-gradient-to-l from-red-500/60 to-transparent rounded-full" />
                  <div className="w-6 h-0.5 bg-gradient-to-l from-orange-500/40 to-transparent rounded-full mt-0.5" />
                </motion.div>
              )}
            </motion.div>

            {/* Multiplier */}
            <div className="absolute inset-0 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {phase === "waiting" ? (
                  <motion.div
                    key="waiting"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="text-center"
                  >
                    <p className="text-white/60 text-sm mb-1">Próxima rodada em</p>
                    <p className="text-5xl font-black text-white tabular-nums">{waitCountdown}s</p>
                    <p className="text-white/40 text-xs mt-2">Faça sua aposta!</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="multiplier"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center"
                  >
                    <motion.p
                      className={`text-6xl md:text-7xl font-black tabular-nums ${multiplierColor}`}
                      animate={phase === "crashed" ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      {multiplier.toFixed(2)}x
                    </motion.p>
                    {phase === "crashed" && (
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-400 font-bold text-lg mt-2"
                      >
                        CRASHED!
                      </motion.p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Phase badge */}
            <div className="absolute top-3 left-3">
              <Badge
                className={`text-xs border-0 ${
                  phase === "waiting"
                    ? "bg-amber-500/20 text-amber-400"
                    : phase === "running"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {phase === "waiting" ? "⏳ Aguardando" : phase === "running" ? "🚀 Em Voo" : "💥 Crash"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Betting Controls */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* Bet Amount */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">Valor da Aposta</Label>
              <div className="flex gap-1">
                <Input
                  type="number"
                  value={betAmount}
                  onChange={e => setBetAmount(e.target.value)}
                  className="h-10 text-center font-bold"
                  min="1"
                  step="5"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1 pt-5">
              {[5, 10, 50, 100].map(v => (
                <Button
                  key={v}
                  size="sm"
                  variant="outline"
                  className="h-5 text-[10px] px-2"
                  onClick={() => setBetAmount(String(v))}
                >
                  {v}
                </Button>
              ))}
            </div>
          </div>

          {/* Quick amounts */}
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="flex-1 text-xs" onClick={() => setBetAmount(String(Math.floor(balance / 2)))}>
              ½
            </Button>
            <Button size="sm" variant="ghost" className="flex-1 text-xs" onClick={() => setBetAmount(String(Math.floor(balance)))}>
              MAX
            </Button>
            <Button size="sm" variant="ghost" className="flex-1 text-xs" onClick={() => setBetAmount(String(Math.max(1, Math.floor(parseFloat(betAmount) * 2))))}>
              2x
            </Button>
          </div>

          {/* Main Action Button */}
          {phase === "waiting" && !currentBet && (
            <Button
              onClick={handleBet}
              disabled={isProcessing}
              className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <TrendingUp className="w-5 h-5 mr-2" />
              APOSTAR R$ {parseFloat(betAmount || "0").toFixed(2)}
            </Button>
          )}

          {phase === "waiting" && currentBet && (
            <Button disabled className="w-full h-14 text-lg font-bold bg-amber-600/80 text-white">
              ⏳ Aposta feita — Aguardando...
            </Button>
          )}

          {phase === "running" && currentBet && !currentBet.cashed_out_at && (
            <Button
              onClick={cashOut}
              disabled={isProcessing}
              className="w-full h-14 text-lg font-bold bg-red-600 hover:bg-red-700 text-white animate-pulse"
            >
              💰 RETIRAR R$ {(parseFloat(betAmount) * multiplier).toFixed(2)}
            </Button>
          )}

          {phase === "running" && currentBet && currentBet.cashed_out_at && (
            <Button disabled className="w-full h-14 text-lg font-bold bg-emerald-700/80 text-white">
              ✅ Retirou em {currentBet.cashed_out_at.toFixed(2)}x — R$ {(currentBet.payout || 0).toFixed(2)}
            </Button>
          )}

          {phase === "running" && !currentBet && (
            <Button disabled className="w-full h-14 text-lg font-bold opacity-50">
              Aguarde a próxima rodada...
            </Button>
          )}

          {phase === "crashed" && (
            <Button disabled className="w-full h-14 text-lg font-bold bg-zinc-700 text-zinc-400">
              💥 Crash em {lastCrash?.toFixed(2)}x — Próxima rodada...
            </Button>
          )}

          {/* Auto options */}
          <div className="flex gap-4 items-center pt-1">
            <div className="flex items-center gap-2">
              <Switch checked={autoBetEnabled} onCheckedChange={setAutoBetEnabled} id="auto-bet" />
              <Label htmlFor="auto-bet" className="text-xs">Auto Aposta</Label>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <Switch checked={autoCashoutEnabled} onCheckedChange={setAutoCashoutEnabled} id="auto-cashout" />
              <Label htmlFor="auto-cashout" className="text-xs">Auto Retirar</Label>
              {autoCashoutEnabled && (
                <Input
                  type="number"
                  value={autoCashout}
                  onChange={e => setAutoCashout(e.target.value)}
                  placeholder="2.00"
                  className="h-7 w-20 text-xs text-center"
                  min="1.01"
                  step="0.1"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current round bets */}
      {roundBets.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Apostas desta Rodada</span>
            </div>
            <div className="space-y-1.5">
              {roundBets.map(bet => (
                <div key={bet.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30">
                  <span className="font-medium">{bet.user_name}</span>
                  <span className="text-muted-foreground">R$ {bet.bet_amount.toFixed(2)}</span>
                  {bet.cashed_out_at ? (
                    <Badge className="bg-emerald-500/20 text-emerald-500 border-0 text-[10px]">
                      {bet.cashed_out_at.toFixed(2)}x → R$ {(bet.payout || 0).toFixed(2)}
                    </Badge>
                  ) : phase === "crashed" ? (
                    <Badge className="bg-red-500/20 text-red-500 border-0 text-[10px]">Perdeu</Badge>
                  ) : (
                    <Badge className="bg-amber-500/20 text-amber-500 border-0 text-[10px]">Em jogo</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
