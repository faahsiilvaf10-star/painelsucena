import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Users, ClipboardCheck, AlertCircle, Activity, Calendar as CalendarIcon, Filter, ArrowUp, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useProfile } from "@/hooks/useProfile";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { SimpleTree } from "@/components/ui/simple-growth-tree";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
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
import { lazy, Suspense } from "react";

const ModernStatCard = lazy(() => import("@/components/dashboard/ModernStatCard"));
const PresenceGauge = lazy(() => import("@/components/dashboard/PresenceGauge").then(m => ({ default: m.PresenceGauge })));
const MatrixGauge = lazy(() => import("@/components/dashboard/MatrixGauge").then(m => ({ default: m.MatrixGauge })));
const AttendanceTrendChart = lazy(() => import("@/components/dashboard/AttendanceTrendChart").then(m => ({ default: m.AttendanceTrendChart })));
const MatrixSideChart = lazy(() => import("@/components/dashboard/MatrixSideChart").then(m => ({ default: m.MatrixSideChart })));
const DDSHighlightCard = lazy(() => import("@/components/dds/DDSHighlightCard").then(m => ({ default: m.DDSHighlightCard })));
const ReminderHighlightBanner = lazy(() => import("@/components/reminders/ReminderHighlightBanner").then(m => ({ default: m.ReminderHighlightBanner })));
const MatrixAlertBanner = lazy(() => import("@/components/dashboard/MatrixAlertBanner").then(m => ({ default: m.MatrixAlertBanner })));
const CampaignBanner = lazy(() => import("@/components/campaigns/CampaignBanner").then(m => ({ default: m.CampaignBanner })));
const OrderHighlightBanner = lazy(() => import("@/components/orders/OrderHighlightBanner").then(m => ({ default: m.OrderHighlightBanner })));
const EquipmentStatusCard = lazy(() => import("@/components/dashboard/EquipmentStatusCard").then(m => ({ default: m.EquipmentStatusCard })));
const DocumentExpiryBanner = lazy(() => import("@/components/documents/DocumentExpiryBanner").then(m => ({ default: m.DocumentExpiryBanner })));
const NRExpiryBanner = lazy(() => import("@/components/dashboard/NRExpiryBanner").then(m => ({ default: m.NRExpiryBanner })));
const ASOExpiryBanner = lazy(() => import("@/components/dashboard/ASOExpiryBanner").then(m => ({ default: m.ASOExpiryBanner })));
const VehicleExpiryBanner = lazy(() => import("@/components/vistorias/VehicleExpiryBanner").then(m => ({ default: m.VehicleExpiryBanner })));
const SlingInspectionBanner = lazy(() => import("@/components/dashboard/SlingInspectionBanner").then(m => ({ default: m.SlingInspectionBanner })));
const InspectionScheduleBanner = lazy(() => import("@/components/dashboard/InspectionScheduleBanner").then(m => ({ default: m.InspectionScheduleBanner })));
const WeatherWidget = lazy(() => import("@/components/dashboard/WeatherWidget").then(m => ({ default: m.WeatherWidget })));
const DraggableDashboardItem = lazy(() => import("@/components/dashboard/DraggableDashboardItem").then(m => ({ default: m.DraggableDashboardItem })));
const DashboardEditControls = lazy(() => import("@/components/dashboard/DashboardEditControls").then(m => ({ default: m.DashboardEditControls })));
const BirthdayBanner = lazy(() => import("@/components/dashboard/BirthdayBanner"));
const DDSPresenterAlert = lazy(() => import("@/components/dds/DDSPresenterAlert"));
const RecentActivitiesCard = lazy(() => import("@/components/dashboard/RecentActivitiesCard").then(m => ({ default: m.RecentActivitiesCard })));
const PlanejamentoProgressCard = lazy(() => import("@/components/dashboard/PlanejamentoProgressCard").then(m => ({ default: m.PlanejamentoProgressCard })));
import { useCampaignNotifications } from "@/hooks/useCampaignNotifications";
import { useLastDayMatrixCheck } from "@/hooks/useLastDayMatrixCheck";
import { CelebrationModal } from "@/components/matriz/CelebrationModal";
import { MatrixReminderModal } from "@/components/matriz/MatrixReminderModal";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";
import { useAttendanceDailyMarks } from "@/hooks/useAttendanceDailyMarks";
import { useEquipment } from "@/hooks/useEquipment";
import { useEquipmentCurrentlyOut, useAllRegisteredEquipmentCount } from "@/hooks/useEquipmentMovements";
import { useJardinagemEquipment } from "@/hooks/useJardinagemEquipment";
import { getBrazilNorthTodayString } from "@/lib/timezone";
import { useDocumentExpiryNotifications } from "@/hooks/useDocumentExpiryNotifications";
import { useVehicleExpiryNotifications } from "@/hooks/useVehicleExpiryNotifications";
import { useDashboardOrder, DashboardItemId, DEFAULT_DASHBOARD_ORDER } from "@/hooks/useDashboardOrder";
import { useHolidayNotification } from "@/hooks/useHolidayNotification";
import { useFridayNotification } from "@/hooks/useFridayNotification";
import { toast } from "sonner";

