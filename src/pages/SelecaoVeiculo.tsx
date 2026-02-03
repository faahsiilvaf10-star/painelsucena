import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useEquipment, useUpdateEquipment } from "@/hooks/useEquipment";
import { useCreateEquipmentMovement } from "@/hooks/useEquipmentMovements";
import { VehicleIcon } from "@/components/equipamentos/VehicleIcons";
import { toast } from "sonner";

export default function SelecaoVeiculo() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: equipment = [], isLoading } = useEquipment();
  const updateEquipment = useUpdateEquipment();
  const createMovement = useCreateEquipmentMovement();
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Check if user already has a vehicle selected
  useEffect(() => {
    const savedVehicle = localStorage.getItem("selectedVehicleId");
    if (savedVehicle) {
      navigate("/painel-motorista", { replace: true });
    }
  }, [navigate]);

  // Filter equipment by type based on driver role
  const isPipaDriver = profile?.cargo === "motorista_pipa";
  const isMunkDriver = profile?.cargo === "motorista_munk";

  // Get vehicles matching driver type
  const availableVehicles = equipment.filter((eq) => {
    if (isPipaDriver) return eq.equipment_type === "pipa";
    if (isMunkDriver) return eq.equipment_type === "munk";
    return eq.equipment_type === "pipa" || eq.equipment_type === "munk";
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

      // Update the equipment with the driver's name
      await updateEquipment.mutateAsync({
        id: selectedVehicle,
        driver: profile.full_name,
      });

      // Register entry movement (equipment is now operating)
      await createMovement.mutateAsync({
        equipment_name: selectedEquipmentData.name,
        plate: selectedEquipmentData.plate,
        movement_type: "entrada",
        exit_reason: null,
        problem_description: null,
        observation: `Motorista ${profile.full_name} iniciou operação`,
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
    localStorage.removeItem("selectedVehicleId");
    await signOut();
    navigate("/auth");
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
    <div className="min-h-screen bg-background">
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

      <main className="p-4 max-w-lg mx-auto">
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

            {/* Confirm Button */}
            <div className="mt-6 pb-6">
              <Button
                className="w-full h-14 text-lg font-bold"
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
