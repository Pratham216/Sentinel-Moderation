import { useParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { PostInteraction } from '@/components/post/PostInteraction';
import { useEffect, useRef } from 'react';

export function MyPostsPage() {
  const { communityId } = useParams();
  const observerRef = useRef<HTMLDivElement>(null);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get<{ user: { id: string; email: string; name: string } }>('/auth/me');
      return data.user;
    },
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['posts', communityId, 'me', 'only'],
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get(`/communities/${communityId}/posts`, {
        params: {
          authorId: me?.id,
          cursor: pageParam,
          limit: 10
        }
      });
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!me?.id && !!communityId,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allPosts = data?.pages.flatMap(page => page.posts) || [];

  return (
    <div className="w-full py-12 px-10 space-y-10 min-h-screen">
      <div className="space-y-1">
        <h1 className="text-4xl font-black text-slate-900 font-outfit tracking-tight">Your Posts</h1>
        <p className="text-sm text-slate-500 font-medium">History of your contributions to the community</p>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-10 w-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading your history...</p>
          </div>
        ) : allPosts.length === 0 ? (
          <div className="bg-white rounded-[32px] border border-slate-100 p-16 text-center space-y-4 shadow-sm">
            <div className="h-20 w-20 rounded-3xl bg-slate-50 flex items-center justify-center mx-auto text-slate-300">
              <span className="material-symbols-outlined text-4xl">history_edu</span>
            </div>
            <div className="space-y-1">
              <p className="text-slate-900 font-bold text-lg">No posts yet</p>
              <p className="text-slate-400 text-sm font-medium">When you share something, it will appear here.</p>
            </div>
          </div>
        ) : (
          <>
            {allPosts.map((post: any) => (
              <div key={post.id} className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm hover:shadow-lg transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                      post.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                      post.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {post.status}
                    </span>
                    <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {formatDistanceToNow(new Date(post.createdAt))} ago
                    </span>
                  </div>
                  <button className="h-8 w-8 flex items-center justify-center text-slate-300 hover:text-blue-600 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">more_vert</span>
                  </button>
                </div>
                
                <div className="text-slate-700 text-base leading-relaxed font-medium">
                  {post.text}
                </div>

                {post.mediaUrls && post.mediaUrls.length > 0 && (
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {post.mediaUrls.map((url: string, i: number) => (
                      <img key={i} src={url} className="rounded-2xl w-full h-48 object-cover border border-slate-100 shadow-sm" alt="Post media" />
                    ))}
                  </div>
                )}

                <div className="mt-8 flex items-center gap-2 border-t border-slate-50 pt-6">
                  <PostInteraction 
                    postId={post.id} 
                    icon="favorite" 
                    count={post._count?.likes || 0} 
                    activeColor="text-rose-500" 
                    hoverBg="hover:bg-rose-50" 
                    isActive={post.isLiked}
                    actionPath="like"
                  />
                  <PostInteraction 
                    postId={post.id} 
                    icon="chat_bubble" 
                    count={post._count?.comments || 0} 
                    activeColor="text-blue-500" 
                    hoverBg="hover:bg-blue-50" 
                    actionPath="comment"
                    isActive={false}
                  />
                </div>
              </div>
            ))}

            <div ref={observerRef} className="py-10 flex justify-center">
              {isFetchingNextPage ? (
                <div className="h-6 w-6 border-2 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
              ) : hasNextPage ? (
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading more history...</p>
              ) : (
                <p className="text-[10px] font-black text-slate-200 uppercase tracking-widest">End of history</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
