import { useState, useRef, useEffect, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NeonAvatar } from "@/components/ui/NeonAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useAuth } from "@/hooks/useAuth";
import { UserWithStatus } from "@/hooks/useAllUsers";
import { EmojiPicker } from "./EmojiPicker";
import { Send, X, Loader2, Minimize2, Check, CheckCheck, Paperclip, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAllUsers } from "@/hooks/useAllUsers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ModeratorBadge } from "@/components/ModeratorBadge";
import { AvatarPreviewDialog } from "@/components/ui/AvatarPreviewDialog";

interface ChatPopupProps {
  user: UserWithStatus;
  onClose: () => void;
  onExpand: () => void;
}

const getInitials = (name: string) => {
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
};

const TypingIndicator = () => (
  <div className="flex justify-start mb-2">
    <div className="bg-white dark:bg-[#202c33] rounded-lg rounded-bl-none px-3 py-2 shadow-sm max-w-[80%]">
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  </div>
);

export const ChatPopup = ({ user: selectedUser, onClose, onExpand }: ChatPopupProps) => {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { messages, isLoading, sendMessage, uploadImage, clearConversation } = useChatMessages(selectedUser.user_id);
  const { isOtherTyping, sendTypingEvent, sendStopTypingEvent } = useTypingIndicator(selectedUser.user_id);
  const [confirmClear, setConfirmClear] = useState(false);
  const [persistedLastSeen, setPersistedLastSeen] = useState<string | null>(selectedUser.lastSeen ?? null);
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
  const { allUsers } = useAllUsers();

  // Get live user data (for real-time online status and lastSeen)
  const liveUser = useMemo(
    () => allUsers.find(u => u.user_id === selectedUser.user_id) ?? selectedUser,
    [allUsers, selectedUser]
  );

  const effectiveLastSeen = liveUser.lastSeen ?? persistedLastSeen ?? selectedUser.lastSeen ?? null;

  const formatLastSeen = (lastSeen?: string | null) => {
    if (!lastSeen) return "";
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "visto agora";
    if (diffMins < 60) return `visto há ${diffMins} min`;
    
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    const time = format(date, "HH:mm", { locale: ptBR });
    if (isToday) return `visto hoje às ${time}`;
    if (isYesterday) return `visto ontem às ${time}`;
    return `visto ${format(date, "dd/MM", { locale: ptBR })} às ${time}`;
  };

  useEffect(() => {
    setPersistedLastSeen(selectedUser.lastSeen ?? null);
  }, [selectedUser.lastSeen, selectedUser.user_id]);

  useEffect(() => {
    const loadLastSeen = async () => {
      const { data } = await supabase
        .from("user_presence")
        .select("last_seen_at")
        .eq("user_id", selectedUser.user_id)
        .maybeSingle();

      if (data?.last_seen_at) {
        setPersistedLastSeen(data.last_seen_at);
      }
    };

    const channel = supabase
      .channel(`chat-popup-presence-${selectedUser.user_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_presence",
          filter: `user_id=eq.${selectedUser.user_id}`,
        },
        (payload) => {
          const nextLastSeen = (payload.new as { last_seen_at?: string | null }).last_seen_at ?? null;
          setPersistedLastSeen(nextLastSeen);
        }
      )
      .subscribe();

    void loadLastSeen();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUser.user_id]);

  // Auto-scroll to bottom when new messages arrive

  // Focus input when popup opens
  useEffect(() => {
    if (!isMinimized && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isMinimized]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);
    if (value.trim()) {
      sendTypingEvent();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => sendStopTypingEvent(), 2000);
    } else {
      sendStopTypingEvent();
    }
  };

  const handleSend = async () => {
    if (!message.trim() && !pendingFile) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    sendStopTypingEvent();

    try {
      let imageUrl: string | undefined;
      if (pendingFile) {
        setIsUploading(true);
        imageUrl = await uploadImage(pendingFile);
      }
      await sendMessage.mutateAsync({ content: message.trim() || undefined, imageUrl });
      setMessage("");
      setPendingFile(null);
    } catch (error: any) {
      toast.error("Erro ao enviar: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    inputRef.current?.focus();
    sendTypingEvent();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }
    setPendingFile(file);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const unreadCount = messages.filter(m => m.sender_id === selectedUser.user_id && !m.read_at).length;

  // Minimized Facebook-style bubble
  if (isMinimized) {
    return (
      <div className="relative group cursor-pointer" onClick={() => setIsMinimized(false)}>
        <NeonAvatar
          src={selectedUser.avatar_url}
          name={selectedUser.full_name}
          frameColor={selectedUser.frame_color}
          neonColor={selectedUser.neon_color}
          frameAnimation={selectedUser.frame_animation}
          size="md"
        />
        {selectedUser.isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -top-1 -left-1 h-4 w-4 rounded-full bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
        >
          <X className="h-2.5 w-2.5" />
        </Button>
        <p className="text-[10px] text-center text-foreground mt-1 max-w-[56px] truncate">
          {selectedUser.full_name.split(" ")[0]}
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-card border border-border rounded-t-xl shadow-2xl flex flex-col transition-all duration-200 overflow-hidden h-96 w-80 relative"
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 bg-[#008069] dark:bg-[#1f2c34] cursor-pointer shrink-0"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="relative">
          <NeonAvatar
            src={selectedUser.avatar_url}
            name={selectedUser.full_name}
            frameColor={selectedUser.frame_color}
            neonColor={selectedUser.neon_color}
            frameAnimation={selectedUser.frame_animation}
            size="sm"
          />
          {liveUser.isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#008069] dark:border-[#1f2c34]" />
          )}
          {liveUser.isAdmin && (
            <div className="absolute -top-1 -right-1">
              {liveUser.isModerator ? <ModeratorBadge size="xs" /> : <VerifiedBadge size="xs" />}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate flex items-center gap-1">
            {liveUser.full_name}
            {liveUser.isModerator ? <ModeratorBadge size="xs" /> : liveUser.isAdmin && <VerifiedBadge size="xs" />}
          </p>
          <p className="text-white/70 text-xs truncate">
            {isOtherTyping ? (
              <span className="text-[#25d366]">digitando...</span>
            ) : liveUser.isOnline ? (
              "online"
            ) : effectiveLastSeen ? (
              formatLastSeen(effectiveLastSeen)
            ) : (
              "offline"
            )}
          </p>
        </div>

        {unreadCount > 0 && isMinimized && (
          <span className="w-5 h-5 rounded-full bg-[#25d366] text-white text-xs flex items-center justify-center font-medium">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmClear(true);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Chat Area - Hidden when minimized */}
      {!isMinimized && (
        <>
          {/* Messages */}
          <div
            className="flex-1 overflow-hidden relative"
            style={{ backgroundColor: "#e5ddd5" }}
          >
            <div className="absolute inset-0 bg-[#efeae2] dark:bg-[#0b141a] opacity-95" />

            <ScrollArea className="h-full relative z-10" ref={scrollRef}>
              <div className="px-3 py-2 space-y-1">
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-[#008069]" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full min-h-[100px]">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Inicie a conversa 📱
                    </p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isOwn = msg.sender_id === user?.id;
                    const showTail = index === 0 || messages[index - 1]?.sender_id !== msg.sender_id;

                    return (
                      <div key={msg.id} className={cn("flex mb-0.5", isOwn ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "max-w-[80%] px-2 py-1 shadow-sm relative",
                            isOwn
                              ? "bg-[#d9fdd3] dark:bg-[#005c4b] rounded-lg"
                              : "bg-white dark:bg-[#202c33] rounded-lg",
                            showTail && isOwn && "rounded-tr-none",
                            showTail && !isOwn && "rounded-tl-none"
                          )}
                        >
                          {msg.image_url && (
                            <img src={msg.image_url} alt="Imagem" className="max-w-full rounded-md mb-1" />
                          )}

                          <div className="flex items-end gap-1">
                            {msg.content && (
                              <p className="text-xs text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words">
                                {msg.content}
                              </p>
                            )}
                            <span
                              className={cn(
                                "text-[9px] flex items-center gap-0.5 shrink-0 ml-1",
                                "text-gray-500 dark:text-gray-400"
                              )}
                            >
                              {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                              {isOwn && (
                                msg.read_at ? (
                                  <CheckCheck className="h-3 w-3 text-[#53bdeb]" />
                                ) : msg.delivered_at ? (
                                  <CheckCheck className="h-3 w-3 text-gray-400" />
                                ) : (
                                  <Check className="h-3 w-3 text-gray-400" />
                                )
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {isOtherTyping && <TypingIndicator />}
              </div>
            </ScrollArea>
          </div>

          {/* Input Area */}
          <div className="flex items-center gap-1 px-2 py-2 bg-[#f0f2f5] dark:bg-[#1f2c34] shrink-0">
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileSelect}
            />

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full shrink-0"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            <Input
              ref={inputRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Mensagem"
              className="flex-1 rounded-full bg-white dark:bg-[#2a3942] border-0 px-3 h-8 text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={isUploading || sendMessage.isPending}
            />

            <Button
              size="icon"
              className={cn(
                "h-8 w-8 rounded-full shrink-0 transition-colors",
                "bg-[#008069] hover:bg-[#017561] text-white"
              )}
              onClick={handleSend}
              disabled={(!message.trim() && !pendingFile) || isUploading || sendMessage.isPending}
            >
              {isUploading || sendMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </>
      )}

      {/* Confirmation overlay for clearing conversation */}
      {confirmClear && (
        <div className="absolute inset-0 z-20 bg-black/50 flex items-center justify-center rounded-t-xl">
          <div className="bg-card rounded-lg p-4 mx-4 shadow-xl space-y-3 max-w-[260px]">
            <p className="text-sm text-foreground text-center">Limpar toda a conversa?</p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmClear(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  try {
                    await clearConversation();
                    setConfirmClear(false);
                    toast.success("Conversa limpa!");
                  } catch {
                    toast.error("Erro ao limpar conversa.");
                  }
                }}
              >
                Limpar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
