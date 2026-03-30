import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MatrixReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  cargoName: string;
  progress: number;
  userName?: string;
  userAvatarUrl?: string;
}

export function MatrixReminderModal({ isOpen, onClose, cargoName, progress, userName, userAvatarUrl }: MatrixReminderModalProps) {
  const navigate = useNavigate();
  const displayName = userName || "Colaborador";

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md border-none bg-transparent shadow-none overflow-visible p-0 [&>button]:hidden">
        <div className="relative w-full flex items-center justify-center" style={{ minHeight: 420 }}>
          <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-b from-red-50 via-white to-orange-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 shadow-2xl p-6 pt-8 flex flex-col items-center">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Profile Photo */}
            <div className="relative z-10 mb-3">
              <div className="w-28 h-28 rounded-2xl overflow-hidden shadow-xl border-4 border-white dark:border-gray-700 bg-gray-200">
                {userAvatarUrl ? (
                  <img src={userAvatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-400 to-red-500 text-white text-4xl font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center shadow-md">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* Title */}
            <h2 
              className="text-3xl mb-1 z-10"
              style={{
                fontFamily: "'Dancing Script', 'Georgia', cursive",
                color: "#D4520A",
                fontWeight: 700,
              }}
            >
              Atenção!
            </h2>

            <p className="text-base font-semibold text-foreground z-10 mb-1">
              {displayName}
            </p>
            <p className="text-sm text-muted-foreground z-10 mb-3">
              ✦ {cargoName}
            </p>

            {/* Message card */}
            <div className="relative z-10 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg w-full border border-orange-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-semibold text-foreground">Matriz Pendente</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Hoje é o último dia do mês e sua Matriz ainda não foi concluída. 
                Complete suas atividades pendentes para manter o comprometimento em dia!
              </p>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
                <div 
                  className="h-3 rounded-full transition-all bg-gradient-to-r from-amber-400 to-orange-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{cargoName}</span>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{progress}%</span>
              </div>

              {/* CTA button */}
              <button
                onClick={() => { onClose(); navigate("/matriz"); }}
                className="mt-3 w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm shadow hover:from-amber-600 hover:to-orange-600 transition-colors"
              >
                Concluir Matriz Agora
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
