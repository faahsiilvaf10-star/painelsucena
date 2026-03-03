import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
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

export interface SessionStats {
  roundsPlayed: number;
  totalBet: number;
  totalWon: number;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
  bestMultiplier: number;
  sessionStart: number;
  profitLoss: number;
  winRate: number;
  avgMultiplier: number;
  biggestWin: number;
  biggestLoss: number;
}

const WAIT_DURATION = 8000;

function generateCrashPoint(): number {
  const h = Math.random();
  if (h < 0.01) return 1.0;
  const e = 0.95;
  const crash = e / (1 - h);
  return Math.max(1.0, Math.floor(crash * 100) / 100);
}

const initialStats: SessionStats = {
  roundsPlayed: 0,
  totalBet: 0,
  totalWon: 0,
  wins: 0,
  losses: 0,
  currentStreak: 0,
  bestStreak: 0,
  bestMultiplier: 0,
  sessionStart: Date.now(),
  profitLoss: 0,
  winRate: 0,
  avgMultiplier: 0,
  biggestWin: 0,
  biggestLoss: 0,
};

export function useAviator() {
  const { user } = useAuth();
  const { data: profile } = useProfile();

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
  const [sessionStats, setSessionStats] = useState<SessionStats>({ ...initialStats });
  const [betHistory, setBetHistory] = useState<Array<{ amount: number; payout: number | null; multiplier: number; won: boolean; time: string }>>([]);

  const phaseRef = useRef(phase);
  const multiplierRef = useRef(multiplier);
  const crashPointRef = useRef(crashPoint);
  const currentBetRef = useRef(currentBet);
  const roundIdRef = useRef(currentRoundId);
  const balanceRef = useRef(balance);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const waitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const crashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  phaseRef.current = phase;
  multiplierRef.current = multiplier;
  crashPointRef.current = crashPoint;
  currentBetRef.current = currentBet;
  roundIdRef.current = currentRoundId;
  balanceRef.current = balance;

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (waitTimerRef.current) clearInterval(waitTimerRef.current);
      if (crashTimeoutRef.current) clearTimeout(crashTimeoutRef.current);
    };
  }, []);

  const updateStats = useCallback((won: boolean, betAmount: number, payout: number | null, cashoutMultiplier: number) => {
    setSessionStats(prev => {
      const newWins = won ? prev.wins + 1 : prev.wins;
      const newLosses = won ? prev.losses : prev.losses + 1;
      const newTotalBet = prev.totalBet + betAmount;
      const newTotalWon = prev.totalWon + (payout || 0);
      const newStreak = won ? prev.currentStreak + 1 : 0;
      const profit = (payout || 0) - betAmount;
      const newRounds = prev.roundsPlayed + 1;

      return {
        ...prev,
        roundsPlayed: newRounds,
        totalBet: newTotalBet,
        totalWon: newTotalWon,
        wins: newWins,
        losses: newLosses,
        currentStreak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
        bestMultiplier: won ? Math.max(prev.bestMultiplier, cashoutMultiplier) : prev.bestMultiplier,
        profitLoss: newTotalWon - newTotalBet,
        winRate: newRounds > 0 ? (newWins / newRounds) * 100 : 0,
        avgMultiplier: won && newWins > 0
          ? ((prev.avgMultiplier * (newWins - 1)) + cashoutMultiplier) / newWins
          : prev.avgMultiplier,
        biggestWin: Math.max(prev.biggestWin, profit > 0 ? profit : 0),
        biggestLoss: Math.min(prev.biggestLoss, profit < 0 ? profit : 0),
      };
    });

    setBetHistory(prev => [{
      amount: betAmount,
      payout,
      multiplier: cashoutMultiplier,
      won,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    }, ...prev].slice(0, 50));
  }, []);

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
      await supabase.from("aviator_balances").insert({ user_id: user.id, balance: 3000 });
      setBalance(3000);
    }
  }, [user]);

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

  const startFlying = useCallback(async () => {
    if (!mountedRef.current) return;
    setPhase("running");

    if (roundIdRef.current) {
      await supabase
        .from("aviator_rounds")
        .update({ status: "running", started_at: new Date().toISOString() })
        .eq("id", roundIdRef.current);
    }

    startTimeRef.current = performance.now();

    const tick = () => {
      if (!mountedRef.current) return;
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const m = Math.pow(Math.E, elapsed * 0.08);
      const rounded = Math.floor(m * 100) / 100;

      setMultiplier(rounded);
      multiplierRef.current = rounded;

      if (rounded >= (crashPointRef.current || 999)) {
        handleCrash();
        return;
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const startWaiting = useCallback(async () => {
    if (!mountedRef.current) return;
    setPhase("waiting");
    setMultiplier(1.0);
    setCurrentBet(null);
    setRoundBets([]);

    const cp = generateCrashPoint();
    setCrashPoint(cp);
    crashPointRef.current = cp;

    const { data: round } = await supabase
      .from("aviator_rounds")
      .insert({ crash_point: cp, status: "waiting" })
      .select()
      .single();

    if (round) {
      setCurrentRoundId(round.id);
      roundIdRef.current = round.id;
    }

    let remaining = WAIT_DURATION / 1000;
    setWaitCountdown(remaining);

    if (waitTimerRef.current) clearInterval(waitTimerRef.current);
    waitTimerRef.current = setInterval(() => {
      if (!mountedRef.current) {
        if (waitTimerRef.current) clearInterval(waitTimerRef.current);
        return;
      }
      remaining -= 1;
      setWaitCountdown(Math.max(0, remaining));
      if (remaining <= 0) {
        if (waitTimerRef.current) clearInterval(waitTimerRef.current);
        startFlying();
      }
    }, 1000);
  }, [startFlying]);

  const handleCrash = useCallback(async () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (!mountedRef.current) return;

    const cp = crashPointRef.current || 1.0;
    setMultiplier(cp);
    setPhase("crashed");
    setLastCrash(cp);
    setCrashHistory(prev => [cp, ...prev].slice(0, 20));

    if (roundIdRef.current) {
      await supabase
        .from("aviator_rounds")
        .update({ status: "crashed", crashed_at: new Date().toISOString() })
        .eq("id", roundIdRef.current);
    }

    // Track loss if bet wasn't cashed out
    const bet = currentBetRef.current;
    if (bet && !bet.cashed_out_at) {
      updateStats(false, bet.bet_amount, null, cp);
      toast.error(`Crash em ${cp.toFixed(2)}x! Você perdeu R$ ${bet.bet_amount.toFixed(2)}`);
    }

    crashTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) startWaiting();
    }, 3000);
  }, [startWaiting, updateStats]);

  const placeBet = useCallback(async (amount: number) => {
    if (!user || !profile) return;
    if (phaseRef.current !== "waiting") {
      toast.error("Espere a próxima rodada para apostar!");
      return;
    }
    if (amount <= 0 || amount > balanceRef.current) {
      toast.error(amount > balanceRef.current ? "Saldo insuficiente!" : "Valor inválido!");
      return;
    }
    if (currentBetRef.current) {
      toast.error("Você já apostou nesta rodada!");
      return;
    }

    setIsProcessing(true);
    try {
      const newBalance = balanceRef.current - amount;
      await supabase
        .from("aviator_balances")
        .update({ balance: newBalance })
        .eq("user_id", user.id);
      setBalance(newBalance);

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
  }, [user, profile]);

  const cancelBet = useCallback(async () => {
    if (!user || !currentBetRef.current) return;
    if (phaseRef.current !== "waiting") return;

    setIsProcessing(true);
    try {
      const bet = currentBetRef.current;
      // Refund balance
      const newBalance = balanceRef.current + bet.bet_amount;
      await supabase
        .from("aviator_balances")
        .update({ balance: newBalance })
        .eq("user_id", user.id);
      setBalance(newBalance);

      // Delete the bet
      await supabase
        .from("aviator_bets")
        .delete()
        .eq("id", bet.id);

      setCurrentBet(null);
      currentBetRef.current = null;
      setRoundBets(prev => prev.filter(b => b.id !== bet.id));
      toast.info("Aposta cancelada! Saldo devolvido.");
    } catch {
      toast.error("Erro ao cancelar aposta.");
    } finally {
      setIsProcessing(false);
    }
  }, [user]);

  const cashOut = useCallback(async () => {
    if (!user || !currentBetRef.current) return;
    if (phaseRef.current !== "running") return;
    if (currentBetRef.current.cashed_out_at) return;

    setIsProcessing(true);
    try {
      const m = multiplierRef.current;
      const payout = currentBetRef.current.bet_amount * m;

      await supabase
        .from("aviator_bets")
        .update({ cashed_out_at: m, payout })
        .eq("id", currentBetRef.current.id);

      const newBalance = balanceRef.current + payout;
      await supabase
        .from("aviator_balances")
        .update({ balance: newBalance })
        .eq("user_id", user.id);
      setBalance(newBalance);

      const updatedBet = { ...currentBetRef.current, cashed_out_at: m, payout };
      setCurrentBet(updatedBet);
      currentBetRef.current = updatedBet;

      // Track win
      updateStats(true, updatedBet.bet_amount, payout, m);

      toast.success(`Retirou em ${m.toFixed(2)}x! Ganhou R$ ${payout.toFixed(2)}`);
    } catch {
      toast.error("Erro ao retirar.");
    } finally {
      setIsProcessing(false);
    }
  }, [user, updateStats]);

  // Start game loop on mount
  useEffect(() => {
    startWaiting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sessionDuration = useMemo(() => {
    return Math.floor((Date.now() - sessionStats.sessionStart) / 60000);
  }, [sessionStats.sessionStart, sessionStats.roundsPlayed]);

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
    sessionStats,
    sessionDuration,
    betHistory,
    placeBet,
    cancelBet,
    cashOut,
    loadBalance,
  };
}
