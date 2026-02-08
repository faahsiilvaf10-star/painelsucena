import Layout from "@/components/layout/Layout";
import { CreatePostCard } from "@/components/instacena/CreatePostCard";
import { PostCard } from "@/components/instacena/PostCard";
import { useInstaCenaPosts } from "@/hooks/useInstaCena";
import { Loader2 } from "lucide-react";

const InstaCena = () => {
  const { data: posts, isLoading } = useInstaCenaPosts();

  return (
    <Layout>
      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">InstaCena</h1>

        <CreatePostCard />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : posts && posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
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
