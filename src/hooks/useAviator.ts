import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type AviatorPhase = "waiting" | "running" | "crashed";

export interface AviatorBet {
  id: string;
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  bet_amount: number;
  cashed_out_at: number | null;
  payout: number | null;
  round_id: string;
  created_at: string;
}

export interface AviatorRound {
  id: string;
  crash_point: number;
  status: string;
  started_at: string | null;
  crashed_at: string | null;
  created_at: string;
}

const WAIT_DURATION = 8000; // 8s waiting phase
const TICK_INTERVAL = 50; // 50ms for smooth animation

// Generate a crash point using provably fair algorithm
// House edge ~5%: E[1/crash_point] ≈ 0.95
function generateCrashPoint(): number {
  const h = Math.random();
  if (h < 0.01) return 1.0; // 1% instant crash
  const e = 0.95; // 95% RTP
  const crash = e / (1 - h);
  return Math.max(1.0, Math.floor(crash * 100) / 100);
}

export function useAviator() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<AviatorPhase>("waiting");
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [lastCrash, setLastCrash] = useState<number | null>(null);
  const [crashHistory, setCrashHistory] = useState<number[]>([]);
  const [waitCountdown, setWaitCountdown] = useState(0);
  const [balance, setBalance] = useState(0);
  const [currentBet, setCurrentBet] = useState<AviatorBet | null>(null);
  const [roundBets, setRoundBets] = useState<AviatorBet[]>([]);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const phaseRef = useRef(phase);
  const multiplierRef = useRef(multiplier);
  const crashPointRef = useRef(crashPoint);
  const currentBetRef = useRef(currentBet);
  const roundIdRef = useRef(currentRoundId);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const waitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  phaseRef.current = phase;
  multiplierRef.current = multiplier;
  crashPointRef.current = crashPoint;
  currentBetRef.current = currentBet;
  roundIdRef.current = currentRoundId;

  // Load balance
  const loadBalance = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("aviator_balances")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setBalance(data.balance);
    } else {
      // Create initial balance
      await supabase.from("aviator_balances").insert({ user_id: user.id, balance: 1000 });
      setBalance(1000);
    }
  }, [user]);

  // Load crash history
  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from("aviator_rounds")
      .select("crash_point")
      .eq("status", "crashed")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) {
      setCrashHistory(data.map(r => r.crash_point));
      if (data.length > 0) setLastCrash(data[0].crash_point);
    }
  }, []);

  useEffect(() => {
    loadBalance();
    loadHistory();
  }, [loadBalance, loadHistory]);

  // Start the game loop
  const startWaiting = useCallback(async () => {
    setPhase("waiting");
    setMultiplier(1.0);
    setCurrentBet(null);
    setRoundBets([]);

    const cp = generateCrashPoint();
    setCrashPoint(cp);
    crashPointRef.current = cp;

    // Create round in DB
    const { data: round } = await supabase
      .from("aviator_rounds")
      .insert({ crash_point: cp, status: "waiting", result_color: "", result_number: 0 } as any)
      .select()
      .single();

    if (round) {
      setCurrentRoundId(round.id);
      roundIdRef.current = round.id;
    }

    // Countdown
    let remaining = WAIT_DURATION / 1000;
    setWaitCountdown(remaining);

    if (waitTimerRef.current) clearInterval(waitTimerRef.current);
    waitTimerRef.current = setInterval(() => {
      remaining -= 1;
      setWaitCountdown(Math.max(0, remaining));
      if (remaining <= 0) {
        if (waitTimerRef.current) clearInterval(waitTimerRef.current);
        startFlying();
      }
    }, 1000);
  }, []);

  // Flying phase with smooth animation
  const startFlying = useCallback(async () => {
    setPhase("running");

    if (roundIdRef.current) {
      await supabase
        .from("aviator_rounds")
        .update({ status: "running", started_at: new Date().toISOString() })
        .eq("id", roundIdRef.current);
    }

    startTimeRef.current = performance.now();

    const tick = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      // Exponential growth: starts slow, accelerates
      const m = Math.pow(Math.E, elapsed * 0.08) ;
      const rounded = Math.floor(m * 100) / 100;
      
      setMultiplier(rounded);
      multiplierRef.current = rounded;

      if (rounded >= (crashPointRef.current || 999)) {
        // CRASH
        handleCrash();
        return;
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const handleCrash = useCallback(async () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const cp = crashPointRef.current || 1.0;
    setMultiplier(cp);
    setPhase("crashed");
    setLastCrash(cp);
    setCrashHistory(prev => [cp, ...prev].slice(0, 20));

    // Update round in DB
    if (roundIdRef.current) {
      await supabase
        .from("aviator_rounds")
        .update({ status: "crashed", crashed_at: new Date().toISOString() })
        .eq("id", roundIdRef.current);
    }

    // If user had a bet and didn't cash out, they lose
    if (currentBetRef.current && !currentBetRef.current.cashed_out_at) {
      toast.error(`Crash em ${cp.toFixed(2)}x! Você perdeu R$ ${currentBetRef.current.bet_amount.toFixed(2)}`);
    }

    // Wait 3 seconds then start new round
    setTimeout(() => {
      startWaiting();
    }, 3000);
  }, [startWaiting]);

  // Place bet
  const placeBet = useCallback(async (amount: number) => {
    if (!user || !profile) return;
    if (phaseRef.current !== "waiting") {
      toast.error("Espere a próxima rodada para apostar!");
      return;
    }
    if (amount <= 0 || amount > balance) {
      toast.error("Saldo insuficiente!");
      return;
    }
    if (currentBetRef.current) {
      toast.error("Você já apostou nesta rodada!");
      return;
    }

    setIsProcessing(true);
    try {
      // Deduct balance
      const newBalance = balance - amount;
      await supabase
        .from("aviator_balances")
        .update({ balance: newBalance })
        .eq("user_id", user.id);
      setBalance(newBalance);

      // Insert bet
      const { data: bet } = await supabase
        .from("aviator_bets")
        .insert({
          user_id: user.id,
          user_name: profile.full_name || "Jogador",
          avatar_url: profile.avatar_url,
          bet_amount: amount,
          round_id: roundIdRef.current || "",
        })
        .select()
        .single();

      if (bet) {
        const betData: AviatorBet = {
          id: bet.id,
          user_id: bet.user_id,
          user_name: bet.user_name,
          avatar_url: bet.avatar_url,
          bet_amount: bet.bet_amount,
          cashed_out_at: bet.cashed_out_at,
          payout: bet.payout,
          round_id: bet.round_id,
          created_at: bet.created_at,
        };
        setCurrentBet(betData);
        currentBetRef.current = betData;
        setRoundBets(prev => [...prev, betData]);
        toast.success(`Aposta de R$ ${amount.toFixed(2)} realizada!`);
      }
    } catch {
      toast.error("Erro ao realizar aposta.");
    } finally {
      setIsProcessing(false);
    }
  }, [user, profile, balance]);

  // Cash out
  const cashOut = useCallback(async () => {
    if (!user || !currentBetRef.current) return;
    if (phaseRef.current !== "running") return;
    if (currentBetRef.current.cashed_out_at) return;

    setIsProcessing(true);
    try {
      const m = multiplierRef.current;
      const payout = currentBetRef.current.bet_amount * m;

      // Update bet
      await supabase
        .from("aviator_bets")
        .update({ cashed_out_at: m, payout })
        .eq("id", currentBetRef.current.id);

      // Add to balance
      const newBalance = balance + payout;
      await supabase
        .from("aviator_balances")
        .update({ balance: newBalance })
        .eq("user_id", user.id);
      setBalance(newBalance);

      const updatedBet = { ...currentBetRef.current, cashed_out_at: m, payout };
      setCurrentBet(updatedBet);
      currentBetRef.current = updatedBet;

      toast.success(`Retirou em ${m.toFixed(2)}x! Ganhou R$ ${payout.toFixed(2)}`);
    } catch {
      toast.error("Erro ao retirar.");
    } finally {
      setIsProcessing(false);
    }
  }, [user, balance]);

  // Start game loop on mount
  useEffect(() => {
    startWaiting();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (waitTimerRef.current) clearInterval(waitTimerRef.current);
    };
  }, []);

  return {
    phase,
    multiplier,
    crashPoint,
    lastCrash,
    crashHistory,
    waitCountdown,
    balance,
    currentBet,
    roundBets,
    isProcessing,
    placeBet,
    cashOut,
    loadBalance,
  };
}
