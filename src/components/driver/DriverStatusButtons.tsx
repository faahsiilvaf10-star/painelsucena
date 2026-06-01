import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Play, 
  Clock, 
  CloudRain, 
  Fuel, 
  Loader2,
  Power,
  Gauge,
  Car,
  Info,
  AlertCircle,
  WifiOff
} from "lucide-react";
import { useEquipment, useUpdateEquipmentStatus, useEquipmentStopHistory, type StopReason } from "@/hooks/useEquipment";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FuelLevelGauge, type FuelLevel } from "./FuelLevelGauge";
import { useOfflineSyncV2 } from "@/hooks/useOfflineSyncV2";
import { useCreateShiftRecord, useUpdateShiftRecord, useAddStatusToHistory } from "@/hooks/useDailyShiftRecords";
import { useCreateEquipmentMovement } from "@/hooks/useEquipmentMovements";
import { generateAndUploadParteDiariaPng } from "@/lib/parteDiariaShare";

type DriverStopReason = StopReason;

interface StatusButton {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  action: DriverStopReason;
}

const statusButtons: StatusButton[] = [
  {
    id: "none",
    label: "Operar",
    icon: <Play className="h-6 w-6" />,
    color: "bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white",
    action: "none",
  },
  {
    id: "waiting",
    label: "Aguardando",
    icon: <Clock className="h-6 w-6" />,
    color: "bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-white",
    action: "waiting",
  },
  {
    id: "rain",
    label: "Chuva",
    icon: <CloudRain className="h-6 w-6" />,
    color: "bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white",
    action: "rain",
  },
  {
    id: "end_of_day",
    label: "Abastecendo",
    icon: <Fuel className="h-6 w-6" />,
    color: "bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white",
    action: "end_of_day",
  },
];

const getStatusLabel = (stopReason: string | null) => {
  switch (stopReason) {
    case "none":
    case null:
      return { label: "Operando", color: "bg-green-500" };
    case "waiting":
      return { label: "Aguardando Frente", color: "bg-yellow-500" };
    case "rain":
      return { label: "Parado (Chuva)", color: "bg-blue-500" };
    case "end_of_day":
      return { label: "Abastecendo", color: "bg-orange-500" };
    case "maintenance":
      return { label: "Manutenção", color: "bg-red-500" };
    case "end_of_shift":
      return { label: "Fim de Turno", color: "bg-gray-500" };
    default:
      return { label: "Parado", color: "bg-gray-500" };
  }
};

