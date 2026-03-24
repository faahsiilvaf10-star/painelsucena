import { useState } from "react";
import { Users, ClipboardCheck, AlertCircle, Activity } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import logoPrincipal from "@/assets/logo-principal.png";
import { SimpleTree } from "@/components/ui/simple-growth-tree";
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
import ModernStatCard from "@/components/dashboard/ModernStatCard";
import { AttendanceTrendChart } from "@/components/dashboard/AttendanceTrendChart";
import { MatrixSideChart } from "@/components/dashboard/MatrixSideChart";
import { DDSHighlightCard } from "@/components/dds/DDSHighlightCard";
import { ReminderHighlightBanner } from "@/components/reminders/ReminderHighlightBanner";
import { MatrixAlertBanner } from "@/components/dashboard/MatrixAlertBanner";
import { CampaignBanner } from "@/components/campaigns/CampaignBanner";
import { OrderHighlightBanner } from "@/components/orders/OrderHighlightBanner";
import { EquipmentStatusCard } from "@/components/dashboard/EquipmentStatusCard";
import { DocumentExpiryBanner } from "@/components/documents/DocumentExpiryBanner";

import { VehicleExpiryBanner } from "@/components/vistorias/VehicleExpiryBanner";
import { SlingInspectionBanner } from "@/components/dashboard/SlingInspectionBanner";
import { InspectionScheduleBanner } from "@/components/dashboard/InspectionScheduleBanner";
import { WeatherWidget } from "@/components/dashboard/WeatherWidget";
import { DraggableDashboardItem } from "@/components/dashboard/DraggableDashboardItem";
import { DashboardEditControls } from "@/components/dashboard/DashboardEditControls";
import BirthdayBanner from "@/components/dashboard/BirthdayBanner";
import DDSPresenterAlert from "@/components/dds/DDSPresenterAlert";
import { useCampaignNotifications } from "@/hooks/useCampaignNotifications";
import { useEmployees } from "@/hooks/useEmployees";
import { useAttendanceRecords } from "@/hooks/useAttendance";
import { useEquipment } from "@/hooks/useEquipment";
import { getBrazilNorthTodayString } from "@/lib/timezone";
import { useDocumentExpiryNotifications } from "@/hooks/useDocumentExpiryNotifications";
import { useVehicleExpiryNotifications } from "@/hooks/useVehicleExpiryNotifications";
import { useDashboardOrder, DashboardItemId, DEFAULT_DASHBOARD_ORDER } from "@/hooks/useDashboardOrder";
import { useHolidayNotification } from "@/hooks/useHolidayNotification";
import { useFridayNotification } from "@/hooks/useFridayNotification";
import { toast } from "sonner";

const Dashboard = () => {
  const { data: profile } = useProfile();
  const { settings } = useSiteSettings();
  const uiTheme = (profile as any)?.ui_theme || "classic";
  const isDockTheme = uiTheme === "macos-dock";
  const today = getBrazilNorthTodayString();
  const { data: employees } = useEmployees();
  const { data: attendanceRecords } = useAttendanceRecords(today);
  const { data: equipment } = useEquipment();
  const { dashboardOrder, updateOrder, isLoading: isLoadingOrder } = useDashboardOrder();
  useHolidayNotification();
  useFridayNotification();
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [localOrder, setLocalOrder] = useState<DashboardItemId[]>(dashboardOrder);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  useCampaignNotifications();
  useDocumentExpiryNotifications();
  useVehicleExpiryNotifications();

  const totalEmployees = employees?.length || 0;
  const presentToday = attendanceRecords?.filter(a => a.status === "present" || a.status === "late").length || 0;
  const absentToday = attendanceRecords?.filter(a => a.status === "absent" || a.status === "justified").length || 0;
  const presencePercent = totalEmployees > 0 ? Math.round(presentToday / totalEmployees * 100) : 0;
  
  const inOperation = equipment?.filter((eq) => eq.stop_reason === "none")?.length || 0;
  const totalEquip = equipment?.length || 0;
  const equipPercent = totalEquip > 0 ? Math.round(inOperation / totalEquip * 100) : 0;

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
  const sortableOrder = currentOrder.filter(id => id !== "birthday");

  const renderDashboardItem = (id: DashboardItemId) => {
    switch (id) {
      case "birthday": return <BirthdayBanner />;
      case "matrix_alert": return <MatrixAlertBanner />;
      case "goal_alert": return null;
      case "campaign": return <CampaignBanner />;
      case "reminder": return null; // Now rendered as fixed banner above stats
      case "order": return <OrderHighlightBanner />;
      case "vehicle_expiry": return <VehicleExpiryBanner />;
      case "document_expiry": return <DocumentExpiryBanner />;
      case "sling_inspection": return <SlingInspectionBanner />;
      case "dds": return <DDSHighlightCard />;
      case "equipment": return <EquipmentStatusCard />;
      case "stats": return null; // Handled by the modern stat cards above
      case "matrix_chart": return null; // Handled by the new charts section
      default: return null;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 animate-fade-in">
          {isDockTheme ? (
            <div className="flex-1 flex justify-center pl-16">
              <SimpleTree className="w-48 h-40 sm:w-64 sm:h-52" />
            </div>
          ) : (
            <div>
              <h1 className="text-xl sm:text-3xl font-bold">
                <span className="text-gradient">Dashboard</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Visão geral da operação
              </p>
            </div>
          )}
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

        {/* Weather Widget */}
        <div className="mb-6 animate-slide-up" style={{ animationDelay: "0.05s" }}>
          <WeatherWidget />
        </div>

        {/* Reminder Banner - fixed above stats */}
        <div className="mb-4">
          <ReminderHighlightBanner />
        </div>

        {/* Modern Stat Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-slide-up">
          <ModernStatCard
            title="Total de Funcionários"
            value={totalEmployees}
            percentage={presencePercent}
            icon={Users}
            variant="gauge"
            color="hsl(174, 62%, 47%)"
          />
          <ModernStatCard
            title="Presentes Hoje"
            value={presentToday}
            percentage={presencePercent}
            icon={ClipboardCheck}
            variant="sparkline"
            color="hsl(174, 62%, 47%)"
            sparklineData={[5, 8, 6, 9, 7, 10, presentToday || 8]}
          />
          <ModernStatCard
            title="Ausências"
            value={absentToday}
            percentage={totalEmployees > 0 ? Math.round(absentToday / totalEmployees * 100) : 0}
            icon={AlertCircle}
            variant="bars"
            color="hsl(0, 84%, 60%)"
            accentColor="hsl(43, 96%, 56%)"
            barData={[2, 4, 1, 3, 2, 5, absentToday || 1]}
          />
          <ModernStatCard
            title="Equipamentos Ativos"
            value={`${inOperation}/${totalEquip}`}
            percentage={equipPercent}
            icon={Activity}
            variant="circular"
            color="hsl(174, 62%, 47%)"
          />
        </div>

        {/* Fixed banners */}
        <InspectionScheduleBanner />
        <BirthdayBanner />
        <DDSPresenterAlert />

        {/* Draggable items */}
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
                {sortableOrder.map((id) => (
                  <DraggableDashboardItem key={id} id={id} isEditMode={isEditMode}>
                    {renderDashboardItem(id)}
                  </DraggableDashboardItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Charts Row - Main line chart + Side area chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
          <div className="lg:col-span-2 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <AttendanceTrendChart />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: "0.15s" }}>
            <MatrixSideChart />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
