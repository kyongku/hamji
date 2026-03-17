"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useAppStore } from "@/lib/store";
import PostCard from "@/components/PostCard";
import type { Post } from "@/types";

export default function MyPostsPage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("posts")
      .select("*, user:users(nickname)")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setPosts(data);
        setLoading(false);
      });
  }, [user]);

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="text-gray-400 text-sm">←</button>
        <h1 className="text-base font-bold text-gray-800">내가 쓴 글</h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
              <div className="h-5 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm">아직 작성한 글이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
