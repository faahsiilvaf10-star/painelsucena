export type HolidayType = "feriado" | "compensado" | "carnaval";

export interface HolidayInfo {
  date: string; // YYYY-MM-DD
  label: string;
  type: HolidayType;
}

export const HYDRO_HOLIDAYS_2026: HolidayInfo[] = [
  // Janeiro
  { date: "2026-01-01", label: "Confraternização Universal", type: "feriado" },

  // Fevereiro (Carnaval)
  { date: "2026-02-16", label: "Carnaval", type: "carnaval" },
  { date: "2026-02-17", label: "Carnaval", type: "carnaval" },
  { date: "2026-02-18", label: "Quarta de Cinzas (Dia Compensado)", type: "compensado" },

  // Abril
  { date: "2026-04-03", label: "Paixão de Cristo", type: "feriado" },
  { date: "2026-04-20", label: "Dia Compensado", type: "compensado" },
  { date: "2026-04-21", label: "Tiradentes", type: "feriado" },

  // Maio
  { date: "2026-05-01", label: "Dia do Trabalhador", type: "feriado" },

  // Junho
  { date: "2026-06-04", label: "Corpus Christi", type: "feriado" },
  { date: "2026-06-05", label: "Dia Compensado", type: "compensado" },

  // Setembro
  { date: "2026-09-07", label: "Independência do Brasil", type: "feriado" },

  // Outubro
  { date: "2026-10-12", label: "N. Sra. Aparecida / Dia das Crianças", type: "feriado" },

  // Novembro
  { date: "2026-11-02", label: "Finados", type: "feriado" },
  { date: "2026-11-15", label: "Proclamação da República", type: "feriado" },
  { date: "2026-11-20", label: "Dia da Consciência Negra", type: "feriado" },

  // Dezembro
  { date: "2026-12-03", label: "Feriado Municipal - São Francisco Xavier", type: "feriado" },
  { date: "2026-12-04", label: "Dia Compensado", type: "compensado" },
  { date: "2026-12-25", label: "Natal", type: "feriado" },
];

export function getHolidayForDate(dateStr: string): HolidayInfo | undefined {
  return HYDRO_HOLIDAYS_2026.find(h => h.date === dateStr);
}

export function isHoliday(dateStr: string): boolean {
  return HYDRO_HOLIDAYS_2026.some(h => h.date === dateStr);
}

export function getTomorrowHoliday(): HolidayInfo | undefined {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split("T")[0];
  return HYDRO_HOLIDAYS_2026.find(h => h.date === dateStr);
}
