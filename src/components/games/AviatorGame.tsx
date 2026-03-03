import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, TrendingDown, Wallet, History, Rocket, BarChart3, Trophy, Flame, Clock, Target, Zap, ArrowUpDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAviator, AviatorPhase } from "@/hooks/useAviator";

interface AviatorGameProps {
  onBack: () => void;
}

function PropellerPlaneSVG() {
  return (
    <svg width="56" height="32" viewBox="0 0 56 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Fuselage */}
      <ellipse cx="28" cy="16" rx="18" ry="6" fill="#c0392b" />
      {/* Cockpit */}
      <ellipse cx="40" cy="14" rx="6" ry="4" fill="#922b21" />
      {/* Windshield */}
      <ellipse cx="42" cy="13" rx="3" ry="2.5" fill="#1a1a2e" stroke="#e74c3c" strokeWidth="0.5" />
      {/* Top wing */}
      <rect x="18" y="6" width="20" height="3" rx="1.5" fill="#e74c3c" />
      {/* Bottom wing */}
      <rect x="18" y="23" width="20" height="3" rx="1.5" fill="#e74c3c" />
      {/* Tail */}
      <polygon points="10,16 6,6 14,16" fill="#e74c3c" />
      <polygon points="10,16 6,26 14,16" fill="#c0392b" />
      {/* Tail fin */}
      <rect x="6" y="14" width="6" height="4" rx="1" fill="#922b21" />
      {/* Propeller hub */}
      <circle cx="46" cy="16" r="2" fill="#2c2c3e" />
      {/* Propeller blades (animated via CSS) */}
      <g className="animate-spin origin-center" style={{ transformOrigin: '46px 16px' }}>
        <rect x="45" y="4" width="2" height="10" rx="1" fill="#555" />
        <rect x="45" y="18" width="2" height="10" rx="1" fill="#555" />
      </g>
      {/* Landing gear */}
      <line x1="22" y1="26" x2="20" y2="30" stroke="#555" strokeWidth="1.5" />
      <line x1="34" y1="26" x2="36" y2="30" stroke="#555" strokeWidth="1.5" />
      <circle cx="20" cy="30" r="1.5" fill="#333" />
      <circle cx="36" cy="30" r="1.5" fill="#333" />
    </svg>
  );
}

