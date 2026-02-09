import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { CreatePostCard } from "@/components/instacena/CreatePostCard";
import { PostCard } from "@/components/instacena/PostCard";
import { useInstaCenaPosts } from "@/hooks/useInstaCena";
import { Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const InstaCena = () => {
  const { data: posts, isLoading } = useInstaCenaPosts();
  const [filter, setFilter] = useState<"all" | "posts" | "logs">("all");

  const filteredPosts = posts?.filter((p) => {
    if (filter === "posts") return !p.is_system_post;
    if (filter === "logs") return p.is_system_post;
    return true;
  });

  return (
    <Layout>
      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">InstaCena</h1>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-3 h-6">Tudo</TabsTrigger>
              <TabsTrigger value="posts" className="text-xs px-3 h-6">Posts</TabsTrigger>
              <TabsTrigger value="logs" className="text-xs px-3 h-6">Logs</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <CreatePostCard />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredPosts && filteredPosts.length > 0 ? (
          filteredPosts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <p className="text-center text-muted-foreground py-12 text-sm">
            Nenhuma publicação ainda. Seja o primeiro a postar! 🎉
          </p>
        )}
      </div>
    </Layout>
  );
};

export default InstaCena;
