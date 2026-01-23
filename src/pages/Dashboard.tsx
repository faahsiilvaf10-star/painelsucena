import { Users, ClipboardCheck, AlertCircle, TrendingUp, ClipboardList, Grid3X3 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import StatCard from "@/components/dashboard/StatCard";
import QuickAccessCard from "@/components/dashboard/QuickAccessCard";
import { employees, attendanceRecords } from "@/data/mockData";
const Dashboard = () => {
  const presentToday = attendanceRecords.filter(a => a.status === "present" || a.status === "late").length;
  const absentToday = attendanceRecords.filter(a => a.status === "absent").length;
  return <Layout>
      <div className="container mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Bem-vindo ao <span className="text-gradient">Painel Sucena</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Gerencie sua equipe, controle presença e organize responsabilidades em um só lugar.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="animate-slide-up" style={{
          animationDelay: "0.1s"
        }}>
            <StatCard title="Total de Funcionários" value={employees.length} icon={Users} trend="up" trendValue="+2 este mês" />
          </div>
          <div className="animate-slide-up" style={{
          animationDelay: "0.2s"
        }}>
            <StatCard title="Em Atividade Hoje" value={presentToday} icon={ClipboardCheck} trend="neutral" trendValue={`${Math.round(presentToday / employees.length * 100)}%`} />
          </div>
          <div className="animate-slide-up" style={{
          animationDelay: "0.3s"
        }}>
            <StatCard title="Ausências" value={absentToday} icon={AlertCircle} trend={absentToday > 0 ? "down" : "neutral"} trendValue={absentToday > 0 ? "Atenção" : "Tudo certo"} />
          </div>
        </div>

        {/* Quick Access */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Acesso Rápido
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="animate-slide-up" style={{
            animationDelay: "0.5s"
          }}>
              <QuickAccessCard title="Recursos Humanos" description="Gerencie funcionários, cargos e departamentos" icon={Users} path="/rh" color="primary" />
            </div>
            <div className="animate-slide-up" style={{
            animationDelay: "0.6s"
          }}>
              <QuickAccessCard title="Lista de Presença" description="Controle de ponto e frequência da equipe" icon={ClipboardList} path="/presenca" color="info" />
            </div>
            <div className="animate-slide-up" style={{
            animationDelay: "0.7s"
          }}>
              <QuickAccessCard title="Matriz RACI" description="Responsabilidades e atribuições de tarefas" icon={Grid3X3} path="/matriz" color="success" />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="animate-slide-up" style={{
        animationDelay: "0.8s"
      }}>
          <h2 className="text-2xl font-bold mb-6">Atividade Recente</h2>
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="divide-y divide-border/50">
              {attendanceRecords.slice(0, 4).map(record => <div key={record.id} className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-semibold text-sm">
                      {record.employeeName.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-medium">{record.employeeName}</p>
                      <p className="text-sm text-muted-foreground">
                        {record.checkIn !== "-" ? `Entrada: ${record.checkIn}` : "Sem registro"}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${record.status === "present" ? "bg-success/20 text-success" : record.status === "late" ? "bg-warning/20 text-warning" : record.status === "justified" ? "bg-info/20 text-info" : "bg-destructive/20 text-destructive"}`}>
                    {record.status === "present" ? "Presente" : record.status === "late" ? "Atrasado" : record.status === "justified" ? "Justificado" : "Ausente"}
                  </span>
                </div>)}
            </div>
          </div>
        </div>
      </div>
    </Layout>;
};
export default Dashboard;