import { useState, useRef } from "react";
import { ImagePlus, Send, X, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useProfile } from "@/hooks/useProfile";
import { useCreatePost } from "@/hooks/useInstaCena";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = () => {
    if (!content.trim() && images.length === 0) return;
    createPost.mutate(
      { content: content.trim(), imageUrls: images },
      {
        onSuccess: () => {
          setContent("");
          setImages([]);
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
          <div className="flex-1">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="No que você está pensando?"
              className="min-h-[60px] resize-none border-none bg-muted/30 focus-visible:ring-0 text-sm"
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

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
          <div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
            <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="text-muted-foreground gap-1.5 text-xs">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              Foto
            </Button>
          </div>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={(!content.trim() && images.length === 0) || createPost.isPending}
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
