import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useAuth } from "@/hooks/useAuth";
import { OnlineUser } from "@/hooks/useOnlineUsers";
import { EmojiPicker } from "./EmojiPicker";
import { Send, Image, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUser: OnlineUser | null;
}

const cargoLabels: Record<string, string> = {
  preposto: "Preposto",
  encarregado_geral: "Encarregado Geral",
  encarregado_i: "Encarregado I",
  encarregado_ii: "Encarregado II",
  tecnico_seguranca_i: "Técnico Segurança I",
  tecnico_seguranca_ii: "Técnico Segurança II",
  tecnico_meio_ambiente: "Técnico Meio Ambiente",
  aux_administrativo: "Aux. Administrativo",
  aux_almoxarifado: "Aux. Almoxarifado",
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

// Typing indicator animation component
const TypingIndicator = () => (
  <div className="flex items-center gap-1 px-3 py-2 bg-secondary rounded-2xl rounded-bl-sm w-fit">
    <div className="flex items-center gap-1">
      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
    </div>
    <span className="text-xs text-muted-foreground ml-1">digitando...</span>
  </div>
);

export const ChatDialog = ({
  open,
  onOpenChange,
  selectedUser,
}: ChatDialogProps) => {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { messages, isLoading, sendMessage, uploadImage } = useChatMessages(
    selectedUser?.user_id || null
  );

  const { isOtherTyping, sendTypingEvent, sendStopTypingEvent } = useTypingIndicator(
    selectedUser?.user_id || null
  );

  // Auto-scroll to bottom when new messages arrive or typing indicator shows
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOtherTyping]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Handle typing events
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);

    if (value.trim()) {
      sendTypingEvent();
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to send stop typing after 2 seconds of no typing
      typingTimeoutRef.current = setTimeout(() => {
        sendStopTypingEvent();
      }, 2000);
    } else {
      sendStopTypingEvent();
    }
  };

  const handleSend = async () => {
    if (!message.trim() && !pendingFile) return;

    // Clear typing timeout and send stop event
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendStopTypingEvent();

    try {
      let imageUrl: string | undefined;

      if (pendingFile) {
        setIsUploading(true);
        imageUrl = await uploadImage(pendingFile);
      }

      await sendMessage.mutateAsync({
        content: message.trim() || undefined,
        imageUrl,
      });

      setMessage("");
      setPreviewImage(null);
      setPendingFile(null);
    } catch (error: any) {
      toast.error("Erro ao enviar mensagem: " + error.message);
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
    setMessage((prev) => prev + emoji);
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
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearPreview = () => {
    setPreviewImage(null);
    setPendingFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  if (!selectedUser) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[80vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedUser.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(selectedUser.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                {selectedUser.full_name}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {isOtherTyping ? (
                  <span className="text-primary animate-pulse">digitando...</span>
                ) : (
                  cargoLabels[selectedUser.cargo] || selectedUser.cargo
                )}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="py-4 space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Nenhuma mensagem ainda</p>
                <p className="text-xs mt-1">
                  Envie uma mensagem para iniciar a conversa
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.sender_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={cn("flex", isOwn ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3 py-2",
                        isOwn
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-secondary rounded-bl-sm"
                      )}
                    >
                      {msg.image_url && (
                        <img
                          src={msg.image_url}
                          alt="Imagem"
                          className="max-w-full rounded-lg mb-1"
                        />
                      )}
                      {msg.content && (
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                      )}
                      <p
                        className={cn(
                          "text-[10px] mt-1",
                          isOwn
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        )}
                      >
                        {format(new Date(msg.created_at), "HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            
            {/* Typing indicator */}
            {isOtherTyping && <TypingIndicator />}
          </div>
        </ScrollArea>

        {/* Image Preview */}
        {previewImage && (
          <div className="px-4 py-2 border-t">
            <div className="relative inline-block">
              <img
                src={previewImage}
                alt="Preview"
                className="h-20 rounded-lg"
              />
              <button
                onClick={clearPreview}
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-3 border-t flex items-center gap-2 flex-shrink-0">
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
            className="h-8 w-8 shrink-0"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <Image className="h-5 w-5" />
          </Button>

          <Input
            ref={inputRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem..."
            className="flex-1"
            disabled={isUploading || sendMessage.isPending}
          />

          <Button
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleSend}
            disabled={
              (!message.trim() && !pendingFile) ||
              isUploading ||
              sendMessage.isPending
            }
          >
            {isUploading || sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
