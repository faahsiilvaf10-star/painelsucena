import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Minus, Plus, Plane } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAviator } from "@/hooks/useAviator";
import { cn } from "@/lib/utils";

interface AviatorGameProps {
  onBack: () => void;
}

export function AviatorGame({ onBack }: AviatorGameProps) {
  const {
    balance,
    phase,
    multiplier,
    history,
    bets,
    myBetActive,
    myBetAmount,
    myCashedOut,
    myCashOutMultiplier,
    countdown,
    placeBet,
    cashOut,
  } = useAviator();

  const [betInput, setBetInput] = useState(10);
  const [tab, setTab] = useState<"apostas" | "anterior" | "topo">("apostas");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw the curve
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (phase === "waiting") {
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#ffffff80";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        countdown > 0 ? `Próxima rodada em ${countdown}s...` : "Aguardando...",
        w / 2,
        h / 2
      );
      return;
    }

    // Dark background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = "#ffffff10";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = (h / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Calculate curve points
    const maxMult = Math.max(multiplier, 2);
    const points: [number, number][] = [];
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const m = Math.pow(Math.E, 0.07 * t * (Math.log(multiplier) / 0.07));
      const x = (t * w * 0.9) + w * 0.05;
      const y = h - ((m - 1) / (maxMult - 1)) * (h * 0.8) - h * 0.1;
      points.push([x, Math.max(y, h * 0.05)]);
    }

    // Fill area under curve (red gradient)
    if (points.length > 1) {
      const gradient = ctx.createLinearGradient(0, h, 0, 0);
      if (phase === "crashed") {
        gradient.addColorStop(0, "#ff000040");
        gradient.addColorStop(1, "#ff000010");
      } else {
        gradient.addColorStop(0, "#e7000540");
        gradient.addColorStop(1, "#e7000510");
      }
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(points[0][0], h);
      points.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.lineTo(points[points.length - 1][0], h);
      ctx.closePath();
      ctx.fill();

      // Curve line
      ctx.strokeStyle = phase === "crashed" ? "#ff3333" : "#e70005";
      ctx.lineWidth = 3;
      ctx.beginPath();
      points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();

      // Plane at the tip
      if (phase === "running") {
        const last = points[points.length - 1];
        ctx.save();
        ctx.translate(last[0], last[1]);
        // Angle of the curve at the tip
        if (points.length >= 2) {
          const prev = points[points.length - 2];
          const angle = Math.atan2(prev[1] - last[1], last[0] - prev[0]);
          ctx.rotate(-angle);
        }
        ctx.fillStyle = "#e70005";
        // Simple plane shape
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(-10, -8);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-10, 8);
        ctx.closePath();
        ctx.fill();
        // Wing
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-15, -15);
        ctx.lineTo(-10, -2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }, [multiplier, phase, countdown]);

  const getMultiplierColor = (m: number) => {
    if (m >= 10) return "text-violet-400";
    if (m >= 5) return "text-purple-400";
    if (m >= 2) return "text-blue-400";
    return "text-sky-300";
  };

  const handleBetChange = (delta: number) => {
    setBetInput((prev) => Math.max(1, Math.min(balance, prev + delta)));
  };

  const quickBet = (amount: number) => {
    setBetInput(Math.min(amount, balance));
  };

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-[#1a1a2e] rounded-t-xl border border-border/30">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
            Modo Simulação
          </Badge>
        </div>
        <div className="text-right">
          <span className="text-emerald-400 font-bold text-lg">
            {balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} BRL
          </span>
        </div>
      </div>

      {/* Title */}
      <div className="bg-[#1a1a2e] px-4 py-1 border-x border-border/30">
        <span className="text-2xl font-black italic text-red-500 tracking-tight">Aviator</span>
      </div>

      {/* History bar */}
      <div className="bg-[#1a1a2e] px-3 py-2 border-x border-border/30 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {history.map((h, i) => (
            <Badge
              key={i}
              className={cn(
                "text-xs font-semibold border-0 px-2 py-0.5",
                h >= 10 ? "bg-violet-500/20 text-violet-400" :
                h >= 2 ? "bg-blue-500/20 text-blue-400" :
                "bg-sky-500/20 text-sky-300"
              )}
            >
              {h.toFixed(2)}x
            </Badge>
          ))}
          {history.length === 0 && (
            <span className="text-xs text-muted-foreground">Aguardando rodadas...</span>
          )}
        </div>
      </div>

      {/* FUN MODE banner */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-500 text-center py-1 text-xs font-bold text-black tracking-wider border-x border-border/30">
        FUN MODE
      </div>

      {/* Main game area */}
      <div className="relative bg-[#1a1a2e] border-x border-border/30" style={{ minHeight: 280 }}>
        <canvas
          ref={canvasRef}
          width={600}
          height={280}
          className="w-full h-[280px]"
          style={{ imageRendering: "auto" }}
        />

        {/* Multiplier overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {phase === "running" && (
            <motion.div
              key="mult"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-center"
            >
              <span className={cn("text-6xl md:text-7xl font-black", getMultiplierColor(multiplier))}>
                {multiplier.toFixed(2)}x
              </span>
            </motion.div>
          )}
          {phase === "crashed" && (
            <motion.div
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <span className="text-5xl md:text-6xl font-black text-red-500">
                VOOU!
              </span>
              <p className="text-red-400 text-lg font-bold mt-1">{multiplier.toFixed(2)}x</p>
            </motion.div>
          )}
        </div>

        {/* Cash out notification */}
        <AnimatePresence>
          {myCashedOut && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 right-4 bg-emerald-500/90 text-white px-4 py-2 rounded-lg font-bold shadow-lg"
            >
              💰 {(myBetAmount * myCashOutMultiplier).toFixed(2)} BRL ({myCashOutMultiplier.toFixed(2)}x)
            </motion.div>
          )}
        </AnimatePresence>

        {/* Online users count */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/40 rounded-full px-2 py-1">
          <div className="flex -space-x-1">
            <div className="w-5 h-5 rounded-full bg-emerald-500 border border-black" />
            <div className="w-5 h-5 rounded-full bg-blue-500 border border-black" />
          </div>
          <span className="text-xs text-white/70 font-medium">{bets.length || 0}</span>
        </div>
      </div>

      {/* Betting panel */}
      <div className="bg-[#1a1a2e] p-3 border-x border-b border-border/30 rounded-b-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Bet panel */}
          <div className="bg-[#0d0d1a] rounded-xl p-3 space-y-3">
            <div className="flex gap-1">
              <button
                onClick={() => setTab("apostas")}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  tab === "apostas" ? "bg-white/10 text-white" : "text-white/50"
                )}
              >
                Aposta
              </button>
              <button className="px-3 py-1 rounded-full text-xs font-medium text-white/50">
                Auto
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBetChange(-5)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={betInput}
                onChange={(e) => setBetInput(Math.max(1, Math.min(balance, Number(e.target.value))))}
                className="flex-1 bg-transparent text-center text-white text-xl font-bold border-0 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={() => handleBetChange(5)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {[1, 2, 5, 10].map((v) => (
                <button
                  key={v}
                  onClick={() => quickBet(v)}
                  className="py-1 rounded bg-white/5 text-white/70 text-xs font-medium hover:bg-white/10"
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Bet / Cash out button */}
            {phase === "running" && myBetActive && !myCashedOut ? (
              <Button
                onClick={cashOut}
                className="w-full h-14 text-lg font-black bg-amber-500 hover:bg-amber-400 text-black rounded-xl"
              >
                Retirar {(myBetAmount * multiplier).toFixed(2)} BRL
              </Button>
            ) : (
              <Button
                onClick={() => placeBet(betInput)}
                disabled={myBetActive || phase === "crashed" || betInput > balance || betInput <= 0}
                className="w-full h-14 text-lg font-black bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl disabled:opacity-50"
              >
                {phase === "crashed"
                  ? `Aguarde ${countdown}s`
                  : `Aposta ${betInput.toFixed(2)} BRL`}
              </Button>
            )}
          </div>

          {/* Bets list */}
          <div className="bg-[#0d0d1a] rounded-xl p-3 max-h-[260px] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50 font-medium">
                {bets.length} Apostas
              </span>
              <span className="text-xs text-white/50 font-medium">
                Total: {bets.reduce((s, b) => s + b.bet_amount, 0).toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 gap-y-1 text-xs">
              <span className="text-white/40">Jogador</span>
              <span className="text-white/40">Aposta</span>
              <span className="text-white/40 text-center">X</span>
              <span className="text-white/40 text-right">Prêmio</span>

              {bets.map((bet) => (
                <div key={bet.id} className="contents">
                  <div className="flex items-center gap-1.5 py-0.5">
                    {bet.avatar_url ? (
                      <img src={bet.avatar_url} className="w-5 h-5 rounded-full" alt="" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-white/20" />
                    )}
                    <span className="text-white/70 truncate max-w-[80px]">
                      {bet.user_name.split(" ")[0]}
                    </span>
                  </div>
                  <span className="text-white py-0.5 self-center">
                    {bet.bet_amount.toFixed(2)}
                  </span>
                  <span className={cn(
                    "text-center py-0.5 self-center font-medium",
                    bet.cashed_out_at ? "text-emerald-400" : "text-white/30"
                  )}>
                    {bet.cashed_out_at ? `${bet.cashed_out_at.toFixed(2)}x` : "-"}
                  </span>
                  <span className={cn(
                    "text-right py-0.5 self-center font-medium",
                    bet.payout ? "text-emerald-400" : "text-white/30"
                  )}>
                    {bet.payout ? bet.payout.toFixed(2) : "-"}
                  </span>
                </div>
              ))}

              {bets.length === 0 && (
                <span className="col-span-4 text-center text-white/30 py-4">
                  Nenhuma aposta nesta rodada
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