const DashboardItemSkeleton = () => (
  <div className="w-full h-32 bg-card/50 animate-pulse rounded-2xl border border-border/50" />
);

const Dashboard = () => {
  const { data: profile } = useProfile();
  const { settings } = useSiteSettings();
  const uiTheme = (profile as any)?.ui_theme || "classic";
  const isDockTheme = uiTheme === "macos-dock";
  const todayString = getBrazilNorthTodayString();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const [y, m, d] = todayString.split("-").map(Number);
    return new Date(y, m - 1, d);
  });
  const selectedDateString = format(selectedDate, "yyyy-MM-dd");
  const isToday = selectedDateString === todayString;
  const today = selectedDateString;
  const { data: rhData } = useRHEfetivo();
  const { data: dailyMarks } = useAttendanceDailyMarks(selectedDateString);
  const { data: equipment } = useEquipment();
  const { data: currentlyOutEquipment } = useEquipmentCurrentlyOut();
  const { data: allRegisteredCount } = useAllRegisteredEquipmentCount();
  const { data: jardinagemEquipment } = useJardinagemEquipment();
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

  const activeColaboradores = useMemo(() => {
    if (!rhData?.colaboradores) return [];
    const deletedIds = rhData.deletedIds || [];
    return rhData.colaboradores.filter(c => !deletedIds.includes(c.id));
  }, [rhData]);

  const totalEmployees = activeColaboradores.length;
  
  const absentToday = useMemo(() => {
    if (!dailyMarks) return 0;
    const allAbsentIds = new Set<number>();
    dailyMarks.forEach(m => {
      (m.absent_employee_ids || []).forEach(id => allAbsentIds.add(Number(id)));
    });
    
    // Only count absents that are in our active list
    const activeIds = new Set(activeColaboradores.map(c => c.id));
    let count = 0;
    allAbsentIds.forEach(id => {
      if (activeIds.has(id)) count++;
    });
    return count;
  }, [dailyMarks, activeColaboradores]);

  const presentToday = totalEmployees - absentToday;
  const presencePercent = totalEmployees > 0 ? Math.round(presentToday / totalEmployees * 100) : 0;
  
  const jardinagemTotal = jardinagemEquipment?.length || 0;
  const jardinagemIn = jardinagemEquipment?.filter(e => e.status === "entrou").length || 0;
  // Filter currentlyInEquipment to only count plates that belong to the equipment table (vehicles)
  const vehiclePlates = new Set((equipment || []).map(e => e.plate));
  const vehiclesOut = (currentlyOutEquipment || []).filter(m => vehiclePlates.has(m.plate)).length;
  const vehiclesIn = (equipment || []).length - vehiclesOut;
  const inOperation = vehiclesIn + jardinagemIn;
  const totalEquip = (equipment?.length || 0) + jardinagemTotal;
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
      {/* Last day of month matrix modals */}
      <CelebrationModal
        isOpen={lastDayMatrix.showCelebration}
        onClose={() => lastDayMatrix.setShowCelebration(false)}
        cargoName={lastDayMatrix.cargoName}
        userName={lastDayMatrix.userName}
        userAvatarUrl={lastDayMatrix.userAvatarUrl}
      />
      <MatrixReminderModal
        isOpen={lastDayMatrix.showReminder}
        onClose={() => lastDayMatrix.setShowReminder(false)}
        cargoName={lastDayMatrix.cargoName}
        progress={lastDayMatrix.progress}
        userName={lastDayMatrix.userName}
        userAvatarUrl={lastDayMatrix.userAvatarUrl}
      />
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 animate-fade-in flex-wrap gap-2">
          {isDockTheme ? (
            <div className="flex-1 flex justify-center pl-16">
              <SimpleTree className="w-40 h-32 sm:w-56 sm:h-48" />
            </div>
          ) : (
            <div>
              <EditablePageTitle
                pageKey="dashboard"
                defaultValue="Dashboard"
                className="text-lg sm:text-2xl font-bold text-gradient"
                as="h1"
              />
              <p className="text-[10px] sm:text-xs mt-0 text-muted-foreground">
                Visão geral da operação
              </p>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-sm hover:bg-muted/60 transition-colors"
                >
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  locale={ptBR}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {!isToday && (
              <button
                type="button"
                onClick={() => {
                  const [y, m, d] = todayString.split("-").map(Number);
                  setSelectedDate(new Date(y, m - 1, d));
                }}
                className="text-xs text-primary hover:underline"
              >
                Hoje
              </button>
            )}
          </div>
        </div>

        {/* Main stats grid */}
        <Suspense fallback={<DashboardItemSkeleton />}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-4 animate-slide-up">
            {/* Left column: Weather + Total Funcionários */}
            <div className="lg:col-span-3 flex flex-col gap-3">
              <WeatherWidget />
              <ModernStatCard
                title="Total de Funcionários"
                value={totalEmployees}
                percentage={presencePercent}
                icon={Users}
                variant="gauge"
              />
            </div>

            {/* Center: Avanço Mensal (Planejamento) */}
            <div className="lg:col-span-3">
              <PlanejamentoProgressCard />
            </div>

            {/* Right-center: Presentes Hoje + Ausências */}
            <div className="lg:col-span-3 flex flex-col gap-3">
              <ModernStatCard
                title="Presentes hoje"
                value={presentToday}
                percentage={presencePercent}
                icon={ClipboardCheck}
                variant="sparkline"
                sparklineData={[5, 8, 6, 9, 7, 10, presentToday || 8]}
              />
              <ModernStatCard
                title="Ausências"
                value={absentToday}
                percentage={totalEmployees > 0 ? Math.round(absentToday / totalEmployees * 100) : 0}
                icon={AlertCircle}
                variant="bars"
                barData={[2, 4, 1, 3, 2, 5, absentToday || 1]}
              />
            </div>

            {/* Far right: Equipamentos Ativos (clean white card matching reference) */}
            <div className="lg:col-span-3">
            <div className="rounded-2xl p-5 h-full flex flex-col bg-card border border-border shadow-sm transition-transform hover:scale-[1.01]">
              <div className="flex items-start justify-between mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Equipamentos Ativos
                </p>
                <Link
                  to="/status-geral-equipamentos"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  Ver tudo <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="flex items-center justify-center flex-1 my-2">
                <div className="relative">
                  <svg height={140} width={140}>
                    <circle
                      stroke="hsl(var(--muted))"
                      fill="transparent"
                      strokeWidth={12}
                      r={60}
                      cx={70}
                      cy={70}
                    />
                    <circle
                      stroke="hsl(var(--primary))"
                      fill="transparent"
                      strokeWidth={12}
                      strokeLinecap="round"
                      strokeDasharray={`${60 * 2 * Math.PI} ${60 * 2 * Math.PI}`}
                      strokeDashoffset={60 * 2 * Math.PI - (animatedEquipPercent / 100) * 60 * 2 * Math.PI}
                      r={60}
                      cx={70}
                      cy={70}
                      style={{
                        transform: "rotate(-90deg)",
                        transformOrigin: "50% 50%",
                        transition: "stroke-dashoffset 1s ease-out",
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-extrabold text-primary">
                      {equipPercent}%
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-foreground">
                    {inOperation}
                  </span>
                  <span className="text-sm text-muted-foreground">de {totalEquip}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                  equipamentos em uso
                </p>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-1000"
                    style={{ width: `${equipPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {inOperation} no canteiro de {totalEquip} equipamentos
                </p>
              </div>
            </div>
          </div>
        </div>
      </Suspense>

        {/* Recent activities row (mix real do sistema) */}
        <div className="mb-4 animate-slide-up" style={{ animationDelay: "0.05s" }}>
          <Suspense fallback={<DashboardItemSkeleton />}>
            <RecentActivitiesCard />
          </Suspense>
        </div>

        {/* Reminder Banner */}
        <div className="mb-4">
          <Suspense fallback={<DashboardItemSkeleton />}>
            <ReminderHighlightBanner />
          </Suspense>
        </div>

        {/* Fixed banners */}
        <Suspense fallback={null}>
          <InspectionScheduleBanner />
          <BirthdayBanner />
          <DDSPresenterAlert />
          <NRExpiryBanner />
          <ASOExpiryBanner />
        </Suspense>

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
            <MatrixGauge referenceDate={selectedDate} />
          </div>
        </div>

        {/* Matriz do mês (gráfico lateral) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          <div className="lg:col-start-3 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <MatrixSideChart />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