function AviatorFlightCanvas({ phase, multiplier, waitCountdown }: { phase: AviatorPhase; multiplier: number; waitCountdown: number }) {
  const canvasW = 600;
  const canvasH = 300;
  const padX = 40;
  const padY = 40;

  // Progress: 0 at 1x, 1 at ~50x (logarithmic scale for smooth curve)
  const progress = phase === "waiting" ? 0 : Math.min(1, Math.log(multiplier) / Math.log(50));
  const crashProgress = phase === "crashed" ? Math.min(1, Math.log(multiplier) / Math.log(50)) : 0;

  // Generate curve points
  const points = useMemo(() => {
    const p = phase === "crashed" ? crashProgress : progress;
    const numPoints = 60;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= numPoints; i++) {
      const t = (i / numPoints) * p;
      const x = padX + t * (canvasW - padX * 2);
      // Exponential curve upward
      const yNorm = Math.pow(t, 0.6);
      const y = canvasH - padY - yNorm * (canvasH - padY * 2);
      pts.push({ x, y });
    }
    return pts;
  }, [progress, crashProgress, phase]);

  // Build SVG path
  const linePath = points.length > 1
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ")
    : "";

  // Filled area path (from line down to baseline)
  const filledPath = linePath
    ? `${linePath} L ${points[points.length - 1].x} ${canvasH - padY} L ${padX} ${canvasH - padY} Z`
    : "";

  // Plane position
  const planePos = points.length > 0 ? points[points.length - 1] : { x: padX, y: canvasH - padY };

  // Radiating beams
  const beams = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2;
      return { angle, opacity: 0.04 + (i % 3) * 0.02 };
    });
  }, []);

  return (
    <div className="relative w-full h-[260px] md:h-[320px] overflow-hidden rounded-xl" style={{ background: "linear-gradient(135deg, #0a0a1a 0%, #0d1525 30%, #111827 60%, #0a0a14 100%)" }}>
      {/* Radiating light beams */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${canvasW} ${canvasH}`} preserveAspectRatio="xMidYMid slice">
        {beams.map((b, i) => {
          const cx = canvasW * 0.5;
          const cy = canvasH * 0.4;
          const len = 500;
          const spread = 0.08;
          const x1 = cx + Math.cos(b.angle - spread) * len;
          const y1 = cy + Math.sin(b.angle - spread) * len;
          const x2 = cx + Math.cos(b.angle + spread) * len;
          const y2 = cy + Math.sin(b.angle + spread) * len;
          return (
            <polygon
              key={i}
              points={`${cx},${cy} ${x1},${y1} ${x2},${y2}`}
              fill={`rgba(100,180,255,${b.opacity})`}
            />
          );
        })}
      </svg>

      {/* Flight curve */}
      {(phase === "running" || phase === "crashed") && points.length > 1 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${canvasW} ${canvasH}`} preserveAspectRatio="xMidYMid slice">
          {/* Filled area under curve */}
          <motion.path
            d={filledPath}
            fill="rgba(200,30,30,0.35)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
          {/* Curve line */}
          <motion.path
            d={linePath}
            stroke="#e74c3c"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        </svg>
      )}

      {/* Airplane */}
      <motion.div
        className="absolute pointer-events-none"
        style={{ zIndex: 10 }}
        animate={{
          left: `${(planePos.x / canvasW) * 100}%`,
          top: `${(planePos.y / canvasH) * 100}%`,
          rotate: phase === "crashed" ? 45 : -(Math.atan2(progress * 0.6, 1) * 180 / Math.PI),
          opacity: phase === "crashed" ? 0.4 : 1,
        }}
        transition={{ type: "tween", duration: 0.15, ease: "linear" }}
      >
        <div className="relative -translate-x-1/2 -translate-y-1/2">
          <PropellerPlaneSVG />
          {/* Engine trail */}
          {phase === "running" && (
            <div className="absolute -left-6 top-1/2 -translate-y-1/2">
              <div className="w-6 h-1 bg-gradient-to-l from-red-500/60 to-transparent rounded-full" />
              <div className="w-4 h-0.5 bg-gradient-to-l from-orange-400/30 to-transparent rounded-full mt-0.5" />
            </div>
          )}
        </div>
      </motion.div>

      {/* Multiplier / Status overlay */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 20 }}>
        <AnimatePresence mode="wait">
          {phase === "waiting" ? (
            <motion.div key="waiting" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="text-center">
              <p className="text-white/60 text-sm mb-1">Próxima rodada em</p>
              <p className="text-5xl font-black text-white tabular-nums">{waitCountdown}s</p>
              <p className="text-white/40 text-xs mt-2">Faça sua aposta!</p>
            </motion.div>
          ) : (
            <motion.div key="multiplier" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
              <motion.p
                className={`text-6xl md:text-7xl font-black tabular-nums drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] ${phase === "crashed" ? "text-red-500" : "text-white"}`}
                animate={phase === "crashed" ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {multiplier.toFixed(2)}x
              </motion.p>
              {phase === "crashed" && (
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 font-bold text-lg mt-2">
                  CRASHED!
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Phase badge */}
      <div className="absolute top-3 left-3" style={{ zIndex: 20 }}>
        <Badge className={`text-xs border-0 ${phase === "waiting" ? "bg-amber-500/20 text-amber-400" : phase === "running" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
          {phase === "waiting" ? "⏳ Aguardando" : phase === "running" ? "🚀 Em Voo" : "💥 Crash"}
        </Badge>
      </div>
    </div>
  );
}

function CrashDot({ value }: { value: number }) {
  const color = value < 1.5 ? "bg-red-500" : value < 3 ? "bg-amber-500" : value < 10 ? "bg-emerald-500" : "bg-purple-500";
  return (
    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${color}`}>
      {value.toFixed(2)}x
    </span>
  );
}

function StatMini({ icon: Icon, label, value, color = "text-foreground" }: { icon: any; label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
        <p className={`text-xs font-bold ${color} truncate`}>{value}</p>
      </div>
    </div>
  );
}


export function AviatorGame({ onBack }: AviatorGameProps) {
  const {
    phase, multiplier, lastCrash, crashHistory,
    waitCountdown, balance, currentBet, currentBet2, roundBets,
    isProcessing, sessionStats, sessionDuration, betHistory,
    placeBet, placeBet2, cancelBet, cancelBet2, cashOut, cashOut2,
  } = useAviator();

  const [betAmount, setBetAmount] = useState("10");
  const [betAmount2, setBetAmount2] = useState("20");
  const [autoCashout, setAutoCashout] = useState("");
  const [autoCashout2, setAutoCashout2] = useState("");
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);
  const [autoBetEnabled, setAutoBetEnabled] = useState(false);
  const [autoBet2Enabled, setAutoBet2Enabled] = useState(false);
  const [activeTab, setActiveTab] = useState("game");
  const autoCashoutRef = useRef(autoCashout);
  autoCashoutRef.current = autoCashout;
  const autoCashout2Ref = useRef(autoCashout2);
  autoCashout2Ref.current = autoCashout2;

  // Auto cashout - slot 1
  const autoCashoutTriggeredRef = useRef(false);
  const autoCashout2TriggeredRef = useRef(false);
  
  useEffect(() => {
    if (phase === "waiting") {
      autoCashoutTriggeredRef.current = false;
      autoCashout2TriggeredRef.current = false;
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "running" && autoCashoutEnabled && autoCashoutRef.current && currentBet && !currentBet.cashed_out_at && !autoCashoutTriggeredRef.current) {
      const target = parseFloat(autoCashoutRef.current);
      if (!isNaN(target) && target > 1 && multiplier >= target) {
        autoCashoutTriggeredRef.current = true;
        cashOut();
      }
    }
  }, [multiplier, phase, currentBet, autoCashoutEnabled, cashOut]);

  // Auto cashout - slot 2
  useEffect(() => {
    if (phase === "running" && autoCashout2Ref.current && currentBet2 && !currentBet2.cashed_out_at && !autoCashout2TriggeredRef.current) {
      const target = parseFloat(autoCashout2Ref.current);
      if (!isNaN(target) && target > 1 && multiplier >= target) {
        autoCashout2TriggeredRef.current = true;
        cashOut2();
      }
    }
  }, [multiplier, phase, currentBet2, cashOut2]);

  // Auto bet
  useEffect(() => {
    if (phase === "waiting" && autoBetEnabled && !currentBet) {
      const amount = parseFloat(betAmount);
      if (!isNaN(amount) && amount > 0) {
        const t = setTimeout(() => placeBet(amount), 500);
        return () => clearTimeout(t);
      }
    }
  }, [phase, autoBetEnabled, currentBet, betAmount, placeBet]);

  // Auto bet - slot 2
  useEffect(() => {
    if (phase === "waiting" && autoBet2Enabled && !currentBet2) {
      const amount = parseFloat(betAmount2);
      if (!isNaN(amount) && amount > 0) {
        const t = setTimeout(() => placeBet2(amount), 700);
        return () => clearTimeout(t);
      }
    }
  }, [phase, autoBet2Enabled, currentBet2, betAmount2, placeBet2]);

  const handleBet = () => {
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) return;
    placeBet(amount);
  };

  const handleBet2 = () => {
    const amount = parseFloat(betAmount2);
    if (isNaN(amount) || amount <= 0) return;
    placeBet2(amount);
  };


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

      {/* Quick session stats bar */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide text-[10px]">
        <Badge variant="outline" className="gap-1 shrink-0">
          <Target className="w-3 h-3" /> {sessionStats.roundsPlayed} rodadas
        </Badge>
        <Badge variant="outline" className={`gap-1 shrink-0 ${sessionStats.profitLoss >= 0 ? "text-emerald-500 border-emerald-500/30" : "text-red-500 border-red-500/30"}`}>
          {sessionStats.profitLoss >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {sessionStats.profitLoss >= 0 ? "+" : ""}R$ {sessionStats.profitLoss.toFixed(2)}
        </Badge>
        {sessionStats.currentStreak > 0 && (
          <Badge variant="outline" className="gap-1 shrink-0 text-amber-500 border-amber-500/30">
            <Flame className="w-3 h-3" /> {sessionStats.currentStreak}x streak
          </Badge>
        )}
        <Badge variant="outline" className="gap-1 shrink-0">
          <Clock className="w-3 h-3" /> {sessionDuration}min
        </Badge>
      </div>

      {/* Tabs: Game / Stats */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-8">
          <TabsTrigger value="game" className="text-xs">🎮 Jogo</TabsTrigger>
          <TabsTrigger value="stats" className="text-xs">📊 Métricas</TabsTrigger>
          <TabsTrigger value="history" className="text-xs">📜 Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="game" className="space-y-3 mt-3">
          {/* Crash History */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {crashHistory.slice(0, 15).map((c, i) => (
              <CrashDot key={i} value={c} />
            ))}
          </div>

          {/* Game Display */}
          <AviatorFlightCanvas phase={phase} multiplier={multiplier} waitCountdown={waitCountdown} />

          {/* Betting Controls — Two Panels */}
          <div className="grid grid-cols-2 gap-2">
            {/* Slot 1 */}
            <Card>
              <CardContent className="p-3 space-y-2">
                <Label className="text-[10px] text-muted-foreground font-bold">APOSTA 1</Label>
                <Input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} className="h-9 text-center font-bold text-sm" min="1" step="5" />
                <div className="flex gap-1">
                  {[5, 10, 50].map(v => (
                    <Button key={v} size="sm" variant="outline" className="flex-1 h-6 text-[10px] px-1" onClick={() => setBetAmount(String(v))}>{v}</Button>
                  ))}
                </div>

                {phase === "waiting" && !currentBet && (
                  <Button onClick={handleBet} disabled={isProcessing} className="w-full h-11 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                    APOSTAR R$ {parseFloat(betAmount || "0").toFixed(2)}
                  </Button>
                )}
                {phase === "waiting" && currentBet && (
                  <Button onClick={cancelBet} disabled={isProcessing} className="w-full h-11 text-sm font-bold bg-red-600 hover:bg-red-700 text-white">
                    ❌ CANCELAR
                  </Button>
                )}
                {phase === "running" && currentBet && !currentBet.cashed_out_at && (
                  <Button onClick={cashOut} disabled={isProcessing} className="w-full h-11 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse">
                    💰 {multiplier.toFixed(2)}x R${(currentBet.bet_amount * multiplier).toFixed(0)}
                  </Button>
                )}
                {phase === "running" && currentBet && currentBet.cashed_out_at && (
                  <Button disabled className="w-full h-11 text-xs font-bold bg-emerald-700/80 text-white">
                    ✅ {currentBet.cashed_out_at.toFixed(2)}x
                  </Button>
                )}
                {phase === "running" && !currentBet && (
                  <Button disabled className="w-full h-11 text-xs font-bold opacity-50">Aguarde...</Button>
                )}
                {phase === "crashed" && (
                  <Button disabled className="w-full h-11 text-xs font-bold bg-zinc-700 text-zinc-400">
                    💥 {lastCrash?.toFixed(2)}x
                  </Button>
                )}

                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Switch checked={autoBetEnabled} onCheckedChange={setAutoBetEnabled} id="auto-bet-1" />
                    <Label htmlFor="auto-bet-1" className="text-[10px]">Auto Aposta</Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch checked={autoCashoutEnabled} onCheckedChange={setAutoCashoutEnabled} id="auto-cashout-1" />
                    <Label htmlFor="auto-cashout-1" className="text-[10px]">Auto Retirar</Label>
                    {autoCashoutEnabled && (
                      <Input type="number" value={autoCashout} onChange={e => setAutoCashout(e.target.value)} placeholder="2.00" className="h-6 w-16 text-[10px] text-center" min="1.01" step="0.1" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Slot 2 */}
            <Card>
              <CardContent className="p-3 space-y-2">
                <Label className="text-[10px] text-muted-foreground font-bold">APOSTA 2</Label>
                <Input type="number" value={betAmount2} onChange={e => setBetAmount2(e.target.value)} className="h-9 text-center font-bold text-sm" min="1" step="5" />
                <div className="flex gap-1">
                  {[10, 25, 100].map(v => (
                    <Button key={v} size="sm" variant="outline" className="flex-1 h-6 text-[10px] px-1" onClick={() => setBetAmount2(String(v))}>{v}</Button>
                  ))}
                </div>

                {phase === "waiting" && !currentBet2 && (
                  <Button onClick={handleBet2} disabled={isProcessing} className="w-full h-11 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                    APOSTAR R$ {parseFloat(betAmount2 || "0").toFixed(2)}
                  </Button>
                )}
                {phase === "waiting" && currentBet2 && (
                  <Button onClick={cancelBet2} disabled={isProcessing} className="w-full h-11 text-sm font-bold bg-red-600 hover:bg-red-700 text-white">
                    ❌ CANCELAR
                  </Button>
                )}
                {phase === "running" && currentBet2 && !currentBet2.cashed_out_at && (
                  <Button onClick={cashOut2} disabled={isProcessing} className="w-full h-11 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse">
                    💰 {multiplier.toFixed(2)}x R${(currentBet2.bet_amount * multiplier).toFixed(0)}
                  </Button>
                )}
                {phase === "running" && currentBet2 && currentBet2.cashed_out_at && (
                  <Button disabled className="w-full h-11 text-xs font-bold bg-emerald-700/80 text-white">
                    ✅ {currentBet2.cashed_out_at.toFixed(2)}x
                  </Button>
                )}
                {phase === "running" && !currentBet2 && (
                  <Button disabled className="w-full h-11 text-xs font-bold opacity-50">Aguarde...</Button>
                )}
                {phase === "crashed" && (
                  <Button disabled className="w-full h-11 text-xs font-bold bg-zinc-700 text-zinc-400">
                    💥 {lastCrash?.toFixed(2)}x
                  </Button>
                )}

                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Switch checked={autoBet2Enabled} onCheckedChange={setAutoBet2Enabled} id="auto-bet-2" />
                    <Label htmlFor="auto-bet-2" className="text-[10px]">Auto Aposta</Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch checked={!!autoCashout2} onCheckedChange={v => setAutoCashout2(v ? "2.00" : "")} id="auto-cashout-2" />
                    <Label htmlFor="auto-cashout-2" className="text-[10px]">Auto Retirar</Label>
                    {autoCashout2 && (
                      <Input type="number" value={autoCashout2} onChange={e => setAutoCashout2(e.target.value)} placeholder="2.00" className="h-6 w-16 text-[10px] text-center" min="1.01" step="0.1" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Round bets */}
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
                        <Badge className="bg-emerald-500/20 text-emerald-500 border-0 text-[10px]">{bet.cashed_out_at.toFixed(2)}x → R$ {(bet.payout || 0).toFixed(2)}</Badge>
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
        </TabsContent>

        {/* STATS TAB */}
        <TabsContent value="stats" className="space-y-3 mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Performance da Sessão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Profit/Loss hero */}
              <div className={`text-center p-4 rounded-xl ${sessionStats.profitLoss >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                <p className="text-xs text-muted-foreground mb-1">Lucro / Prejuízo</p>
                <p className={`text-3xl font-black tabular-nums ${sessionStats.profitLoss >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {sessionStats.profitLoss >= 0 ? "+" : ""}R$ {sessionStats.profitLoss.toFixed(2)}
                </p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2">
                <StatMini icon={Target} label="Rodadas" value={String(sessionStats.roundsPlayed)} />
                <StatMini icon={Trophy} label="Vitórias" value={`${sessionStats.wins}/${sessionStats.betsPlaced}`} color="text-emerald-500" />
                <StatMini icon={Zap} label="Win Rate" value={`${sessionStats.winRate.toFixed(0)}%`} color={sessionStats.winRate >= 50 ? "text-emerald-500" : "text-red-500"} />
                <StatMini icon={Flame} label="Melhor Streak" value={`${sessionStats.bestStreak}x`} color="text-amber-500" />
                <StatMini icon={TrendingUp} label="Melhor Multi" value={`${sessionStats.bestMultiplier.toFixed(2)}x`} color="text-purple-500" />
                <StatMini icon={ArrowUpDown} label="Multi Médio" value={`${sessionStats.avgMultiplier.toFixed(2)}x`} />
                <StatMini icon={TrendingUp} label="Maior Ganho" value={`R$ ${sessionStats.biggestWin.toFixed(2)}`} color="text-emerald-500" />
                <StatMini icon={TrendingDown} label="Maior Perda" value={`R$ ${Math.abs(sessionStats.biggestLoss).toFixed(2)}`} color="text-red-500" />
                <StatMini icon={Clock} label="Tempo" value={`${sessionDuration}min`} />
              </div>

              {/* Volume */}
              <div className="flex gap-3 text-xs">
                <div className="flex-1 text-center p-2 rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">Total Apostado</p>
                  <p className="font-bold">R$ {sessionStats.totalBet.toFixed(2)}</p>
                </div>
                <div className="flex-1 text-center p-2 rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">Total Ganho</p>
                  <p className="font-bold text-emerald-500">R$ {sessionStats.totalWon.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Crash distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Distribuição de Crashes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {[
                  { range: "1.00x - 1.49x", color: "bg-red-500", count: crashHistory.filter(c => c < 1.5).length },
                  { range: "1.50x - 2.99x", color: "bg-amber-500", count: crashHistory.filter(c => c >= 1.5 && c < 3).length },
                  { range: "3.00x - 9.99x", color: "bg-emerald-500", count: crashHistory.filter(c => c >= 3 && c < 10).length },
                  { range: "10.00x+", color: "bg-purple-500", count: crashHistory.filter(c => c >= 10).length },
                ].map(row => (
                  <div key={row.range} className="flex items-center gap-2 text-xs">
                    <div className={`w-3 h-3 rounded-full ${row.color}`} />
                    <span className="flex-1 text-muted-foreground">{row.range}</span>
                    <span className="font-bold">{row.count}</span>
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${row.color} rounded-full`} style={{ width: `${crashHistory.length > 0 ? (row.count / crashHistory.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="space-y-3 mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><History className="w-4 h-4" /> Histórico de Apostas</CardTitle>
            </CardHeader>
            <CardContent>
              {betHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma aposta realizada nesta sessão.</p>
              ) : (
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                  {betHistory.map((h, i) => (
                    <div key={i} className={`flex items-center justify-between text-xs p-2.5 rounded-lg ${h.won ? "bg-emerald-500/5 border border-emerald-500/10" : "bg-red-500/5 border border-red-500/10"}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] ${h.won ? "text-emerald-500" : "text-red-500"}`}>{h.won ? "✅" : "❌"}</span>
                        <span className="text-muted-foreground">{h.time}</span>
                      </div>
                      <span className="font-medium">R$ {h.amount.toFixed(2)}</span>
                      <span className={`font-bold ${h.won ? "text-emerald-500" : "text-red-500"}`}>
                        {h.won ? `${h.multiplier.toFixed(2)}x → R$ ${(h.payout || 0).toFixed(2)}` : `Crash ${h.multiplier.toFixed(2)}x`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
