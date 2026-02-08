import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageCircle, ThumbsUp, Heart, Laugh, Frown, Angry, AlertCircle, Trash2, MoreHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useInstaCenaComments, useInstaCenaReactions, useToggleReaction, useDeletePost, useCreateComment, type InstaCenaPost } from "@/hooks/useInstaCena";
import { toast } from "sonner";

const REACTIONS = [
  { type: "like", emoji: "👍", label: "Curtir", icon: ThumbsUp },
  { type: "love", emoji: "❤️", label: "Amei" },
  { type: "haha", emoji: "😂", label: "Haha" },
  { type: "wow", emoji: "😮", label: "Uau" },
  { type: "sad", emoji: "😢", label: "Triste" },
  { type: "angry", emoji: "😡", label: "Grr" },
];

const getInitials = (name: string) => {
  const parts = name.split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

export function PostCard({ post }: { post: InstaCenaPost }) {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { data: comments = [] } = useInstaCenaComments(post.id);
  const { data: reactions = [] } = useInstaCenaReactions(post.id);
  const toggleReaction = useToggleReaction();
  const deletePost = useDeletePost();
  const createComment = useCreateComment();

  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [reactionsOpen, setReactionsOpen] = useState(false);

  const myReaction = reactions.find((r) => r.user_id === user?.id);
  const isOwner = post.user_id === user?.id;

  // Group reactions by type
  const reactionGroups = reactions.reduce((acc, r) => {
    acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleReact = (type: string) => {
    toggleReaction.mutate({ postId: post.id, reactionType: type });
    setReactionsOpen(false);
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    createComment.mutate({ postId: post.id, content: commentText.trim() }, {
      onSuccess: () => setCommentText(""),
    });
  };

  const handleDelete = () => {
    deletePost.mutate(post.id, {
      onSuccess: () => toast.success("Publicação excluída"),
    });
  };

  const currentReactionEmoji = myReaction
    ? REACTIONS.find((r) => r.type === myReaction.reaction_type)?.emoji || "👍"
    : null;

  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.user_avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {getInitials(post.user_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm flex items-center gap-1">
              {post.user_name}
              {post.user_cargo === "admin" && (
                <VerifiedBadge size="xs" />
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
            </p>
          </div>
          {(isOwner || isAdmin) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Content */}
        {post.content && (
          <p className="text-sm whitespace-pre-wrap mb-3">{post.content}</p>
        )}

        {/* Images & Videos */}
        {post.image_urls && post.image_urls.length > 0 && (
          <div className={`grid gap-2 mb-3 ${post.image_urls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {post.image_urls.map((url, i) => {
              const isVideo = /\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(url);
              return isVideo ? (
                <video key={i} src={url} controls className="rounded-lg w-full max-h-80" />
              ) : (
                <img key={i} src={url} alt="" className="rounded-lg w-full object-cover max-h-80" />
              );
            })}
          </div>
        )}

        {/* Reaction summary */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground">
            {Object.entries(reactionGroups).map(([type, count]) => {
              const r = REACTIONS.find((rx) => rx.type === type);
              return (
                <span key={type} className="flex items-center gap-0.5">
                  {r?.emoji} {count}
                </span>
              );
            })}
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center border-t border-b border-border/50 py-1 -mx-4 px-4 gap-1">
          <Popover open={reactionsOpen} onOpenChange={setReactionsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`flex-1 gap-1.5 text-xs ${myReaction ? "text-primary font-semibold" : "text-muted-foreground"}`}
              >
                {currentReactionEmoji ? (
                  <span className="text-base">{currentReactionEmoji}</span>
                ) : (
                  <ThumbsUp className="h-4 w-4" />
                )}
                {myReaction ? REACTIONS.find((r) => r.type === myReaction.reaction_type)?.label || "Curtir" : "Curtir"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-1.5 flex gap-1" side="top" align="start">
              {REACTIONS.map((r) => (
                <button
                  key={r.type}
                  onClick={() => handleReact(r.type)}
                  className="text-xl hover:scale-125 transition-transform p-1 rounded-md hover:bg-accent"
                  title={r.label}
                >
                  {r.emoji}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="sm"
            className="flex-1 gap-1.5 text-xs text-muted-foreground"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="h-4 w-4" />
            Comentar {comments.length > 0 && `(${comments.length})`}
          </Button>
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="mt-3 space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={c.user_avatar_url || undefined} />
                  <AvatarFallback className="text-[10px] bg-muted">
                    {getInitials(c.user_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted/50 rounded-xl px-3 py-1.5 flex-1">
                  <p className="text-xs font-semibold">{c.user_name}</p>
                  <p className="text-xs">{c.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}

            {/* Comment input */}
            <div className="flex gap-2 items-end">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleComment()}
                placeholder="Escreva um comentário..."
                className="flex-1 rounded-full bg-muted/50 border border-border/50 px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/30"
              />
              <Button size="sm" variant="ghost" onClick={handleComment} disabled={!commentText.trim()}>
                Enviar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
