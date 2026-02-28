import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";

export interface AviatorBet {
  id: string;
  round_id: string;
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  bet_amount: number;
  cashed_out_at: number | null;
  payout: number | null;
  created_at: string;
}

type GamePhase = "waiting" | "running" | "crashed";

// Generate a crash point using a provably-fair-ish distribution
function generateCrashPoint(): number {
  const r = Math.random();
  // House edge ~3%. E(crash) ≈ 1/(1-houseEdge)
  const houseEdge = 0.03;
  const crash = 1 / (1 - r * (1 - houseEdge));
  return Math.max(1.0, Math.round(crash * 100) / 100);
}

export function useAviator() {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  const [balance, setBalance] = useState(3000);
  const [phase, setPhase] = useState<GamePhase>("waiting");
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [bets, setBets] = useState<AviatorBet[]>([]);
  const [myBetActive, setMyBetActive] = useState(false);
  const [myBetAmount, setMyBetAmount] = useState(0);
  const [myCashedOut, setMyCashedOut] = useState(false);
  const [myCashOutMultiplier, setMyCashOutMultiplier] = useState(0);
  const [countdown, setCountdown] = useState(0);

  const phaseRef = useRef(phase);
  const crashPointRef = useRef(crashPoint);
  const multiplierRef = useRef(multiplier);
  const animFrameRef = useRef<number>();
  const startTimeRef = useRef(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  phaseRef.current = phase;
  crashPointRef.current = crashPoint;
  multiplierRef.current = multiplier;

  // Load balance
  useEffect(() => {
    if (!user?.id) return;
    const loadBalance = async () => {
      const { data } = await supabase
        .from("aviator_balances")
        .select("balance")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setBalance(Number(data.balance));
      } else {
        await supabase.from("aviator_balances").insert({ user_id: user.id, balance: 3000 });
        setBalance(3000);
      }
    };
    loadBalance();
  }, [user?.id]);

  const saveBalance = useCallback(async (newBalance: number) => {
    if (!user?.id) return;
    setBalance(newBalance);
    await supabase
      .from("aviator_balances")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
  }, [user?.id]);

  // Realtime channel for synchronization
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel("aviator-game", {
      config: { broadcast: { self: true } },
    });

    channel
      .on("broadcast", { event: "round_start" }, (payload) => {
        const cp = payload.payload.crashPoint as number;
        setCrashPoint(cp);
        crashPointRef.current = cp;
        setPhase("running");
        setMultiplier(1.0);
        setBets(payload.payload.bets || []);
        startTimeRef.current = Date.now();
        runMultiplier(cp);
      })
      .on("broadcast", { event: "round_crash" }, (payload) => {
        setPhase("crashed");
        setMultiplier(payload.payload.finalMultiplier);
        setHistory((prev) => [payload.payload.finalMultiplier, ...prev].slice(0, 30));
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        // Start countdown for next round
        setCountdown(7);
      })
      .on("broadcast", { event: "new_bet" }, (payload) => {
        setBets((prev) => [...prev, payload.payload.bet]);
      })
      .on("broadcast", { event: "cash_out" }, (payload) => {
        setBets((prev) =>
          prev.map((b) =>
            b.user_id === payload.payload.userId
              ? { ...b, cashed_out_at: payload.payload.multiplier, payout: payload.payload.payout }
              : b
          )
        );
      })
      .on("broadcast", { event: "countdown" }, (payload) => {
        setCountdown(payload.payload.seconds);
        if (payload.payload.seconds <= 0) {
          setPhase("waiting");
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const runMultiplier = useCallback((cp: number) => {
    const startTime = Date.now();
    startTimeRef.current = startTime;

    const tick = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      // Exponential growth: multiplier = e^(0.07*t)  gives ~2x at 10s, ~4x at 20s
      const m = Math.pow(Math.E, 0.07 * elapsed);
      const rounded = Math.round(m * 100) / 100;

      if (rounded >= cp) {
        setMultiplier(cp);
        setPhase("crashed");
        channelRef.current?.send({
          type: "broadcast",
          event: "round_crash",
          payload: { finalMultiplier: cp },
        });
        // Start next round countdown
        startCountdown();
        return;
      }

      setMultiplier(rounded);
      multiplierRef.current = rounded;
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const startCountdown = useCallback(() => {
    let seconds = 7;
    setCountdown(seconds);
    const interval = setInterval(() => {
      seconds--;
      setCountdown(seconds);
      channelRef.current?.send({
        type: "broadcast",
        event: "countdown",
        payload: { seconds },
      });
      if (seconds <= 0) {
        clearInterval(interval);
        // Auto-start next round
        startNewRound();
      }
    }, 1000);
  }, []);

  const startNewRound = useCallback(() => {
    const cp = generateCrashPoint();
    setCrashPoint(cp);
    crashPointRef.current = cp;
    setPhase("running");
    setMultiplier(1.0);
    setBets([]);
    setMyBetActive(false);
    setMyCashedOut(false);
    setMyCashOutMultiplier(0);

    channelRef.current?.send({
      type: "broadcast",
      event: "round_start",
      payload: { crashPoint: cp, bets: [] },
    });

    runMultiplier(cp);
  }, [runMultiplier]);

  // Auto-start first round
  useEffect(() => {
    if (!user?.id || !channelRef.current) return;
    const timer = setTimeout(() => {
      if (phaseRef.current === "waiting" || phaseRef.current === undefined) {
        startNewRound();
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [user?.id, startNewRound]);

  const placeBet = useCallback(async (amount: number) => {
    if (!user?.id || myBetActive || amount > balance || amount <= 0) return;

    const newBalance = balance - amount;
    await saveBalance(newBalance);

    setMyBetActive(true);
    setMyBetAmount(amount);
    setMyCashedOut(false);

    const bet: AviatorBet = {
      id: crypto.randomUUID(),
      round_id: "",
      user_id: user.id,
      user_name: profile?.full_name || "Jogador",
      avatar_url: profile?.avatar_url || null,
      bet_amount: amount,
      cashed_out_at: null,
      payout: null,
      created_at: new Date().toISOString(),
    };

    channelRef.current?.send({
      type: "broadcast",
      event: "new_bet",
      payload: { bet },
    });
  }, [user?.id, profile, myBetActive, balance, saveBalance]);

  const cashOut = useCallback(async () => {
    if (!user?.id || !myBetActive || myCashedOut) return;

    const currentMult = multiplierRef.current;
    const payout = Math.round(myBetAmount * currentMult * 100) / 100;

    setMyCashedOut(true);
    setMyCashOutMultiplier(currentMult);

    const newBalance = balance + payout;
    await saveBalance(newBalance);

    channelRef.current?.send({
      type: "broadcast",
      event: "cash_out",
      payload: { userId: user.id, multiplier: currentMult, payout },
    });
  }, [user?.id, myBetActive, myCashedOut, myBetAmount, balance, saveBalance]);

  // When round crashes, check if user had active bet
  useEffect(() => {
    if (phase === "crashed" && myBetActive && !myCashedOut) {
      // Lost the bet
      setMyBetActive(false);
    }
  }, [phase]);

  return {
    balance,
    phase,
    multiplier,
    crashPoint,
    history,
    bets,
    myBetActive,
    myBetAmount,
    myCashedOut,
    myCashOutMultiplier,
    countdown,
    placeBet,
    cashOut,
    startNewRound,
  };
}
