export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  avatar: string;
  status: "active" | "vacation" | "leave";
  startDate: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: "present" | "late" | "absent" | "justified";
}

export interface RaciItem {
  id: string;
  task: string;
  responsible: string[];
  accountable: string;
  consulted: string[];
  informed: string[];
}

export const employees: Employee[] = [
  {
    id: "1",
    name: "Ana Silva",
    role: "Gerente de Projetos",
    department: "Operações",
    email: "ana.silva@empresa.com",
    phone: "(11) 99999-1111",
    avatar: "AS",
    status: "active",
    startDate: "2022-03-15",
  },
  {
    id: "2",
    name: "Carlos Santos",
    role: "Desenvolvedor Senior",
    department: "Tecnologia",
    email: "carlos.santos@empresa.com",
    phone: "(11) 99999-2222",
    avatar: "CS",
    status: "active",
    startDate: "2021-06-01",
  },
  {
    id: "3",
    name: "Maria Oliveira",
    role: "Analista de RH",
    department: "Recursos Humanos",
    email: "maria.oliveira@empresa.com",
    phone: "(11) 99999-3333",
    avatar: "MO",
    status: "vacation",
    startDate: "2020-01-10",
  },
  {
    id: "4",
    name: "Pedro Costa",
    role: "Coordenador de Operações",
    department: "Operações",
    email: "pedro.costa@empresa.com",
    phone: "(11) 99999-4444",
    avatar: "PC",
    status: "active",
    startDate: "2019-08-20",
  },
  {
    id: "5",
    name: "Julia Mendes",
    role: "Designer UX",
    department: "Tecnologia",
    email: "julia.mendes@empresa.com",
    phone: "(11) 99999-5555",
    avatar: "JM",
    status: "active",
    startDate: "2023-02-01",
  },
  {
    id: "6",
    name: "Rafael Lima",
    role: "Analista Financeiro",
    department: "Financeiro",
    email: "rafael.lima@empresa.com",
    phone: "(11) 99999-6666",
    avatar: "RL",
    status: "leave",
    startDate: "2021-11-15",
  },
];

export const attendanceRecords: AttendanceRecord[] = [
  { id: "1", employeeId: "1", employeeName: "Ana Silva", date: "2024-01-23", checkIn: "08:00", checkOut: "17:30", status: "present" },
  { id: "2", employeeId: "2", employeeName: "Carlos Santos", date: "2024-01-23", checkIn: "08:45", checkOut: "18:00", status: "late" },
  { id: "3", employeeId: "4", employeeName: "Pedro Costa", date: "2024-01-23", checkIn: "07:55", checkOut: "17:00", status: "present" },
  { id: "4", employeeId: "5", employeeName: "Julia Mendes", date: "2024-01-23", checkIn: "09:00", checkOut: "18:30", status: "late" },
  { id: "5", employeeId: "3", employeeName: "Maria Oliveira", date: "2024-01-23", checkIn: "-", checkOut: "-", status: "justified" },
  { id: "6", employeeId: "6", employeeName: "Rafael Lima", date: "2024-01-23", checkIn: "-", checkOut: "-", status: "absent" },
];

export const raciMatrix: RaciItem[] = [
  {
    id: "1",
    task: "Planejamento de Sprint",
    responsible: ["Carlos Santos"],
    accountable: "Ana Silva",
    consulted: ["Julia Mendes", "Pedro Costa"],
    informed: ["Maria Oliveira"],
  },
  {
    id: "2",
    task: "Contratação de Novos Funcionários",
    responsible: ["Maria Oliveira"],
    accountable: "Pedro Costa",
    consulted: ["Ana Silva"],
    informed: ["Carlos Santos", "Julia Mendes", "Rafael Lima"],
  },
  {
    id: "3",
    task: "Desenvolvimento de Funcionalidades",
    responsible: ["Carlos Santos", "Julia Mendes"],
    accountable: "Ana Silva",
    consulted: ["Pedro Costa"],
    informed: ["Maria Oliveira", "Rafael Lima"],
  },
  {
    id: "4",
    task: "Relatório Financeiro Mensal",
    responsible: ["Rafael Lima"],
    accountable: "Pedro Costa",
    consulted: ["Ana Silva"],
    informed: ["Maria Oliveira", "Carlos Santos"],
  },
  {
    id: "5",
    task: "Treinamento da Equipe",
    responsible: ["Maria Oliveira", "Ana Silva"],
    accountable: "Pedro Costa",
    consulted: ["Carlos Santos"],
    informed: ["Julia Mendes", "Rafael Lima"],
  },
];

export const departments = ["Operações", "Tecnologia", "Recursos Humanos", "Financeiro"];
