import { useMemo } from "react";
import { Cake, PartyPopper, Gift } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { colaboradoresAtivos } from "@/data/efetivoData";
import { getBrazilNorthDate } from "@/lib/timezone";

const BirthdayBanner = () => {
  const today = getBrazilNorthDate();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth() + 1; // 1-indexed

  // Parse DD/MM/YYYY to { day, month }
  const parseBirthDate = (dateStr: string) => {
    const [day, month] = dateStr.split("/").map(Number);
    return { day, month };
  };

  // Get today's birthdays
  const todayBirthdays = useMemo(() => {
    return colaboradoresAtivos.filter((c) => {
      const { day, month } = parseBirthDate(c.dataNascimento);
      return day === currentDay && month === currentMonth;
    });
  }, [currentDay, currentMonth]);

  // Get all birthdays in the current month (only show on day 1)
  const monthBirthdays = useMemo(() => {
    if (currentDay !== 1) return [];
    
    return colaboradoresAtivos
      .filter((c) => {
        const { month } = parseBirthDate(c.dataNascimento);
        return month === currentMonth;
      })
      .sort((a, b) => {
        const dayA = parseBirthDate(a.dataNascimento).day;
        const dayB = parseBirthDate(b.dataNascimento).day;
        return dayA - dayB;
      });
  }, [currentDay, currentMonth]);

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Don't render if no birthdays
  if (todayBirthdays.length === 0 && monthBirthdays.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Today's birthdays */}
      {todayBirthdays.length > 0 && (
        <Card className="border-2 border-yellow-400/50 bg-gradient-to-r from-yellow-50/50 to-orange-50/50 dark:from-yellow-950/20 dark:to-orange-950/20 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-yellow-400/20 rounded-full">
                <Cake className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <span className="text-gradient-gold">🎂 Aniversariante{todayBirthdays.length > 1 ? "s" : ""} do Dia!</span>
              <PartyPopper className="w-5 h-5 text-pink-500 animate-bounce" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {todayBirthdays.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 rounded-lg px-4 py-3 shadow-sm border border-yellow-200 dark:border-yellow-800"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {person.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{person.nome}</p>
                    <p className="text-sm text-muted-foreground">{person.funcao}</p>
                  </div>
                  <Gift className="w-5 h-5 text-pink-500 ml-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Month's birthdays (only on day 1) */}
      {monthBirthdays.length > 0 && currentDay === 1 && (
        <Card className="border border-purple-300/50 bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-purple-400/20 rounded-full">
                <PartyPopper className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span>Aniversariantes de {monthNames[currentMonth - 1]}</span>
              <Badge variant="secondary" className="ml-2">{monthBirthdays.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {monthBirthdays.map((person) => {
                const { day } = parseBirthDate(person.dataNascimento);
                return (
                  <div
                    key={person.id}
                    className="flex items-center gap-2 bg-white/60 dark:bg-gray-800/60 rounded-md px-3 py-2 text-sm"
                  >
                    <Badge variant="outline" className="shrink-0 min-w-[40px] justify-center">
                      {day.toString().padStart(2, "0")}
                    </Badge>
                    <span className="truncate font-medium">{person.nome}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BirthdayBanner;
