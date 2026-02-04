import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, LogOut, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useEquipment } from "@/hooks/useEquipment";
import { useCreateEquipmentMovement } from "@/hooks/useEquipmentMovements";
import { VehicleIcon } from "@/components/equipamentos/VehicleIcons";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function SelecaoVeiculo() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: equipment = [], isLoading } = useEquipment();
  const createMovement = useCreateEquipmentMovement();
  const queryClient = useQueryClient();
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [helperName, setHelperName] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  // Check if user already has a vehicle selected
  useEffect(() => {
    const savedVehicle = localStorage.getItem("selectedVehicleId");
    if (savedVehicle) {
      navigate("/painel-motorista", { replace: true });
    }
  }, [navigate]);

  // Show only Pipa and Munk vehicles that don't have a driver assigned
  const availableVehicles = equipment.filter((eq) => {
    const isPipaOrMunk = eq.equipment_type === "pipa" || eq.equipment_type === "munk";
    const hasNoDriver = !eq.driver || eq.driver.trim() === "";
    return isPipaOrMunk && hasNoDriver;
  });

  const handleSelectVehicle = (vehicleId: string) => {
    setSelectedVehicle(vehicleId);
  };

  const handleConfirm = async () => {
    if (!selectedVehicle || !profile) return;

    setIsConfirming(true);
    
    try {
      const selectedEquipmentData = equipment.find(eq => eq.id === selectedVehicle);
      if (!selectedEquipmentData) return;

      // Update the equipment with the driver's name and helper (keep the current status)
      const { error: updateError } = await supabase
        .from("equipment")
        .update({
          driver: profile.full_name,
          helper: helperName.trim(),
        })
        .eq("id", selectedVehicle);

      if (updateError) throw updateError;

      // Invalidate equipment query to reflect changes
      queryClient.invalidateQueries({ queryKey: ["equipment"] });

      // Register entry movement (equipment is now operating)
      const helperInfo = helperName.trim() ? ` | Ajudante: ${helperName.trim()}` : "";
      await createMovement.mutateAsync({
        equipment_name: selectedEquipmentData.name,
        plate: selectedEquipmentData.plate,
        movement_type: "entrada",
        exit_reason: null,
        problem_description: null,
        observation: `Motorista ${profile.full_name} iniciou operação${helperInfo}`,
      });

      // Store selected vehicle in localStorage
      localStorage.setItem("selectedVehicleId", selectedVehicle);
      
      toast.success("Veículo selecionado e operação iniciada!");
      navigate("/painel-motorista");
    } catch (error) {
      console.error("Error confirming vehicle:", error);
      toast.error("Erro ao confirmar veículo");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleLogout = async () => {
    try {
      // If there was a selected vehicle, clear the driver field
      const savedVehicle = localStorage.getItem("selectedVehicleId");
      if (savedVehicle) {
        await supabase
          .from("equipment")
          .update({ driver: "", helper: "" })
          .eq("id", savedVehicle);
      }
      
      localStorage.removeItem("selectedVehicleId");
      await signOut();
      navigate("/auth");
    } catch (error) {
      console.error("Error during logout:", error);
      // Still try to sign out even if clearing driver failed
      localStorage.removeItem("selectedVehicleId");
      await signOut();
      navigate("/auth");
    }
  };

  const getVehicleTypeLabel = (type: string) => {
    switch (type) {
      case "pipa":
        return "Pipa";
      case "munk":
        return "Munk";
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b shadow-sm">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <Truck className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold">Seleção de Veículo</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full">
        {/* Welcome Message */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold mb-2">
            Olá, {profile?.full_name?.split(" ")[0] || "Motorista"}!
          </h2>
          <p className="text-muted-foreground">
            Selecione o veículo que você está operando hoje
          </p>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : availableVehicles.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Nenhum veículo disponível para seleção
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Vehicle Grid */}
            <div className="grid gap-3">
              {availableVehicles.map((vehicle) => (
                <Card
                  key={vehicle.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedVehicle === vehicle.id
                      ? "ring-2 ring-primary bg-primary/5 border-primary"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => handleSelectVehicle(vehicle.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-lg ${
                          selectedVehicle === vehicle.id
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <VehicleIcon 
                          type={vehicle.equipment_type as "pipa" | "munk" | "camionete" | "onibus"} 
                          size="lg" 
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{vehicle.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-mono bg-muted px-2 py-0.5 rounded">
                            {vehicle.plate}
                          </span>
                          <span>•</span>
                          <span>{getVehicleTypeLabel(vehicle.equipment_type)}</span>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedVehicle === vehicle.id
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        }`}
                      >
                        {selectedVehicle === vehicle.id && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Helper Name Input - Show only when vehicle is selected */}
            {selectedVehicle && (
              <Card className="mt-4 border-primary/30 bg-primary/5">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <UserPlus className="h-4 w-4 text-primary" />
                    <Label htmlFor="helper-name" className="text-sm font-semibold">
                      Nome do Ajudante (opcional)
                    </Label>
                  </div>
                  <Input
                    id="helper-name"
                    placeholder="Digite o nome do ajudante"
                    value={helperName}
                    onChange={(e) => setHelperName(e.target.value)}
                    className="h-10 text-sm"
                  />
                </CardContent>
              </Card>
            )}

            {/* Confirm Button */}
            <div className="mt-4 pb-6">
              <Button
                className="w-full h-12 text-base font-bold"
                disabled={!selectedVehicle || isConfirming}
                onClick={handleConfirm}
              >
                {isConfirming ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Truck className="h-5 w-5 mr-2" />
                )}
                {isConfirming ? "Confirmando..." : "Confirmar Veículo"}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
