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
import { useCampaignNotifications } from "@/hooks/useCampaignNotifications";
import { useEmployees } from "@/hooks/useEmployees";
import { useAttendanceRecords } from "@/hooks/useAttendance";
import { getBrazilNorthTodayString } from "@/lib/timezone";
import { useDocumentExpiryNotifications } from "@/hooks/useDocumentExpiryNotifications";
import { useVehicleExpiryNotifications } from "@/hooks/useVehicleExpiryNotifications";
const Dashboard = () => {
  const today = getBrazilNorthTodayString();
  const { data: employees } = useEmployees();
  const { data: attendanceRecords } = useAttendanceRecords(today);
  
  // Check and create campaign notifications at start of month
  useCampaignNotifications();
  
  // Show browser notifications for expiring documents
  useDocumentExpiryNotifications();
  
  // Show browser notifications for expiring vehicle badges
  useVehicleExpiryNotifications();

  const totalEmployees = employees?.length || 0;
  const presentToday = attendanceRecords?.filter(a => a.status === "present" || a.status === "late").length || 0;
  const absentToday = attendanceRecords?.filter(a => a.status === "absent" || a.status === "justified").length || 0;

  return <Layout>
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Hero Section */}
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-4">
            Bem-vindo ao <span className="text-gradient">Painel Sucena</span>
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl">
            Gerencie sua equipe, controle presença e organize responsabilidades em um só lugar.
          </p>
        </div>

        {/* Matrix Alert - Always at the top when active (5 days before end of month) */}
        <MatrixAlertBanner />

        {/* Goal Alert - 5 days before measurement close (16th) */}
        <GoalAlertBanner />

        {/* Campaign Banner - Health awareness campaigns */}
        <CampaignBanner />

        {/* Reminder Highlights - Pinned at top */}
        <ReminderHighlightBanner />

        {/* Order Highlights - 7 days before delivery */}
        <OrderHighlightBanner />

        {/* Vehicle Inspection Expiry - 15 days before */}
        <VehicleExpiryBanner />

        {/* Document Expiry Alerts - 5 days before */}
        <DocumentExpiryBanner />

        {/* DDS Highlight Cards - Today and Tomorrow */}
        <DDSHighlightCard />

        {/* Equipment Status - Operation and Maintenance */}
        <EquipmentStatusCard />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="animate-slide-up" style={{
          animationDelay: "0.1s"
        }}>
            <StatCard title="Total de Funcionários" value={totalEmployees} icon={Users} trend="up" trendValue="+2 este mês" />
          </div>
          <div className="animate-slide-up" style={{
          animationDelay: "0.2s"
        }}>
            <StatCard title="Presentes Hoje" value={presentToday} icon={ClipboardCheck} trend="neutral" trendValue={totalEmployees > 0 ? `${Math.round(presentToday / totalEmployees * 100)}%` : "0%"} />
          </div>
          <div className="animate-slide-up" style={{
          animationDelay: "0.3s"
        }}>
            <StatCard title="Ausências" value={absentToday} icon={AlertCircle} trend={absentToday > 0 ? "down" : "neutral"} trendValue={absentToday > 0 ? "Atenção" : "Tudo certo"} />
          </div>
        </div>

        {/* Matrix Progress Chart - Below Stats Grid */}
        <div className="mb-6 sm:mb-8 animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <MatrixProgressChart />
        </div>
      </div>
    </Layout>;
};
export default Dashboard;