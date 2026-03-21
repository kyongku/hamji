import { createClient } from "@/lib/supabase-browser";

import type { Post, PostCategory } from "@/types";

export const PAGE_SIZE = 20;

export type PostListSort = "latest" | "popular" | "comments";

interface FetchPostsPageParams {
  pageParam?: number;
  schoolId: string;
  category?: PostCategory | "all";
  sort?: PostListSort;
  search?: string;
}

interface FetchPostsPageResult {
  posts: Post[];
  nextCursor: number | null;
}

export async function fetchPostsPage({
  pageParam = 0,
  schoolId,
  category = "all",
  sort = "latest",
  search = "",
}: FetchPostsPageParams): Promise<FetchPostsPageResult> {
  const supabase = createClient();
  const from = pageParam * PAGE_SIZE;
  const trimmedSearch = search.trim();

  let query = supabase
    .from("posts")
    .select("*, user:users(nickname)")
    .eq("school_id", schoolId)
    .is("deleted_at", null)
    .eq("is_hidden", false);

  if (category !== "all") {
    query = query.eq("category", category);
  }

  if (trimmedSearch) {
    query = query.or(`title.ilike.%${trimmedSearch}%,content.ilike.%${trimmedSearch}%`);
  }

  switch (sort) {
    case "popular":
      query = query.order("like_count", { ascending: false }).order("created_at", { ascending: false });
      break;
    case "comments":
      query = query.order("comment_count", { ascending: false }).order("created_at", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  const { data, error } = await query.range(from, from + PAGE_SIZE - 1);

  if (error) {
    throw error;
  }

  const posts = (data ?? []) as Post[];

  return {
    posts,
    nextCursor: posts.length === PAGE_SIZE ? pageParam + 1 : null,
  };
}