export function DriverStatusButtons() {
  const navigate = useNavigate();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [fuelLevel, setFuelLevel] = useState<FuelLevel>("half");
  const [showEndShiftDialog, setShowEndShiftDialog] = useState(false);
  const [showStartShiftDialog, setShowStartShiftDialog] = useState(false);
  const [endShiftFuelLevel, setEndShiftFuelLevel] = useState<FuelLevel>("half");
  const [endShiftHorimeter, setEndShiftHorimeter] = useState("");
  const [endShiftKm, setEndShiftKm] = useState("");
  const [startShiftHorimeter, setStartShiftHorimeter] = useState("");
  const [startShiftKm, setStartShiftKm] = useState("");
  const [initialHorimeter, setInitialHorimeter] = useState<string | null>(null);
  const [initialKm, setInitialKm] = useState<string | null>(null);
  const [endShiftError, setEndShiftError] = useState<string | null>(null);
  const { data: equipment = [], isLoading } = useEquipment();
  const { data: profile } = useProfile();
  const updateStatus = useUpdateEquipmentStatus();
  const { data: stopHistory = [] } = useEquipmentStopHistory(selectedVehicleId || undefined);
  const { isOnline, addPendingAction } = useOfflineSyncV2();
  const createShiftRecord = useCreateShiftRecord();
  const updateShiftRecord = useUpdateShiftRecord();
  const addStatusToHistory = useAddStatusToHistory();
  const createEquipmentMovement = useCreateEquipmentMovement();

  // Activity timer - counts elapsed time since current status was selected
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const vehicleId = localStorage.getItem("selectedVehicleId");
    setSelectedVehicleId(vehicleId);
    
    // Load initial values from localStorage if they exist
    if (vehicleId) {
      const storedHorimeter = localStorage.getItem(`shift_horimeter_${vehicleId}`);
      const storedKm = localStorage.getItem(`shift_km_${vehicleId}`);
      setInitialHorimeter(storedHorimeter);
      setInitialKm(storedKm);

      // Rehydrate from DB: if there's an open daily_shift_record for today
      // (no shift_end_time), the shift is already active even if localStorage
      // was wiped (e.g. cleared cache, different device). This prevents
      // registering "Iniciar Turno" twice — only Fim de Turno can re-enable it.
      (async () => {
        try {
          const today = new Date().toISOString().split("T")[0];
          const { data, error } = await (supabase as any)
            .from("daily_shift_records")
            .select("initial_horimeter, initial_km, shift_start_time, shift_end_time")
            .eq("equipment_id", vehicleId)
            .eq("shift_date", today)
            .is("shift_end_time", null)
            .maybeSingle();
          if (error || !data) return;
          if (data.initial_horimeter != null) {
            const h = String(data.initial_horimeter);
            localStorage.setItem(`shift_horimeter_${vehicleId}`, h);
            setInitialHorimeter(h);
          }
          if (data.initial_km != null) {
            const k = String(data.initial_km);
            localStorage.setItem(`shift_km_${vehicleId}`, k);
            setInitialKm(k);
          }
          if (data.shift_start_time) {
            const ts = new Date(data.shift_start_time).getTime();
            localStorage.setItem(`shift_start_time_${vehicleId}`, ts.toString());
          }
        } catch (e) {
          console.warn("rehydrate shift from DB failed", e);
        }
      })();
    }
  }, []);


  const selectedVehicle = equipment.find((eq) => eq.id === selectedVehicleId);
  const currentStatus = (selectedVehicle?.stop_reason || "none") as string;
  const statusInfo = getStatusLabel(currentStatus);
  
  // Check if equipment is in maintenance mode (blocks all other buttons except "Operar")
  const isInMaintenance = currentStatus === "maintenance";
  
  // Check if shift has been started (has initial values)
  const shiftStarted = initialHorimeter !== null && initialKm !== null;

  // Status "Operando" só aparece após o motorista clicar em "Operar".
  // Antes disso (logo após Iniciar Turno) o badge fica em branco.
  const operatingActivated = selectedVehicleId
    ? localStorage.getItem(`operating_activated_${selectedVehicleId}`) === "1"
    : false;
  const showStatusBadge =
    shiftStarted && (currentStatus !== "none" || operatingActivated);

  // Get the current active stop from history (ended_at is null)
  const activeStop = stopHistory.find((h) => h.ended_at === null);

  // Timer effect: start counting from stop_start_time or shift start
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Don't run timer if end_of_shift or no vehicle or shift not started
    if (!selectedVehicle || currentStatus === "end_of_shift" || !shiftStarted) {
      setElapsedSeconds(0);
      return;
    }

    const shiftStartKey = `shift_start_time_${selectedVehicleId}`;
    let referenceTime: number | null = null;

    if (currentStatus !== "none" && selectedVehicle.stop_start_time) {
      // For non-operating statuses, use stop_start_time
      referenceTime = new Date(selectedVehicle.stop_start_time).getTime();
    } else {
      // For "Operando" (none), use localStorage timestamp
      const stored = localStorage.getItem(shiftStartKey);
      if (stored) {
        referenceTime = parseInt(stored, 10);
      } else {
        // Fallback: save current time as start and use it
        const now = Date.now();
        localStorage.setItem(shiftStartKey, now.toString());
        referenceTime = now;
      }
    }

    if (!referenceTime) {
      setElapsedSeconds(0);
      return;
    }

    const tick = () => {
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - referenceTime!) / 1000)));
    };

    tick();
    timerRef.current = setInterval(tick, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [selectedVehicle?.stop_start_time, currentStatus, selectedVehicleId, selectedVehicle, shiftStarted]);

  const formatElapsedTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const validateEndShiftValues = (): boolean => {
    setEndShiftError(null);
    
    if (initialHorimeter && endShiftHorimeter) {
      const initialH = parseFloat(initialHorimeter);
      const finalH = parseFloat(endShiftHorimeter);
      if (finalH < initialH) {
        setEndShiftError(`Horímetro final (${finalH}) deve ser maior ou igual ao inicial (${initialH})`);
        return false;
      }
    }
    
    if (initialKm && endShiftKm) {
      const initialK = parseFloat(initialKm);
      const finalK = parseFloat(endShiftKm);
      if (finalK < initialK) {
        setEndShiftError(`KM final (${finalK}) deve ser maior ou igual ao inicial (${initialK})`);
        return false;
      }
    }
    
    return true;
  };

  const handleEndOfShift = async () => {
    if (!selectedVehicleId || !selectedVehicle) {
      toast.error("Nenhum veículo selecionado");
      return;
    }

    if (!validateEndShiftValues()) {
      return;
    }

    setIsUpdating(true);
    // Limpa flag de "Operando" — próximo turno começa com badge em branco
    if (selectedVehicleId) {
      localStorage.removeItem(`operating_activated_${selectedVehicleId}`);
    }
    try {
      const now = new Date().toISOString();
      const today = now.split("T")[0];

      // Update the equipment status to end_of_shift
      await updateStatus.mutateAsync({
        id: selectedVehicleId,
        stop_reason: "end_of_shift" as any,
        stop_start_time: now,
        previousStopReason: currentStatus as any,
        previousStopStartTime: selectedVehicle.stop_start_time,
        changed_by_driver: profile?.full_name || null,
      });

      // Upsert daily_shift_record com valores finais. Se o registro não existir
      // (ex.: motorista não clicou em iniciar turno), cria agora a partir dos
      // valores de localStorage para que o trigger notify_daily_shift_finalized
      // dispare a mensagem ao grupo e a Parte Diária possa ser gerada.
      const initialHorimeterLs = localStorage.getItem(`shift_horimeter_${selectedVehicleId}`) || null;
      const initialKmLs = localStorage.getItem(`shift_km_${selectedVehicleId}`) || null;
      const shiftStartLs = localStorage.getItem(`shift_start_time_${selectedVehicleId}`);
      const shiftStartIso = shiftStartLs ? new Date(parseInt(shiftStartLs, 10)).toISOString() : now;

      const { data: savedShiftRecord, error: upsertErr } = await (supabase as any)
        .from("daily_shift_records")
        .upsert(
          {
            equipment_id: selectedVehicleId,
            equipment_name: selectedVehicle.name,
            plate: selectedVehicle.plate,
            shift_date: today,
            driver_name: profile?.full_name || selectedVehicle.driver || "—",
            initial_horimeter: initialHorimeterLs ? parseFloat(initialHorimeterLs) : null,
            initial_km: initialKmLs ? parseFloat(initialKmLs) : null,
            shift_start_time: shiftStartIso,
            final_horimeter: endShiftHorimeter ? parseFloat(endShiftHorimeter) : null,
            final_km: endShiftKm ? parseFloat(endShiftKm) : null,
            final_fuel_level: endShiftFuelLevel,
            shift_end_time: now,
          },
          { onConflict: "equipment_id,shift_date", ignoreDuplicates: false }
        )
        .select("id")
        .maybeSingle();
      if (upsertErr) {
        console.error("Falha ao upsert daily_shift_records:", upsertErr);
        throw new Error(`Erro ao salvar parte diária: ${upsertErr.message}`);
      }

      // Garante dados frescos do equipamento para decidir/gerar PNG.
      const { data: freshEquipment } = await supabase
        .from("equipment")
        .select("*")
        .eq("id", selectedVehicleId)
        .maybeSingle();
      const equipmentForPng = (freshEquipment as any) || selectedVehicle;
      // Parte Diária PNG é gerada para TODOS os equipamentos no fim de turno (padrão).
      const shouldGeneratePng = true;
      let parteDiariaUrl: string | null = null;
      if (shouldGeneratePng) {
        toast.info("Gerando Parte Diária para envio...");
        let lastErr: any = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            parteDiariaUrl = await generateAndUploadParteDiariaPng(equipmentForPng as any);
            if (parteDiariaUrl) break;
          } catch (e: any) {
            lastErr = e;
            console.error(`parte diária png tentativa ${attempt} falhou`, e);
            await new Promise((r) => setTimeout(r, 700));
          }
        }
        if (!parteDiariaUrl) {
          toast.error(`Falha ao gerar PNG da Parte Diária: ${lastErr?.message || lastErr || "erro desconhecido"}. Enviando somente texto.`, { duration: 8000 });
        }
      }


      if (parteDiariaUrl) {
        try {
          const notifyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-driver-status-notify`;
          const resp = await fetch(notifyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            keepalive: true,
            body: JSON.stringify({
              equipmentId: selectedVehicleId,
              equipmentName: selectedVehicle.name,
              plate: selectedVehicle.plate,
              newStatus: "end_of_shift",
              previousStatus: currentStatus,
              driverName: profile?.full_name || null,
              extraInfo: `*Combustível final:* ${getFuelLevelLabel(endShiftFuelLevel)}${endShiftHorimeter ? `\n*Horímetro:* ${endShiftHorimeter}` : ""}${endShiftKm ? `\n*KM:* ${endShiftKm}` : ""}`,
              shiftRecordId: savedShiftRecord?.id || null,
              imageUrl: parteDiariaUrl,
              imageCaption: `📄 *PARTE DIÁRIA*\n${selectedVehicle.name} — ${selectedVehicle.plate}\nMotorista: ${profile?.full_name || "—"}`,
            }),
          });
          if (!resp.ok) {
            const txt = await resp.text().catch(() => "");
            console.warn("driver-status-notify HTTP", resp.status, txt);
          }
        } catch (e: any) {
          console.warn("driver-status-notify failed", e);
          toast.error(`Falha ao enviar status ao grupo: ${e?.message || e}`, { duration: 6000 });
        }
      }


      // Fim de Turno does NOT register as equipment exit (saída)
      // The equipment remains on site, only the shift ends

      // Clear the driver field from the equipment
      await supabase
        .from("equipment")
        .update({ driver: "" })
        .eq("id", selectedVehicleId);

      // Clear the selected vehicle and shift data from localStorage
      localStorage.removeItem("selectedVehicleId");
      localStorage.removeItem(`shift_horimeter_${selectedVehicleId}`);
      localStorage.removeItem(`shift_km_${selectedVehicleId}`);
      localStorage.removeItem(`shift_start_time_${selectedVehicleId}`);
      setElapsedSeconds(0);

      setShowEndShiftDialog(false);
      
      const details = [
        `Combustível: ${getFuelLevelLabel(endShiftFuelLevel)}`,
        endShiftHorimeter && `Horímetro: ${endShiftHorimeter}`,
        endShiftKm && `KM: ${endShiftKm}`,
      ].filter(Boolean).join(" | ");
      
      toast.success(`Fim de turno registrado. ${details}`);
      
      // Navigate to vehicle selection page
      navigate("/selecao-veiculo", { replace: true });
    } catch (error) {
      console.error("Error ending shift:", error);
      toast.error("Erro ao registrar fim de turno");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStartShift = async () => {
    if (!selectedVehicleId || !selectedVehicle) {
      toast.error("Nenhum veículo selecionado");
      return;
    }

    if (!startShiftHorimeter || !startShiftKm) {
      toast.error("Preencha o Horímetro e KM inicial");
      return;
    }

    setIsUpdating(true);
    try {
      // Defensive guard: block double "Iniciar Turno" — if there is already an
      // open daily_shift_record for today (no shift_end_time), the driver must
      // register Fim de Turno first.
      try {
        const today = new Date().toISOString().split("T")[0];
        const { data: openShift, error: shiftError } = await (supabase as any)
          .from("daily_shift_records")
          .select("id")
          .eq("equipment_id", selectedVehicleId)
          .eq("shift_date", today)
          .is("shift_end_time", null)
          .maybeSingle();
        
        if (shiftError) {
          console.warn("Error checking for open shift:", shiftError);
        } else if (openShift?.id) {
          toast.error("Turno já iniciado hoje. Registre Fim de Turno antes de iniciar novamente.");
          setShowStartShiftDialog(false);
          setIsUpdating(false);
          return;
        }
      } catch (e) {
        console.warn("open-shift guard check failed", e);
      }

      const now = new Date().toISOString();

      // Save initial values to localStorage
      localStorage.setItem(`shift_horimeter_${selectedVehicleId}`, startShiftHorimeter);
      localStorage.setItem(`shift_km_${selectedVehicleId}`, startShiftKm);
      localStorage.setItem(`shift_start_time_${selectedVehicleId}`, Date.now().toString());
      setInitialHorimeter(startShiftHorimeter);
      setInitialKm(startShiftKm);

      // Create daily shift record in the database
      await createShiftRecord.mutateAsync({
        equipment_id: selectedVehicleId,
        equipment_name: selectedVehicle.name,
        plate: selectedVehicle.plate,
        driver_name: profile?.full_name || "Motorista",
        helper_name: selectedVehicle.helper || undefined,
        initial_horimeter: parseFloat(startShiftHorimeter),
        initial_km: parseFloat(startShiftKm),
        initial_fuel_level: fuelLevel,
      });

      // Entry movements are no longer registered automatically at shift start
      // Only exit movements (saída) are tracked in the movements system

      // Notifica o grupo sobre o INÍCIO de TURNO (sem definir status Operando).
      // O status só vai para "Operando" quando o motorista clicar em "Operar".
      try {
        if (isOnline) {
          await supabase.functions.invoke("wapi-driver-status-notify", {
            body: {
              equipmentId: selectedVehicleId,
              equipmentName: selectedVehicle.name,
              plate: selectedVehicle.plate,
              newStatus: "shift_start",
              previousStatus: "shift_start",
              driverName: profile?.full_name || null,
              extraInfo: `*Combustível:* ${getFuelLevelLabel(fuelLevel)}\n*Horímetro:* ${startShiftHorimeter}\n*KM:* ${startShiftKm}`,
            },
          });
        }
      } catch (e) {
        console.warn("driver-status-notify failed", e);
      }

      // Limpa qualquer status anterior — fica em branco até motorista clicar em "Operar"
      localStorage.removeItem(`operating_activated_${selectedVehicleId}`);
      
      if (isOnline) {
        await updateStatus.mutateAsync({
          id: selectedVehicleId,
          stop_reason: null as any,
          stop_start_time: null,
          previousStopReason: currentStatus as any,
          previousStopStartTime: selectedVehicle.stop_start_time,
          changed_by_driver: profile?.full_name || null,
        });
      } else {
        await addPendingAction("equipment_status", {
          id: selectedVehicleId,
          stop_reason: null,
          stop_start_time: null,
        });
      }

      setShowStartShiftDialog(false);
      toast.success(`Turno iniciado! Horímetro: ${startShiftHorimeter} | KM: ${startShiftKm}`);

    } catch (error) {
      console.error("Error starting shift:", error);
      toast.error("Erro ao iniciar turno");
    } finally {
      setIsUpdating(false);
    }
  };

  const getFuelLevelLabel = (level: FuelLevel): string => {
    const labels: Record<FuelLevel, string> = {
      empty: "Vazio",
      quarter: "1/4",
      half: "1/2",
      three_quarters: "3/4",
      full: "Cheio",
    };
    return labels[level];
  };

  const openStartShiftDialog = async () => {
    if (!selectedVehicleId) {
      toast.error("Nenhum veículo selecionado");
      return;
    }
    setStartShiftHorimeter("");
    setStartShiftKm("");
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: prevShift } = await supabase
        .from("daily_shift_records")
        .select("final_horimeter, final_km, initial_horimeter, initial_km")
        .eq("equipment_id", selectedVehicleId)
        .lt("shift_date", today)
        .order("shift_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (prevShift) {
        const horimeter = prevShift.final_horimeter ?? prevShift.initial_horimeter;
        const km = prevShift.final_km ?? prevShift.initial_km;
        if (horimeter) setStartShiftHorimeter(String(horimeter));
        if (km) setStartShiftKm(String(km));
      }
    } catch (err) {
      console.error("Error fetching previous shift data:", err);
    }
    setShowStartShiftDialog(true);
  };



  const handleStatusChange = async (newStatus: DriverStopReason) => {
    if (!selectedVehicleId || !selectedVehicle) {
      toast.error("Nenhum veículo selecionado");
      return;
    }

    // Handle end_of_shift - show dialog instead of immediate action
    if (newStatus === "end_of_shift") {
      // Bloqueia Fim de Turno se o motorista ainda não iniciou o turno
      if (!shiftStarted) {
        toast.error("Você precisa iniciar o turno antes de registrar Fim de Turno");
        return;
      }
      setEndShiftFuelLevel("half"); // Reset to default
      setEndShiftHorimeter(initialHorimeter || ""); // Pre-fill with initial value
      setEndShiftKm(initialKm || ""); // Pre-fill with initial value
      setEndShiftError(null);
      setShowEndShiftDialog(true);
      return;
    }

    // Block any status change if shift has not been started
    if (!shiftStarted) {
      toast.error("Inicie o turno antes de alterar o status");
      return;
    }

    setIsUpdating(true);
    // Marca que o motorista ativou um status manualmente — habilita o badge "Operando"
    if (selectedVehicleId) {
      localStorage.setItem(`operating_activated_${selectedVehicleId}`, "1");
    }
    const now = new Date().toISOString();
    const statusLabels: Record<string, string> = {
      none: "Operando",
      waiting: "Aguardando Frente",
      rain: "Parado por Chuva",
      end_of_day: "Abastecendo",
      end_of_shift: "Fim de Turno",
    };

    // If offline, save action locally
    if (!isOnline) {
      addPendingAction("equipment_status", {
        id: selectedVehicleId,
        stop_reason: newStatus,
        stop_start_time: newStatus !== "none" ? now : null,
      });
      
      // Also save stop history action
      if (newStatus !== "none") {
        addPendingAction("stop_history", {
          equipment_id: selectedVehicleId,
          stop_reason: newStatus,
          started_at: now,
          changed_by_driver: profile?.full_name || null,
        });
      }
      
      toast.success(
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span>Salvo offline: {statusLabels[newStatus] || newStatus}</span>
        </div>
      );
      setIsUpdating(false);
      return;
    }

    try {
      await updateStatus.mutateAsync({
        id: selectedVehicleId,
        stop_reason: newStatus as any,
        stop_start_time: newStatus !== "none" ? now : null,
        previousStopReason: currentStatus as any,
        previousStopStartTime: selectedVehicle.stop_start_time,
        changed_by_driver: profile?.full_name || null,
      });

      // Sync status change with daily_shift_records for Parte Diária
      await addStatusToHistory.mutateAsync({
        equipmentId: selectedVehicleId,
        status: newStatus === "none" ? "operando" : newStatus,
        changedBy: profile?.full_name || null,
      });

      // Fire-and-forget WhatsApp group notification
      supabase.functions.invoke("wapi-driver-status-notify", {
        body: {
          equipmentId: selectedVehicleId,
          equipmentName: selectedVehicle.name,
          plate: selectedVehicle.plate,
          newStatus,
          previousStatus: currentStatus,
          driverName: profile?.full_name || null,
        },
      }).catch((e) => console.warn("driver-status-notify failed", e));

      toast.success(`Status alterado para: ${statusLabels[newStatus] || newStatus}`);
    } catch (error) {
      console.error("Error updating status:", error);
      
      // If online request fails, save offline
      addPendingAction("equipment_status", {
        id: selectedVehicleId,
        stop_reason: newStatus,
        stop_start_time: newStatus !== "none" ? now : null,
      });
      
      toast.warning("Erro de conexão. Alteração salva para sincronizar depois.");
    } finally {
      setIsUpdating(false);
    }
  };


  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!selectedVehicle) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          <p className="text-sm">Nenhum veículo selecionado</p>
          <p className="text-xs mt-1">Faça login novamente para selecionar um veículo</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-md">
        <CardHeader className="pb-3 px-4 pt-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold">Controle de Turno</CardTitle>
            {showStatusBadge && (
              <Badge className={`${statusInfo.color} text-white text-xs px-2.5 py-0.5`}>
                {statusInfo.label}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <span className="font-medium truncate">{selectedVehicle.name}</span>
            <span>•</span>
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{selectedVehicle.plate}</span>
          </div>
          {shiftStarted && activeStop && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Desde: {format(new Date(activeStop.started_at), "HH:mm", { locale: ptBR })}
            </p>
          )}
          {/* Activity Timer */}
          {shiftStarted && currentStatus !== "end_of_shift" && (
            <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1.5 bg-muted/50 rounded-md w-fit">
              <Timer className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-mono font-semibold text-foreground">
                {formatElapsedTime(elapsedSeconds)}
              </span>
              <span className="text-[10px] text-muted-foreground">na atividade</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4">
          {/* Offline Banner */}
          {!isOnline && (
            <Alert className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 py-2">
              <WifiOff className="h-4 w-4 text-orange-500" />
              <AlertDescription className="text-xs text-orange-700 dark:text-orange-300 ml-2">
                Modo offline - alterações serão sincronizadas quando conectar
              </AlertDescription>
            </Alert>
          )}

          {/* Fuel Level Gauge */}
          <div className="flex flex-col items-center gap-3 py-2">
            <FuelLevelGauge
              selectedLevel={fuelLevel}
              onLevelChange={setFuelLevel}
              disabled={isUpdating}
            />
          </div>

          {/* Maintenance Mode Alert */}
          {isInMaintenance && (
            <Alert className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 py-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-xs text-red-700 dark:text-red-300 ml-2">
                Equipamento em manutenção - apenas "Operar" disponível para retomar
              </AlertDescription>
            </Alert>
          )}

          {/* Start Shift Button - only when shift not started */}
          {!shiftStarted && (
            <Button
              variant="outline"
              className="w-full h-auto min-h-[60px] py-3 flex items-center justify-center gap-2 touch-manipulation transition-transform active:scale-95 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border-emerald-600"
              onClick={openStartShiftDialog}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Play className="h-5 w-5" />
              )}
              <span className="text-sm font-semibold">Iniciar Turno</span>
            </Button>
          )}

          {/* Status Control Buttons - Larger touch targets */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">

            {statusButtons.map((button) => {
              // If in maintenance, only "Operar" (none) button is enabled
              const isDisabledByMaintenance = isInMaintenance && button.action !== "none";
              const isCurrentStatus = currentStatus === button.action;
              
              return (
                <Button
                  key={button.id}
                  variant="outline"
                  className={`h-auto min-h-[60px] py-3 flex flex-col items-center gap-1.5 touch-manipulation transition-transform active:scale-95 ${
                    isCurrentStatus ? "ring-2 ring-primary ring-offset-2" : ""
                  } ${isDisabledByMaintenance ? "opacity-50 cursor-not-allowed bg-muted" : button.color}`}
                  onClick={() => handleStatusChange(button.action)}
                  disabled={isUpdating || isCurrentStatus || isDisabledByMaintenance}
                >
                  {isUpdating ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    button.icon
                  )}
                  <span className="text-xs font-semibold">{button.label}</span>
                </Button>
              );
            })}
          </div>

          {/* End of Shift Button - Prominent and easy to tap */}
          <Button
            variant="outline"
            className={`w-full h-auto min-h-[52px] py-3 flex items-center justify-center gap-2.5 touch-manipulation transition-transform active:scale-95 ${
              currentStatus === "end_of_shift" ? "ring-2 ring-primary ring-offset-2" : ""
            } ${isInMaintenance ? "opacity-50 cursor-not-allowed bg-muted" : "bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white border-gray-600"}`}
            onClick={() => handleStatusChange("end_of_shift" as StopReason)}
            disabled={isUpdating || currentStatus === "end_of_shift" || isInMaintenance}
          >
            {isUpdating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Power className="h-5 w-5" />
            )}
            <span className="text-sm font-semibold">Fim de Turno</span>
          </Button>
        </CardContent>
      </Card>

      {/* Start Shift Dialog with Horimeter and KM */}
      <Dialog open={showStartShiftDialog} onOpenChange={setShowStartShiftDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">

          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-emerald-500" />
              Iniciar Turno
            </DialogTitle>
            <DialogDescription>
              Informe os dados iniciais do equipamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Legend */}
            <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-xs text-blue-700 dark:text-blue-300">
                Registre o horímetro e quilometragem antes de iniciar o turno. 
                Estes valores serão usados para validação no fim do turno.
              </AlertDescription>
            </Alert>

            {/* Horimeter and KM inputs - auto-filled from previous day */}
            {startShiftHorimeter && startShiftKm && (
              <Alert className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
                <Info className="h-4 w-4 text-emerald-500" />
                <AlertDescription className="text-xs text-emerald-700 dark:text-emerald-300">
                  Valores preenchidos automaticamente com o final do dia anterior.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start-horimeter" className="text-xs flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5" />
                  Horímetro Inicial <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="start-horimeter"
                  type="number"
                  inputMode="decimal"
                  pattern="[0-9]*"
                  placeholder="Ex: 1234"
                  value={startShiftHorimeter}
                  onChange={(e) => setStartShiftHorimeter(e.target.value.replace(/[^\d.,]/g, ""))}
                  onFocus={(e) => setTimeout(() => e.currentTarget?.scrollIntoView({ block: "center", behavior: "smooth" }), 300)}
                  disabled={isUpdating}
                  className={`h-9 ${!startShiftHorimeter ? 'border-destructive/50 focus-visible:ring-destructive' : ''}`}
                  required
                />

                {!startShiftHorimeter && (
                  <p className="text-[10px] text-destructive">Campo obrigatório</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="start-km" className="text-xs flex items-center gap-1.5">
                  <Car className="h-3.5 w-3.5" />
                  KM Inicial <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="start-km"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Ex: 45678"
                  value={startShiftKm}
                  onChange={(e) => setStartShiftKm(e.target.value.replace(/\D/g, ""))}
                  onFocus={(e) => setTimeout(() => e.currentTarget?.scrollIntoView({ block: "center", behavior: "smooth" }), 300)}
                  disabled={isUpdating}
                  className={`h-9 ${!startShiftKm ? 'border-destructive/50 focus-visible:ring-destructive' : ''}`}
                  required
                />

                {!startShiftKm && (
                  <p className="text-[10px] text-destructive">Campo obrigatório</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowStartShiftDialog(false)}
              disabled={isUpdating}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleStartShift}
              disabled={isUpdating || !startShiftHorimeter || !startShiftKm}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Iniciar Turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End of Shift Dialog with Fuel Level, Horimeter and KM */}
      <Dialog open={showEndShiftDialog} onOpenChange={setShowEndShiftDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Power className="h-5 w-5" />
              Finalizar Turno
            </DialogTitle>
            <DialogDescription>
              Informe os dados finais do equipamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Fuel Level Gauge */}
            <div className="flex justify-center">
              <FuelLevelGauge
                selectedLevel={endShiftFuelLevel}
                onLevelChange={setEndShiftFuelLevel}
                disabled={isUpdating}
              />
            </div>

            {/* Legend showing initial values */}
            {(initialHorimeter || initialKm) && (
              <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                <Info className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                  <strong>Valores iniciais do turno:</strong>
                  <br />
                  Horímetro: {initialHorimeter || "N/A"} | KM: {initialKm || "N/A"}
                  <br />
                  <span className="text-[10px]">Os valores finais devem ser iguais ou maiores que os iniciais.</span>
                </AlertDescription>
              </Alert>
            )}

            {/* Error message */}
            {endShiftError && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {endShiftError}
                </AlertDescription>
              </Alert>
            )}

            {/* Horimeter and KM inputs - REQUIRED */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
              <div className="space-y-1.5">
                <Label htmlFor="horimeter" className="text-xs flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5" />
                  Horímetro Final <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="horimeter"
                  type="number"
                  inputMode="decimal"
                  pattern="[0-9]*"
                  placeholder={initialHorimeter ? `Mín: ${initialHorimeter}` : "Ex: 1234"}
                  value={endShiftHorimeter}
                  onChange={(e) => {
                    setEndShiftHorimeter(e.target.value.replace(/[^\d.,]/g, ""));
                    setEndShiftError(null);
                  }}
                  onFocus={(e) => setTimeout(() => e.currentTarget?.scrollIntoView({ block: "center", behavior: "smooth" }), 300)}
                  disabled={isUpdating}
                  className={`h-9 ${!endShiftHorimeter ? 'border-destructive/50 focus-visible:ring-destructive' : ''}`}
                  required
                />

                {!endShiftHorimeter && (
                  <p className="text-[10px] text-destructive">Campo obrigatório</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="km" className="text-xs flex items-center gap-1.5">
                  <Car className="h-3.5 w-3.5" />
                  KM Final <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="km"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder={initialKm ? `Mín: ${initialKm}` : "Ex: 45678"}
                  value={endShiftKm}
                  onChange={(e) => {
                    setEndShiftKm(e.target.value.replace(/\D/g, ""));
                    setEndShiftError(null);
                  }}
                  onFocus={(e) => setTimeout(() => e.currentTarget?.scrollIntoView({ block: "center", behavior: "smooth" }), 300)}
                  disabled={isUpdating}
                  className={`h-9 ${!endShiftKm ? 'border-destructive/50 focus-visible:ring-destructive' : ''}`}
                  required
                />

                {!endShiftKm && (
                  <p className="text-[10px] text-destructive">Campo obrigatório</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEndShiftDialog(false)}
              disabled={isUpdating}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEndOfShift}
              disabled={isUpdating || !endShiftHorimeter || !endShiftKm}
              className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Power className="h-4 w-4 mr-2" />
              )}
              Confirmar Fim de Turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
