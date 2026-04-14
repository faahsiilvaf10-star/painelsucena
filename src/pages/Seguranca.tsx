import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sun, FolderOpen, ClipboardCheck, BadgeCheck, Link2,
  HardHat, Droplets, TriangleAlert, ShieldCheck, FlameKindling, Shield
} from "lucide-react";

const securityPages = [
  { label: "DDS", icon: Sun, path: "/dds", color: "from-amber-500 to-orange-500" },
  { label: "Permissão de Trabalho", icon: FolderOpen, path: "/documentos", color: "from-blue-500 to-cyan-500" },
  { label: "Vistoria de Equipamentos", icon: ClipboardCheck, path: "/vistorias-equipamentos", color: "from-green-500 to-emerald-500" },
  { label: "Homologados", icon: BadgeCheck, path: "/homologados", color: "from-purple-500 to-violet-500" },
  { label: "Vistoria Cintas", icon: Link2, path: "/vistoria-cintas", color: "from-teal-500 to-cyan-500" },
  { label: "Inspeção de Canteiro", icon: HardHat, path: "/inspecao-canteiro", color: "from-yellow-500 to-amber-500" },
  { label: "Pós Chuva", icon: Droplets, path: "/pos-chuva", color: "from-sky-500 to-blue-500" },
  { label: "Desvios", icon: TriangleAlert, path: "/desvios", color: "from-red-500 to-rose-500" },
  { label: "Requisição", icon: ShieldCheck, path: "/troca-epi", color: "from-indigo-500 to-purple-500" },
  { label: "Inspeção Extintores", icon: FlameKindling, path: "/inspecao-extintores", color: "from-orange-500 to-red-500" },
];

const Seguranca = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-6 max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Segurança</h1>
            <p className="text-sm text-muted-foreground">Acesse os módulos de segurança do trabalho</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {securityPages.map((page) => (
            <Card
              key={page.path}
              className="cursor-pointer hover:shadow-lg hover:scale-[1.03] transition-all duration-200 border-border/50 group"
              onClick={() => navigate(page.path)}
            >
              <CardContent className="flex flex-col items-center justify-center gap-3 p-4 md:p-6">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${page.color} text-white shadow-md group-hover:shadow-lg transition-shadow`}>
                  <page.icon className="h-6 w-6 md:h-7 md:w-7" />
                </div>
                <span className="text-xs md:text-sm font-medium text-center leading-tight">
                  {page.label}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Seguranca;
