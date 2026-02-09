import { useState, useRef, useCallback } from "react";
import { ImagePlus, Video, Send, X, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useProfile } from "@/hooks/useProfile";
import { useCreatePost } from "@/hooks/useInstaCena";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MentionPicker } from "./MentionPicker";
import { FormattingToolbar } from "./FormattingToolbar";

const getInitials = (name: string) => {
  const parts = name.split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

export function CreatePostCard() {
  const { data: profile } = useProfile();
  const createPost = useCreatePost();
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMention, setShowMention] = useState(false);
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setContent(val);

    // Detect @mention trigger
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setShowMention(true);
      setMentionQuery(atMatch[1]);
      setMentionCursorPos(cursorPos - atMatch[0].length);
    } else {
      setShowMention(false);
      setMentionQuery("");
    }
  }, []);

  const handleMentionSelect = useCallback((profile: { user_id: string; full_name: string }) => {
    const before = content.slice(0, mentionCursorPos);
    const after = content.slice(mentionCursorPos).replace(/^@\w*/, "");
    const mention = `@[${profile.full_name}](${profile.user_id}) `;
    setContent(before + mention + after);
    setShowMention(false);
    setMentionQuery("");
    // Focus back on textarea
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [content, mentionCursorPos]);

  const handleFormat = useCallback((prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.slice(start, end);

    const newContent =
      content.slice(0, start) + prefix + (selectedText || "texto") + suffix + content.slice(end);
    setContent(newContent);

    // Position cursor after the inserted text
    setTimeout(() => {
      textarea.focus();
      const cursorPos = selectedText
        ? start + prefix.length + selectedText.length + suffix.length
        : start + prefix.length;
      const selectEnd = selectedText ? cursorPos : cursorPos + 5; // select "texto" if no selection
      textarea.setSelectionRange(selectedText ? cursorPos : start + prefix.length, selectEnd);
    }, 10);
  }, [content]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const urls: string[] = [];

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `instacena/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("site-assets").upload(path, file);
      if (error) {
        toast.error("Erro ao enviar imagem");
        continue;
      }
      const { data: pub } = supabase.storage.from("site-assets").getPublicUrl(path);
      urls.push(pub.publicUrl);
    }

    setImages((prev) => [...prev, ...urls]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const urls: string[] = [];

    for (const file of Array.from(files)) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error("Vídeo muito grande (máx. 50MB)");
        continue;
      }

      // Validate duration
      const duration = await getVideoDuration(file);
      if (duration > 30) {
        toast.error("Vídeo deve ter no máximo 30 segundos");
        continue;
      }

      const ext = file.name.split(".").pop();
      const path = `instacena/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("site-assets").upload(path, file);
      if (error) {
        toast.error("Erro ao enviar vídeo");
        continue;
      }
      const { data: pub } = supabase.storage.from("site-assets").getPublicUrl(path);
      urls.push(pub.publicUrl);
    }

    setVideos((prev) => [...prev, ...urls]);
    setUploading(false);
    if (videoRef.current) videoRef.current.value = "";
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => resolve(0);
      video.src = URL.createObjectURL(file);
    });
  };

  const handleSubmit = () => {
    if (!content.trim() && images.length === 0 && videos.length === 0) return;
    createPost.mutate(
      { content: content.trim(), imageUrls: [...images, ...videos] },
      {
        onSuccess: () => {
          setContent("");
          setImages([]);
          setVideos([]);
          toast.success("Publicação criada!");
        },
        onError: () => toast.error("Erro ao publicar"),
      }
    );
  };

  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {getInitials(profile?.full_name || "U")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              placeholder="No que você está pensando? Use @ para mencionar"
              className="min-h-[60px] resize-none border-none bg-muted/30 focus-visible:ring-0 text-sm"
            />
            <MentionPicker
              query={mentionQuery}
              visible={showMention}
              onSelect={handleMentionSelect}
            />
          </div>
        </div>

        {/* Preview images */}
        {images.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {images.map((url, i) => (
              <div key={i} className="relative">
                <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover" />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Preview videos */}
        {videos.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {videos.map((url, i) => (
              <div key={i} className="relative">
                <video src={url} className="h-20 w-20 rounded-lg object-cover" muted />
                <button
                  onClick={() => setVideos((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Formatting toolbar */}
        <div className="mt-2 px-1">
          <FormattingToolbar onFormat={handleFormat} />
        </div>

        <div className="flex items-center justify-between mt-2 pt-3 border-t border-border/50">
          <div className="flex gap-1">
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
            <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="text-muted-foreground gap-1.5 text-xs">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              Foto
            </Button>
            <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
            <Button variant="ghost" size="sm" onClick={() => videoRef.current?.click()} disabled={uploading} className="text-muted-foreground gap-1.5 text-xs">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
              Vídeo
            </Button>
          </div>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={(!content.trim() && images.length === 0 && videos.length === 0) || createPost.isPending}
            className="gap-1.5"
          >
            {createPost.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Publicar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
