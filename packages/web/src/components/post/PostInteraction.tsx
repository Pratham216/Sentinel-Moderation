import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface PostInteractionProps {
  postId: string;
  icon: string;
  count: number;
  activeColor: string;
  hoverBg: string;
  actionPath: string;
  isActive: boolean;
  showCount?: boolean;
}

export function PostInteraction({ postId, icon, count, activeColor, hoverBg, actionPath, isActive, showCount = true }: PostInteractionProps) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload?: any) => api.post(`/posts/${postId}/${actionPath}`, payload || {}),
    onMutate: async () => {
      // Cancel any outgoing refetches
      await qc.cancelQueries({ queryKey: ['posts'] });

      // Snapshot the previous value
      const previousPosts = qc.getQueriesData({ queryKey: ['posts'] });

      // Optimistically update to the new value
      qc.setQueriesData({ queryKey: ['posts'] }, (old: any) => {
        if (!old) return old;
        
        const updatePost = (p: any) => {
          if (p.id !== postId) return p;
          const isLike = actionPath === 'like';
          const isSave = actionPath === 'save';
          const isComment = actionPath === 'comment';

          if (isComment) {
            return {
              ...p,
              _count: { ...p._count, comments: (p._count?.comments || 0) + 1 }
            };
          }

          if (isLike) {
            const newIsLiked = !p.isLiked;
            return {
              ...p,
              isLiked: newIsLiked,
              _count: {
                ...p._count,
                likes: (p._count?.likes || 0) + (newIsLiked ? 1 : -1)
              }
            };
          }

          if (isSave) {
            return {
              ...p,
              isSaved: !p.isSaved
            };
          }

          return p;
        };

        // Handle InfiniteQuery pages
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              posts: page.posts.map(updatePost)
            }))
          };
        }

        if (Array.isArray(old)) return old.map(updatePost);
        if (old.posts) return { ...old, posts: old.posts.map(updatePost) };
        return old;
      });

      return { previousPosts };
    },
    onError: (_err, _newTodo, context: any) => {
      if (context?.previousPosts) {
        context.previousPosts.forEach(([queryKey, data]: [any, any]) => {
          qc.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const activeStyles = isActive ? activeColor : 'text-slate-400';

  return (
    <button 
      onClick={() => mutation.mutate(undefined)}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 group/action ${activeStyles} ${hoverBg}`}
    >
      <span 
        className={`material-symbols-outlined text-[20px] group-hover/action:scale-110 transition-transform`}
        style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
      >
        {icon}
      </span>
      {showCount && <span className="text-xs font-bold font-outfit">{count}</span>}
    </button>
  );
}
