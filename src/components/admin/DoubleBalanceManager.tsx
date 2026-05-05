import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useEnvironment } from "@/hooks/useEnvironment";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Coins, Plus, Minus } from "lucide-react";

interface UserProfile {
  user_id: string;
  full_name: string | null;
}

export function DoubleBalanceManager() {
  const queryClient = useQueryClient();
  const { environment } = useEnvironment();
  const currentEnv = environment || "barcarena";
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [amount, setAmount] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles-for-double", currentEnv],
    queryFn: async () => {
      // Filter profiles by those who have access to the current environment
      const { data: access, error: accessError } = await supabase
        .from("user_environment_access")
        .select("user_id")
        .eq("environment", currentEnv);

      if (accessError) throw accessError;
      const userIds = access.map(a => a.user_id);

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds)
        .order("full_name");
      if (error) throw error;
      return data as UserProfile[];
    },
  });

  const { data: currentBalance } = useQuery({
    queryKey: ["double-balance-admin", selectedUser?.user_id, currentEnv],
    queryFn: async () => {
      if (!selectedUser) return null;
      const { data, error } = await supabase
        .from("double_balances")
        .select("balance")
        .eq("user_id", selectedUser.user_id)
        .eq("environment", currentEnv)
        .maybeSingle();
      if (error) throw error;
      return data?.balance ?? 0;
    },
    enabled: !!selectedUser,
  });

  const updateBalance = useMutation({
    mutationFn: async ({ userId, newBalance }: { userId: string; newBalance: number }) => {
      const { data: existing } = await supabase
        .from("double_balances")
        .select("id")
        .eq("user_id", userId)
        .eq("environment", currentEnv)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("double_balances")
          .update({ balance: newBalance })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("double_balances")
          .insert({ user_id: userId, balance: newBalance, environment: currentEnv });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["double-balance-admin", selectedUser?.user_id, currentEnv] });
      queryClient.invalidateQueries({ queryKey: ["double-balance"] });
      toast.success("Saldo atualizado com sucesso!");
      setAmount("");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  const handleAdd = () => {
    if (!selectedUser || !amount) return;
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return toast.error("Valor inválido");
    updateBalance.mutate({ userId: selectedUser.user_id, newBalance: (currentBalance ?? 0) + val });
  };

  const handleSet = () => {
    if (!selectedUser || !amount) return;
    const val = parseFloat(amount);
    if (isNaN(val) || val < 0) return toast.error("Valor inválido");
    updateBalance.mutate({ userId: selectedUser.user_id, newBalance: val });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="w-5 h-5" />
          Saldo Double
        </CardTitle>
        <CardDescription>Adicione ou defina o saldo de fichas do Double para qualquer usuário.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Selecionar Usuário</Label>
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start font-normal h-10 mt-1">
                {selectedUser?.full_name || <span className="text-muted-foreground">Buscar usuário...</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
              <Command>
                <CommandInput placeholder="Buscar por nome..." />
                <CommandList>
                  <CommandEmpty>Nenhum encontrado</CommandEmpty>
                  {profiles.map(p => (
                    <CommandItem
                      key={p.user_id}
                      onSelect={() => {
                        setSelectedUser(p);
                        setPopoverOpen(false);
                      }}
                    >
                      {p.full_name || "Sem nome"}
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {selectedUser && (
          <>
            <div className="text-sm">
              Saldo atual: <span className="font-bold text-primary">R$ {(currentBalance ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                min={0}
                step={100}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Ex: 5000"
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={updateBalance.isPending} className="gap-1">
                <Plus className="w-4 h-4" /> Adicionar ao saldo
              </Button>
              <Button onClick={handleSet} variant="secondary" disabled={updateBalance.isPending} className="gap-1">
                <Coins className="w-4 h-4" /> Definir saldo
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
