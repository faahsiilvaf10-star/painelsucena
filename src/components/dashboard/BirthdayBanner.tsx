import { useMemo } from "react";
import { Cake, PartyPopper, Gift } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBrazilNorthDate } from "@/lib/timezone";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";

const BirthdayBanner = () => {
  const { data } = useRHEfetivo();
  const colaboradoresAtivos = useMemo(
    () => (data?.colaboradores ?? []).filter((c: any) => c.status !== "inativo" && c.status !== "demitido"),
    [data?.colaboradores]
  );
  const today = getBrazilNorthDate();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth() + 1; // 1-indexed
  const currentHour = today.getHours();
  
  // Only show today's birthdays until 16:00 (4 PM) Pará time
  const showTodayBirthdays = currentHour < 16;

  // Parse DD/MM/YYYY to { day, month }
  const parseBirthDate = (dateStr: string) => {
    const [day, month] = dateStr.split("/").map(Number);
    return { day, month };
  };

  // Get today's birthdays
  const todayBirthdays = useMemo(() => {
    if (!showTodayBirthdays) return [];
    return colaboradoresAtivos.filter((c) => {
      const { day, month } = parseBirthDate(c.dataNascimento);
      return day === currentDay && month === currentMonth;
    });
  }, [currentDay, currentMonth, showTodayBirthdays]);

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

  // Firework particles for animation
  const fireworkColors = [
    "bg-yellow-400", "bg-orange-400", "bg-pink-400", "bg-red-400", 
    "bg-purple-400", "bg-blue-400", "bg-green-400", "bg-amber-400"
  ];

  return (
    <div className="space-y-4">
      {/* Today's birthdays */}
      {todayBirthdays.length > 0 && (
        <Card className="relative border-2 border-yellow-400/50 bg-gradient-to-r from-yellow-50/50 to-orange-50/50 dark:from-yellow-950/20 dark:to-orange-950/20 overflow-hidden">
          {/* Fireworks animation container */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Multiple firework bursts */}
            {[...Array(8)].map((_, i) => (
              <div 
                key={i}
                className="absolute"
                style={{
                  left: `${10 + (i * 12)}%`,
                  bottom: '0%',
                  animationDelay: `${i * 0.4}s`
                }}
              >
                {/* Rising trail */}
                <div 
                  className={`w-1 h-1 rounded-full ${fireworkColors[i % fireworkColors.length]} opacity-80`}
                  style={{
                    animation: `firework-rise 2s ease-out infinite`,
                    animationDelay: `${i * 0.4}s`
                  }}
                />
                {/* Explosion particles */}
                {[...Array(8)].map((_, j) => (
                  <div
                    key={j}
                    className={`absolute w-1.5 h-1.5 rounded-full ${fireworkColors[(i + j) % fireworkColors.length]}`}
                    style={{
                      animation: `firework-burst 2s ease-out infinite`,
                      animationDelay: `${i * 0.4 + 0.8}s`,
                      transform: `rotate(${j * 45}deg) translateY(-20px)`
                    }}
                  />
                ))}
              </div>
            ))}
            
            {/* Sparkle effects */}
            {[...Array(15)].map((_, i) => (
              <div
                key={`sparkle-${i}`}
                className={`absolute w-1 h-1 rounded-full ${fireworkColors[i % fireworkColors.length]}`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `sparkle 1.5s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 2}s`
                }}
              />
            ))}
          </div>

          <style>{`
            @keyframes firework-rise {
              0% {
                transform: translateY(0);
                opacity: 1;
              }
              40% {
                transform: translateY(-60px);
                opacity: 1;
              }
              50%, 100% {
                transform: translateY(-60px);
                opacity: 0;
              }
            }
            
            @keyframes firework-burst {
              0%, 40% {
                transform: scale(0);
                opacity: 0;
              }
              50% {
                transform: scale(1);
                opacity: 1;
              }
              100% {
                transform: scale(2) translateY(-30px);
                opacity: 0;
              }
            }
            
            @keyframes sparkle {
              0%, 100% {
                transform: scale(0);
                opacity: 0;
              }
              50% {
                transform: scale(1);
                opacity: 1;
              }
            }
          `}</style>

          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400" />
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-yellow-400/20 rounded-full">
                <Cake className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <span className="text-gradient-gold">🎂 Aniversariante{todayBirthdays.length > 1 ? "s" : ""} do Dia!</span>
              <PartyPopper className="w-5 h-5 text-pink-500 animate-bounce" />
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
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
