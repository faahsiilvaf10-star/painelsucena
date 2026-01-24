import { useOnlineUsers, OnlineUser } from "@/hooks/useOnlineUsers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnlineUsersFooterProps {
  onUserClick: (user: OnlineUser) => void;
}

const cargoLabels: Record<string, string> = {
  preposto: "Preposto",
  encarregado_geral: "Enc. Geral",
  encarregado_i: "Enc. I",
  encarregado_ii: "Enc. II",
  tecnico_seguranca_i: "TST I",
  tecnico_seguranca_ii: "TST II",
  tecnico_meio_ambiente: "TMA",
  aux_administrativo: "Aux. Adm.",
  aux_almoxarifado: "Aux. Almox.",
  planejador: "Planejador",
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

export const OnlineUsersFooter = ({ onUserClick }: OnlineUsersFooterProps) => {
  const { onlineUsers } = useOnlineUsers();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
      <div className="flex items-center gap-3 px-4 py-2 overflow-x-auto">
        <div className="flex items-center gap-2 text-muted-foreground shrink-0">
          <Users className="h-4 w-4" />
          <span className="text-xs font-medium">Online</span>
          <Badge variant="secondary" className="text-xs">
            {onlineUsers.length}
          </Badge>
        </div>

        <div className="h-6 w-px bg-border shrink-0" />

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {onlineUsers.length === 0 ? (
            <span className="text-xs text-muted-foreground">
              Nenhum usuário online
            </span>
          ) : (
            onlineUsers.map((user) => (
              <button
                key={user.user_id}
                onClick={() => onUserClick(user)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full",
                  "bg-secondary/50 hover:bg-secondary transition-colors",
                  "shrink-0 group"
                )}
              >
                <div className="relative">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-xs font-medium group-hover:text-primary transition-colors">
                    {user.full_name.split(" ")[0]}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {cargoLabels[user.cargo] || user.cargo}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
