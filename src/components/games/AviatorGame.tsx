import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAviator } from "@/hooks/useAviator";
import { cn } from "@/lib/utils";
import planeImg from "@/assets/aviator-plane.png";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const planeImageRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number>(0);

  // Load plane image once
  useEffect(() => {
    const img = new Image();
    img.src = planeImg;
    img.onload = () => { planeImageRef.current = img; };
  }, []);

  // Render loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle DPR for crisp rendering
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Background
    ctx.fillStyle = "#0f0f23";
    ctx.fillRect(0, 0, w, h);

    // Subtle grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      const y = (h / 6) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = 1; i < 8; i++) {
      const x = (w / 8) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    if (phase === "waiting") {
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        countdown > 0 ? `Próxima rodada em ${countdown}s...` : "Aguardando...",
        w / 2, h / 2
      );
      return;
    }

    // Build curve points
    const padding = { left: 40, right: 30, top: 30, bottom: 40 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;
    const maxMult = Math.max(multiplier * 1.2, 2);

    const points: [number, number][] = [];
    const numPoints = 120;
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      // exponential interpolation from 1 to current multiplier
      const m = Math.pow(multiplier, t);
      const x = padding.left + t * plotW;
      const y = h - padding.bottom - ((m - 1) / (maxMult - 1)) * plotH;
      points.push([x, Math.max(y, padding.top)]);
    }

    if (points.length < 2) return;

    // Fill under curve
    const grad = ctx.createLinearGradient(0, h, 0, padding.top);
    if (phase === "crashed") {
      grad.addColorStop(0, "rgba(220, 38, 38, 0.35)");
      grad.addColorStop(1, "rgba(220, 38, 38, 0.02)");
    } else {
      grad.addColorStop(0, "rgba(220, 38, 38, 0.30)");
      grad.addColorStop(1, "rgba(220, 38, 38, 0.02)");
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(points[0][0], h - padding.bottom);
    for (const [x, y] of points) ctx.lineTo(x, y);
    ctx.lineTo(points[points.length - 1][0], h - padding.bottom);
    ctx.closePath();
    ctx.fill();

    // Curve line
    ctx.strokeStyle = phase === "crashed" ? "#ef4444" : "#dc2626";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const [x, y] = points[i];
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Glow effect on curve
    ctx.strokeStyle = phase === "crashed" ? "rgba(239,68,68,0.3)" : "rgba(220,38,38,0.3)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const [x, y] = points[i];
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw plane at the tip
    const tip = points[points.length - 1];
    const prev = points[points.length - 3] || points[points.length - 2];
    const angle = Math.atan2(prev[1] - tip[1], tip[0] - prev[0]);

    if (phase === "running" && planeImageRef.current) {
      const planeSize = 52;
      ctx.save();
      ctx.translate(tip[0] + 10, tip[1] - 10);
      ctx.rotate(-angle * 0.8);
      ctx.drawImage(
        planeImageRef.current,
        -planeSize / 2,
        -planeSize / 2,
        planeSize,
        planeSize
      );
      ctx.restore();

      // Exhaust trail particles
      ctx.save();
      for (let i = 0; i < 6; i++) {
        const trailIdx = Math.max(0, points.length - 1 - i * 4);
        const [tx, ty] = points[trailIdx];
        const alpha = 0.3 - i * 0.05;
        const size = 3 - i * 0.4;
        if (alpha > 0 && size > 0) {
          ctx.fillStyle = `rgba(255, 160, 60, ${alpha})`;
          ctx.beginPath();
          ctx.arc(
            tx + (Math.random() - 0.5) * 4,
            ty + (Math.random() - 0.5) * 4,
            size, 0, Math.PI * 2
          );
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // Crashed explosion effect
    if (phase === "crashed") {
      ctx.save();
      ctx.globalAlpha = 0.6;
      const burstSize = 30;
      for (let i = 0; i < 8; i++) {
        const ang = (Math.PI * 2 / 8) * i + Date.now() * 0.001;
        const dist = burstSize * (0.5 + Math.random() * 0.5);
        ctx.fillStyle = `rgba(255, ${60 + Math.random() * 100}, 0, ${0.5 + Math.random() * 0.3})`;
        ctx.beginPath();
        ctx.arc(
          tip[0] + Math.cos(ang) * dist,
          tip[1] - Math.sin(ang) * dist,
          3 + Math.random() * 4,
          0, Math.PI * 2
        );
        ctx.fill();
      }
      ctx.restore();
    }

    // Axes labels
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= 4; i++) {
      const val = 1 + ((maxMult - 1) / 4) * i;
      const y = h - padding.bottom - (i / 4) * plotH;
      ctx.fillText(`${val.toFixed(1)}x`, padding.left - 6, y);
    }
  }, [phase, multiplier, countdown]);

  // Animation frame loop
  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

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
      <div className="flex items-center justify-between p-3 bg-[#0f0f23] rounded-t-xl border border-border/30">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground gap-1">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
            Modo Simulação
          </Badge>
        </div>
        <span className="text-emerald-400 font-bold text-lg">
          {balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} BRL
        </span>
      </div>

      {/* Title */}
      <div className="bg-[#0f0f23] px-4 py-1 border-x border-border/30">
        <span className="text-2xl font-black italic text-red-500 tracking-tight">Aviator</span>
      </div>

      {/* History bar */}
      <div className="bg-[#0f0f23] px-3 py-2 border-x border-border/30 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {history.map((h, i) => (
            <Badge key={i} className={cn(
              "text-xs font-semibold border-0 px-2 py-0.5",
              h >= 10 ? "bg-violet-500/20 text-violet-400" :
              h >= 2 ? "bg-blue-500/20 text-blue-400" :
              "bg-sky-500/20 text-sky-300"
            )}>
              {h.toFixed(2)}x
            </Badge>
          ))}
          {history.length === 0 && (
            <span className="text-xs text-muted-foreground">Aguardando rodadas...</span>
          )}
        </div>
      </div>

      {/* FUN MODE */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-500 text-center py-1 text-xs font-bold text-black tracking-wider border-x border-border/30">
        FUN MODE
      </div>

      {/* Game canvas area */}
      <div className="relative bg-[#0f0f23] border-x border-border/30" style={{ minHeight: 300 }}>
        <canvas ref={canvasRef} className="w-full" style={{ height: 300, display: "block" }} />

        {/* Multiplier overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {phase === "running" && (
            <motion.span
              key={Math.floor(multiplier * 10)}
              initial={{ scale: 0.95, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.1 }}
              className={cn("text-6xl md:text-7xl font-black drop-shadow-lg", getMultiplierColor(multiplier))}
            >
              {multiplier.toFixed(2)}x
            </motion.span>
          )}
          {phase === "crashed" && (
            <motion.div
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="text-center"
            >
              <span className="text-5xl md:text-6xl font-black text-red-500 drop-shadow-lg">VOOU!</span>
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

        {/* Online users */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/50 rounded-full px-2 py-1">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-white/70 font-medium">{bets.length}</span>
        </div>
      </div>

      {/* Betting panel */}
      <div className="bg-[#0f0f23] p-3 border-x border-b border-border/30 rounded-b-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Bet controls */}
          <div className="bg-[#0a0a18] rounded-xl p-3 space-y-3">
            <div className="flex gap-1">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white">Aposta</span>
              <span className="px-3 py-1 rounded-full text-xs font-medium text-white/40">Auto</span>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => handleBetChange(-5)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={betInput}
                onChange={(e) => setBetInput(Math.max(1, Math.min(balance, Number(e.target.value))))}
                className="flex-1 bg-transparent text-center text-white text-xl font-bold border-0 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button onClick={() => handleBetChange(5)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {[1, 2, 5, 10].map((v) => (
                <button key={v} onClick={() => quickBet(v)} className="py-1 rounded bg-white/5 text-white/70 text-xs font-medium hover:bg-white/10 transition-colors">
                  {v}
                </button>
              ))}
            </div>

            {phase === "running" && myBetActive && !myCashedOut ? (
              <Button onClick={cashOut} className="w-full h-14 text-lg font-black bg-amber-500 hover:bg-amber-400 text-black rounded-xl transition-colors">
                Retirar {(myBetAmount * multiplier).toFixed(2)} BRL
              </Button>
            ) : (
              <Button
                onClick={() => placeBet(betInput)}
                disabled={myBetActive || phase === "crashed" || betInput > balance || betInput <= 0}
                className="w-full h-14 text-lg font-black bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl disabled:opacity-50 transition-colors"
              >
                {phase === "crashed" ? `Aguarde ${countdown}s` : `Aposta ${betInput.toFixed(2)} BRL`}
              </Button>
            )}
          </div>

          {/* Bets list */}
          <div className="bg-[#0a0a18] rounded-xl p-3 max-h-[260px] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50 font-medium">{bets.length} Apostas</span>
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
                      <img src={bet.avatar_url} className="w-5 h-5 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-white/20" />
                    )}
                    <span className="text-white/70 truncate max-w-[80px]">{bet.user_name.split(" ")[0]}</span>
                  </div>
                  <span className="text-white py-0.5 self-center">{bet.bet_amount.toFixed(2)}</span>
                  <span className={cn("text-center py-0.5 self-center font-medium", bet.cashed_out_at ? "text-emerald-400" : "text-white/30")}>
                    {bet.cashed_out_at ? `${bet.cashed_out_at.toFixed(2)}x` : "-"}
                  </span>
                  <span className={cn("text-right py-0.5 self-center font-medium", bet.payout ? "text-emerald-400" : "text-white/30")}>
                    {bet.payout ? bet.payout.toFixed(2) : "-"}
                  </span>
                </div>
              ))}

              {bets.length === 0 && (
                <span className="col-span-4 text-center text-white/30 py-4">Nenhuma aposta nesta rodada</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
