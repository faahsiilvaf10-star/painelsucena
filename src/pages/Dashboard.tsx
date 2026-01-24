import { Users, ClipboardCheck, AlertCircle } from "lucide-react";
import Layout from "@/components/layout/Layout";
import StatCard from "@/components/dashboard/StatCard";
import { DDSHighlightCard } from "@/components/dds/DDSHighlightCard";
import { ReminderHighlightBanner } from "@/components/reminders/ReminderHighlightBanner";
import { MatrixProgressChart } from "@/components/dashboard/MatrixProgressChart";
import { CampaignBanner } from "@/components/campaigns/CampaignBanner";
import { useEmployees } from "@/hooks/useEmployees";
import { useAttendanceRecords } from "@/hooks/useAttendance";
import { getBrazilNorthTodayString } from "@/lib/timezone";

const Dashboard = () => {
  const today = getBrazilNorthTodayString();
  const { data: employees } = useEmployees();
  const { data: attendanceRecords } = useAttendanceRecords(today);

  const totalEmployees = employees?.length || 0;
  const presentToday = attendanceRecords?.filter(a => a.status === "present" || a.status === "late").length || 0;
  const absentToday = attendanceRecords?.filter(a => a.status === "absent" || a.status === "justified").length || 0;

  return <Layout>
      <div className="container mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Bem-vindo ao <span className="text-gradient">Painel Sucena</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Gerencie sua equipe, controle presença e organize responsabilidades em um só lugar.
          </p>
        </div>

        {/* Campaign Banner - Health awareness campaigns */}
        <CampaignBanner />

        {/* Reminder Highlights - Pinned at top */}
        <ReminderHighlightBanner />

        {/* DDS Highlight Cards - Today and Tomorrow */}
        <DDSHighlightCard />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
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

        {/* Quick Access */}
        <div className="mb-8">
          
          
        </div>

        {/* Matrix Progress Chart */}
        <div className="mb-12 animate-slide-up" style={{
        animationDelay: "0.8s"
      }}>
          <MatrixProgressChart />
        </div>

        {/* Recent Activity */}
        <div className="animate-slide-up" style={{
        animationDelay: "0.9s"
      }}>
          
        </div>
      </div>
    </Layout>;
};
export default Dashboard;