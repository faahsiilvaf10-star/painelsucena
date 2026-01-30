import { useState } from "react";
import { Users, ClipboardCheck, AlertCircle } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import Layout from "@/components/layout/Layout";
import StatCard from "@/components/dashboard/StatCard";
import { DDSHighlightCard } from "@/components/dds/DDSHighlightCard";
import { ReminderHighlightBanner } from "@/components/reminders/ReminderHighlightBanner";
import { MatrixProgressChart } from "@/components/dashboard/MatrixProgressChart";
import { MatrixAlertBanner } from "@/components/dashboard/MatrixAlertBanner";
import { CampaignBanner } from "@/components/campaigns/CampaignBanner";
import { OrderHighlightBanner } from "@/components/orders/OrderHighlightBanner";
import { EquipmentStatusCard } from "@/components/dashboard/EquipmentStatusCard";
import { DocumentExpiryBanner } from "@/components/documents/DocumentExpiryBanner";
import { GoalAlertBanner } from "@/components/dashboard/GoalAlertBanner";
import { VehicleExpiryBanner } from "@/components/vistorias/VehicleExpiryBanner";
import { SlingInspectionBanner } from "@/components/dashboard/SlingInspectionBanner";
import { DraggableDashboardItem } from "@/components/dashboard/DraggableDashboardItem";
import { DashboardEditControls } from "@/components/dashboard/DashboardEditControls";
import BirthdayBanner from "@/components/dashboard/BirthdayBanner";
import DDSPresenterAlert from "@/components/dds/DDSPresenterAlert";
import { useCampaignNotifications } from "@/hooks/useCampaignNotifications";
import { useEmployees } from "@/hooks/useEmployees";
import { useAttendanceRecords } from "@/hooks/useAttendance";
import { getBrazilNorthTodayString } from "@/lib/timezone";
import { useDocumentExpiryNotifications } from "@/hooks/useDocumentExpiryNotifications";
import { useVehicleExpiryNotifications } from "@/hooks/useVehicleExpiryNotifications";
import { useDashboardOrder, DashboardItemId, DEFAULT_DASHBOARD_ORDER } from "@/hooks/useDashboardOrder";
import { toast } from "sonner";

const Dashboard = () => {
  const today = getBrazilNorthTodayString();
  const { data: employees } = useEmployees();
  const { data: attendanceRecords } = useAttendanceRecords(today);
  const { dashboardOrder, updateOrder, isLoading: isLoadingOrder } = useDashboardOrder();
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [localOrder, setLocalOrder] = useState<DashboardItemId[]>(dashboardOrder);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Check and create campaign notifications at start of month
  useCampaignNotifications();
  
  // Show browser notifications for expiring documents
  useDocumentExpiryNotifications();
  
  // Show browser notifications for expiring vehicle badges
  useVehicleExpiryNotifications();

  const totalEmployees = employees?.length || 0;
  const presentToday = attendanceRecords?.filter(a => a.status === "present" || a.status === "late").length || 0;
  const absentToday = attendanceRecords?.filter(a => a.status === "absent" || a.status === "justified").length || 0;

  const handleToggleEditMode = () => {
    if (!isEditMode) {
      setLocalOrder(dashboardOrder);
    }
    setIsEditMode(!isEditMode);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalOrder((items) => {
        const oldIndex = items.indexOf(active.id as DashboardItemId);
        const newIndex = items.indexOf(over.id as DashboardItemId);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await updateOrder(localOrder);
    setIsSaving(false);
    
    if (success) {
      toast.success("Ordem dos destaques salva!");
      setIsEditMode(false);
    } else {
      toast.error("Erro ao salvar ordem");
    }
  };

  const handleCancel = () => {
    setLocalOrder(dashboardOrder);
    setIsEditMode(false);
  };

  const handleReset = () => {
    setLocalOrder(DEFAULT_DASHBOARD_ORDER);
  };

  const hasChanges = JSON.stringify(localOrder) !== JSON.stringify(dashboardOrder);
  const currentOrder = isEditMode ? localOrder : dashboardOrder;
  
  // Filter out birthday from sortable items - it's always at the top
  const sortableOrder = currentOrder.filter(id => id !== "birthday");

  // Map dashboard item IDs to their components
  const renderDashboardItem = (id: DashboardItemId, index: number) => {
    const animationDelay = `${0.1 + index * 0.05}s`;
    
    switch (id) {
      case "birthday":
        return <BirthdayBanner />;
      case "matrix_alert":
        return <MatrixAlertBanner />;
      case "goal_alert":
        return <GoalAlertBanner />;
      case "campaign":
        return <CampaignBanner />;
      case "reminder":
        return <ReminderHighlightBanner />;
      case "order":
        return <OrderHighlightBanner />;
      case "vehicle_expiry":
        return <VehicleExpiryBanner />;
      case "document_expiry":
        return <DocumentExpiryBanner />;
      case "sling_inspection":
        return <SlingInspectionBanner />;
      case "dds":
        return <DDSHighlightCard />;
      case "equipment":
        return <EquipmentStatusCard />;
      case "stats":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <StatCard 
                title="Total de Funcionários" 
                value={totalEmployees} 
                icon={Users} 
                trend="up" 
                trendValue="+2 este mês" 
              />
            </div>
            <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <StatCard 
                title="Presentes Hoje" 
                value={presentToday} 
                icon={ClipboardCheck} 
                trend="neutral" 
                trendValue={totalEmployees > 0 ? `${Math.round(presentToday / totalEmployees * 100)}%` : "0%"} 
              />
            </div>
            <div className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <StatCard 
                title="Ausências" 
                value={absentToday} 
                icon={AlertCircle} 
                trend={absentToday > 0 ? "down" : "neutral"} 
                trendValue={absentToday > 0 ? "Atenção" : "Tudo certo"} 
              />
            </div>
          </div>
        );
      case "matrix_chart":
        return (
          <div className="mb-6 sm:mb-8 animate-slide-up" style={{ animationDelay }}>
            <MatrixProgressChart />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Hero Section with Edit Controls */}
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-4">
                Bem-vindo ao <span className="text-gradient">Painel Sucena</span>
              </h1>
              <p className="text-base sm:text-xl text-muted-foreground max-w-2xl">
                Gerencie sua equipe, controle presença e organize responsabilidades em um só lugar.
              </p>
            </div>
            <div className="flex-shrink-0">
              <DashboardEditControls
                isEditMode={isEditMode}
                hasChanges={hasChanges}
                isSaving={isSaving}
                onToggleEditMode={handleToggleEditMode}
                onSave={handleSave}
                onCancel={handleCancel}
                onReset={handleReset}
              />
            </div>
          </div>
        </div>

        {/* Render dashboard items in user's preferred order */}
        {/* Birthday Banner - always at the top, not draggable */}
        <BirthdayBanner />
        
        {/* DDS Presenter Alert - shows 1 day before user presents */}
        <DDSPresenterAlert />

        {/* Render other dashboard items in user's preferred order */}
        {!isLoadingOrder && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortableOrder}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {sortableOrder.map((id, index) => (
                  <DraggableDashboardItem key={id} id={id} isEditMode={isEditMode}>
                    {renderDashboardItem(id, index)}
                  </DraggableDashboardItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
