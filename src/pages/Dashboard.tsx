import { Users, ClipboardCheck, AlertCircle } from "lucide-react";
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
import { DashboardOrderEditor } from "@/components/dashboard/DashboardOrderEditor";
import { useCampaignNotifications } from "@/hooks/useCampaignNotifications";
import { useEmployees } from "@/hooks/useEmployees";
import { useAttendanceRecords } from "@/hooks/useAttendance";
import { getBrazilNorthTodayString } from "@/lib/timezone";
import { useDocumentExpiryNotifications } from "@/hooks/useDocumentExpiryNotifications";
import { useVehicleExpiryNotifications } from "@/hooks/useVehicleExpiryNotifications";
import { useDashboardOrder, DashboardItemId } from "@/hooks/useDashboardOrder";

const Dashboard = () => {
  const today = getBrazilNorthTodayString();
  const { data: employees } = useEmployees();
  const { data: attendanceRecords } = useAttendanceRecords(today);
  const { dashboardOrder, isLoading: isLoadingOrder } = useDashboardOrder();
  
  // Check and create campaign notifications at start of month
  useCampaignNotifications();
  
  // Show browser notifications for expiring documents
  useDocumentExpiryNotifications();
  
  // Show browser notifications for expiring vehicle badges
  useVehicleExpiryNotifications();

  const totalEmployees = employees?.length || 0;
  const presentToday = attendanceRecords?.filter(a => a.status === "present" || a.status === "late").length || 0;
  const absentToday = attendanceRecords?.filter(a => a.status === "absent" || a.status === "justified").length || 0;

  // Map dashboard item IDs to their components
  const renderDashboardItem = (id: DashboardItemId, index: number) => {
    const animationDelay = `${0.1 + index * 0.05}s`;
    
    switch (id) {
      case "matrix_alert":
        return <MatrixAlertBanner key={id} />;
      case "goal_alert":
        return <GoalAlertBanner key={id} />;
      case "campaign":
        return <CampaignBanner key={id} />;
      case "reminder":
        return <ReminderHighlightBanner key={id} />;
      case "order":
        return <OrderHighlightBanner key={id} />;
      case "vehicle_expiry":
        return <VehicleExpiryBanner key={id} />;
      case "document_expiry":
        return <DocumentExpiryBanner key={id} />;
      case "sling_inspection":
        return <SlingInspectionBanner key={id} />;
      case "dds":
        return <DDSHighlightCard key={id} />;
      case "equipment":
        return <EquipmentStatusCard key={id} />;
      case "stats":
        return (
          <div key={id} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
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
          <div key={id} className="mb-6 sm:mb-8 animate-slide-up" style={{ animationDelay }}>
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
        {/* Hero Section with Order Editor */}
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
              <DashboardOrderEditor />
            </div>
          </div>
        </div>

        {/* Render dashboard items in user's preferred order */}
        {!isLoadingOrder && dashboardOrder.map((id, index) => renderDashboardItem(id, index))}
      </div>
    </Layout>
  );
};

export default Dashboard;
