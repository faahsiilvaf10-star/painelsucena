import { useState, useEffect } from "react";
import { Users, ClipboardCheck, AlertCircle, Activity } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useSiteSettings } from "@/hooks/useSiteSettings";
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
import { PresenceGauge } from "@/components/dashboard/PresenceGauge";
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
import { useLastDayMatrixCheck } from "@/hooks/useLastDayMatrixCheck";
import { CelebrationModal } from "@/components/matriz/CelebrationModal";
import { MatrixReminderModal } from "@/components/matriz/MatrixReminderModal";
import { useEmployees } from "@/hooks/useEmployees";
import { useAttendanceRecords } from "@/hooks/useAttendance";
import { useEquipment } from "@/hooks/useEquipment";
import { useEquipmentCurrentlyIn, useAllRegisteredEquipmentCount } from "@/hooks/useEquipmentMovements";
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
  const { data: currentlyInEquipment } = useEquipmentCurrentlyIn();
  const { data: allRegisteredCount } = useAllRegisteredEquipmentCount();
  const { dashboardOrder, updateOrder, isLoading: isLoadingOrder } = useDashboardOrder();
  useHolidayNotification();
  useFridayNotification();
  const lastDayMatrix = useLastDayMatrixCheck();
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [localOrder, setLocalOrder] = useState<DashboardItemId[]>(dashboardOrder);
  const [isSaving, setIsSaving] = useState(false);
  const [animatedEquipPercent, setAnimatedEquipPercent] = useState(0);

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
  
  const inOperation = currentlyInEquipment?.length || 0;
  const totalEquip = allRegisteredCount || equipment?.length || 0;
  const equipPercent = totalEquip > 0 ? Math.round(inOperation / totalEquip * 100) : 0;

  useEffect(() => {
    const t = setTimeout(() => setAnimatedEquipPercent(equipPercent), 150);
    return () => clearTimeout(t);
  }, [equipPercent]);

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
      case "reminder": return null;
      case "order": return <OrderHighlightBanner />;
      case "vehicle_expiry": return <VehicleExpiryBanner />;
      case "document_expiry": return <DocumentExpiryBanner />;
      case "sling_inspection": return <SlingInspectionBanner />;
      case "dds": return <DDSHighlightCard />;
      case "equipment": return <EquipmentStatusCard />;
      case "stats": return null;
      case "matrix_chart": return null;
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
              <h1
                className="text-xl sm:text-3xl font-bold"
                style={{ color: "hsl(30, 15%, 18%)", fontFamily: "'Georgia', serif" }}
              >
                Dashboard
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "hsl(30, 10%, 50%)" }}>
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

        {/* Main stats grid - matching reference layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6 animate-slide-up">
          {/* Left column: Weather + Total Funcionários */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <WeatherWidget />
            <ModernStatCard
              title="Total de Funcionários"
              value={totalEmployees}
              percentage={presencePercent}
              icon={Users}
              variant="gauge"
              color="hsl(30, 50%, 55%)"
            />
          </div>

          {/* Center: Large Presence Gauge */}
          <div className="lg:col-span-3">
            <PresenceGauge
              present={presentToday}
              total={totalEmployees}
              percentage={presencePercent}
            />
          </div>

          {/* Right-center: Presentes Hoje + Ausências */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <ModernStatCard
              title="Presentes Hoje"
              value={presentToday}
              percentage={presencePercent}
              icon={ClipboardCheck}
              variant="sparkline"
              color="hsl(30, 40%, 50%)"
              sparklineData={[5, 8, 6, 9, 7, 10, presentToday || 8]}
            />
            <ModernStatCard
              title="Ausências"
              value={absentToday}
              percentage={totalEmployees > 0 ? Math.round(absentToday / totalEmployees * 100) : 0}
              icon={AlertCircle}
              variant="bars"
              color="hsl(30, 50%, 55%)"
              accentColor="hsl(30, 50%, 55%)"
              barData={[2, 4, 1, 3, 2, 5, absentToday || 1]}
            />
          </div>

          {/* Far right: Equipamentos Ativos */}
          <div className="lg:col-span-3">
            <div
              className="rounded-2xl p-5 h-full flex flex-col justify-between overflow-hidden transition-transform hover:scale-[1.02]"
              style={{
                background: "linear-gradient(145deg, hsl(190, 30%, 88%), hsl(190, 25%, 82%))",
                boxShadow:
                  "6px 6px 14px hsl(190, 15%, 74%), -6px -6px 14px hsl(190, 30%, 96%), inset 0 1px 0 hsl(190, 30%, 94%)",
                border: "1px solid hsl(190, 20%, 82%)",
              }}
            >
              <p
                className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color: "hsl(30, 15%, 30%)", letterSpacing: "0.15em" }}
              >
                Equipamentos Ativos
              </p>
              {/* Copper circular gauge */}
              <div className="flex items-center justify-center flex-1">
                <div className="relative">
                  <svg height={100} width={100}>
                    <circle
                      stroke="hsl(190, 15%, 78%)"
                      fill="transparent"
                      strokeWidth={8}
                      r={42}
                      cx={50}
                      cy={50}
                    />
                    <circle
                      stroke="url(#copperEquip)"
                      fill="transparent"
                      strokeWidth={8}
                      strokeLinecap="round"
                      strokeDasharray={`${42 * 2 * Math.PI} ${42 * 2 * Math.PI}`}
                      strokeDashoffset={42 * 2 * Math.PI - (animatedEquipPercent / 100) * 42 * 2 * Math.PI}
                      r={42}
                      cx={50}
                      cy={50}
                      style={{
                        transform: "rotate(-90deg)",
                        transformOrigin: "50% 50%",
                        transition: "stroke-dashoffset 1s ease-out",
                      }}
                    />
                    <defs>
                      <linearGradient id="copperEquip" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(25, 55%, 55%)" />
                        <stop offset="50%" stopColor="hsl(30, 65%, 65%)" />
                        <stop offset="100%" stopColor="hsl(20, 50%, 45%)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold" style={{ color: "hsl(30, 15%, 30%)" }}>
                      {equipPercent}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold" style={{ color: "hsl(30, 15%, 18%)" }}>
                  {inOperation}/{totalEquip}
                </span>
                <span className="text-xs" style={{ color: "hsl(30, 10%, 50%)" }}>
                  {equipPercent}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Reminder Banner */}
        <div className="mb-4">
          <ReminderHighlightBanner />
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

        {/* Charts Row */}
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
