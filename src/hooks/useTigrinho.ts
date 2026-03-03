import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const SYMBOL_KEYS = ["tiger", "gold", "coins", "envelope", "lantern", "firecracker", "bag", "diamond"];

interface TigrinhoBet {
  id: string;
  bet_amount: number;
  multiplier: number;
  payout: number;
  result_symbols: string[];
  created_at: string;
}

interface Outcome {
  multiplier: number;
  weight: number;
}

// Base: 70% loss, 30% win distributed among multipliers
const BASE_OUTCOMES: Outcome[] = [
  { multiplier: 0, weight: 70 },
  { multiplier: 2, weight: 16 },
  { multiplier: 5, weight: 8 },
  { multiplier: 10, weight: 4 },
  { multiplier: 50, weight: 1.7 },
  { multiplier: 100, weight: 0.3 },
];

// Oscillating outcomes: every 5 min cycle between tighter and looser
function getOutcomes(): Outcome[] {
  const cycleMs = 5 * 60 * 1000; // 5 minutes
  const phase = Math.floor(Date.now() / cycleMs) % 4;
  // phase 0: base (70/30), phase 1: tight (78/22), phase 2: loose (62/38), phase 3: base again
  const oscillation = [0, 8, -8, 0][phase];
  const lossWeight = 70 + oscillation;
  const winScale = (100 - lossWeight) / 30; // scale remaining win weights
  return [
    { multiplier: 0, weight: lossWeight },
    { multiplier: 2, weight: 16 * winScale },
    { multiplier: 5, weight: 8 * winScale },
    { multiplier: 10, weight: 4 * winScale },
    { multiplier: 50, weight: 1.7 * winScale },
    { multiplier: 100, weight: 0.3 * winScale },
  ];
}

function pickOutcome(): number {
  const outcomes = getOutcomes();
  const totalWeight = outcomes.reduce((s, o) => s + o.weight, 0);
  let r = Math.random() * totalWeight;
  for (const o of outcomes) {
    r -= o.weight;
    if (r <= 0) return o.multiplier;
  }
  return 0;
}

function generateReelSymbols(multiplier: number): string[][] {
  const grid: string[][] = [];
  if (multiplier >= 10) {
    const winSymbol = SYMBOL_KEYS[Math.floor(Math.random() * 3)];
    for (let row = 0; row < 3; row++) {
      const r: string[] = [];
      for (let col = 0; col < 3; col++) {
        r.push(row === 1 ? winSymbol : SYMBOL_KEYS[Math.floor(Math.random() * SYMBOL_KEYS.length)]);
      }
      grid.push(r);
    }
  } else if (multiplier >= 2) {
    const winSymbol = SYMBOL_KEYS[Math.floor(Math.random() * SYMBOL_KEYS.length)];
    const winRow = Math.floor(Math.random() * 3);
    for (let row = 0; row < 3; row++) {
      const r: string[] = [];
      for (let col = 0; col < 3; col++) {
        if (row === winRow) {
          r.push(col < 2 ? winSymbol : (Math.random() > 0.5 ? winSymbol : SYMBOL_KEYS[Math.floor(Math.random() * SYMBOL_KEYS.length)]));
        } else {
          r.push(SYMBOL_KEYS[Math.floor(Math.random() * SYMBOL_KEYS.length)]);
        }
      }
      grid.push(r);
    }
  } else {
    for (let row = 0; row < 3; row++) {
      const r: string[] = [];
      const used = new Set<string>();
      for (let col = 0; col < 3; col++) {
        let s: string;
        do { s = SYMBOL_KEYS[Math.floor(Math.random() * SYMBOL_KEYS.length)]; } while (used.has(s) && used.size < SYMBOL_KEYS.length);
        used.add(s);
        r.push(s);
      }
      grid.push(r);
    }
  }
  return grid;
}

export function useTigrinho() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [spinning, setSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<{ multiplier: number; payout: number; symbols: string[][] } | null>(null);
  const [betAmount, setBetAmount] = useState(10);

  const { data: balance = 1000 } = useQuery({
    queryKey: ["tigrinho-balance", user?.id],
    queryFn: async () => {
      if (!user?.id) return 1000;
      const { data } = await supabase.from("double_balances").select("balance").eq("user_id", user.id).maybeSingle();
      if (!data) {
        await supabase.from("double_balances").insert({ user_id: user.id, balance: 1000 });
        return 1000;
      }
      return data.balance;
    },
    enabled: !!user?.id,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["tigrinho-history", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("tigrinho_bets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data || []) as unknown as TigrinhoBet[];
    },
    enabled: !!user?.id,
  });

  const play = useCallback(async () => {
    if (!user?.id || spinning) return;
    if (betAmount > balance) { toast.error("Saldo insuficiente!"); return; }
    if (betAmount <= 0) { toast.error("Aposta inválida!"); return; }

    setSpinning(true);
    setLastResult(null);

    const multiplier = pickOutcome();
    const payout = multiplier * betAmount;
    const symbols = generateReelSymbols(multiplier);
    const newBalance = balance - betAmount + payout;

    try {
      await supabase.from("double_balances").update({ balance: newBalance }).eq("user_id", user.id);
      await supabase.from("tigrinho_bets").insert({
        user_id: user.id,
        user_name: "Jogador",
        bet_amount: betAmount,
        multiplier,
        payout,
        result_symbols: symbols.flat(),
      });

      await new Promise((r) => setTimeout(r, 1800));

      setLastResult({ multiplier, payout, symbols });
      queryClient.invalidateQueries({ queryKey: ["tigrinho-balance"] });
      queryClient.invalidateQueries({ queryKey: ["tigrinho-history"] });

      if (multiplier >= 10) toast.success(`🐯 GRANDE VITÓRIA! x${multiplier} — +${payout} moedas!`);
      else if (multiplier > 0) toast.success(`Ganhou x${multiplier} — +${payout} moedas!`);
    } catch {
      toast.error("Erro ao processar aposta");
    } finally {
      setSpinning(false);
    }
  }, [user?.id, spinning, betAmount, balance, queryClient]);

  return { balance, betAmount, setBetAmount, spinning, lastResult, play, history };
}
