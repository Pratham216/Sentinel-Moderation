import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { PostInteraction } from '@/components/post/PostInteraction';
import { useEffect, useRef } from 'react';

export function SavedPostsPage() {
  const observerRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['posts', 'saved'],
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get('/posts/saved', {
        params: {
          cursor: pageParam,
          limit: 10
        }
      });
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
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
        <h1 className="text-4xl font-black text-slate-900 font-outfit tracking-tight">Saved Posts</h1>
        <p className="text-sm text-slate-500 font-medium">Your private collection of interesting content</p>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-10 w-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Retrieving your collection...</p>
          </div>
        ) : allPosts.length === 0 ? (
          <div className="bg-white rounded-[40px] border border-slate-100 p-20 text-center space-y-6 shadow-sm">
            <div className="h-24 w-24 rounded-[32px] bg-slate-50 flex items-center justify-center mx-auto text-slate-200">
              <span className="material-symbols-outlined text-5xl">bookmark</span>
            </div>
            <div className="space-y-2">
              <p className="text-slate-900 font-black text-xl tracking-tight">Your collection is empty</p>
              <p className="text-slate-400 text-sm font-medium max-w-xs mx-auto">Click the bookmark icon on any post to save it for later.</p>
            </div>
          </div>
        ) : (
          <>
            {allPosts.map((post: any) => (
              <div key={post.id} className="bg-white rounded-[40px] border border-slate-200 p-10 shadow-sm hover:shadow-xl transition-all group">
                <div className="flex gap-8">
                  <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-slate-300 text-3xl">person</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-slate-900 text-xl tracking-tight">{post.author.name}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            {formatDistanceToNow(new Date(post.createdAt))} ago
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 text-slate-700 text-lg leading-relaxed font-medium">
                      {post.text}
                    </div>

                    {post.mediaUrls && post.mediaUrls.length > 0 && (
                      <div className="mt-8 grid grid-cols-2 gap-4">
                        {post.mediaUrls.map((url: string, i: number) => (
                          <img key={i} src={url} className="rounded-3xl w-full h-72 object-cover border border-slate-100 shadow-sm" alt="Post media" />
                        ))}
                      </div>
                    )}

                    <div className="mt-10 flex items-center gap-4 border-t border-slate-50 pt-8">
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
                      <div className="ml-auto">
                        <PostInteraction 
                          postId={post.id} 
                          icon="bookmark" 
                          count={0} 
                          activeColor="text-amber-500" 
                          hoverBg="hover:bg-amber-50" 
                          isActive={post.isSaved}
                          showCount={false}
                          actionPath="save"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div ref={observerRef} className="py-10 flex justify-center">
              {isFetchingNextPage ? (
                <div className="h-6 w-6 border-2 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
              ) : hasNextPage ? (
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading more saved content...</p>
              ) : (
                <p className="text-[10px] font-black text-slate-200 uppercase tracking-widest">End of your collection</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
