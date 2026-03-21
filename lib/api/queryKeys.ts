import type { PostCategory } from "@/types";

import type { PostListSort } from "./posts";

interface PostsListParams {
  schoolId: string;
  category?: PostCategory | "all";
  sort?: PostListSort;
  search?: string;
}

export const queryKeys = {
  posts: {
    all: ["posts"] as const,
    list: ({
      schoolId,
      category = "all",
      sort = "latest",
      search = "",
    }: PostsListParams) =>
      ["posts", "list", { schoolId, category, sort, search }] as const,
  },
} as const;
