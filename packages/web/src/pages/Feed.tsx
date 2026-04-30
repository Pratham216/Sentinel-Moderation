import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { PostInteraction } from '@/components/post/PostInteraction';

type Post = {
  id: string;
  text: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatarUrl?: string;
    trustScore: number;
  };
  moderationResult?: {
    toxicity: number;
    recommendation: string;
  };
  mediaUrls: string[];
  _count: {
    likes: number;
    comments: number;
  };
  isLiked: boolean;
  isSaved: boolean;
};

export function FeedPage() {
  const { communityId } = useParams();
  const observerRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['posts', communityId, 'feed'],
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get(`/communities/${communityId}/posts`, {
        params: {
          status: 'APPROVED',
          cursor: pageParam,
          limit: 10
        }
      });
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!communityId,
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
    <div className="w-full py-10 px-8 space-y-8 min-h-screen">
      <div className="flex items-center justify-between px-2">
         <div className="space-y-1">
           <h1 className="text-3xl font-black text-slate-900 tracking-tight font-outfit">Community Feed</h1>
           <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Hydrating from live stream</p>
         </div>
      </div>

      <div className="flex items-center gap-4 px-2">
         <div className="h-px flex-1 bg-slate-100"></div>
         <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Community Stream</span>
         <div className="h-px flex-1 bg-slate-100"></div>
      </div>

      {/* Feed List */}
      <div className="space-y-6 pb-20">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-10 w-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hydrating Feed...</p>
          </div>
        ) : allPosts.length === 0 ? (
           <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center space-y-4 shadow-sm">
              <span className="material-symbols-outlined text-5xl text-slate-200">forum</span>
              <p className="text-slate-500 font-medium italic">The feed is quiet. Be the first to start a conversation!</p>
           </div>
        ) : (
          <>
            {allPosts.map((post: Post) => (
              <PostCard key={post.id} post={post} />
            ))}
            
            {/* Intersection Observer Trigger */}
            <div ref={observerRef} className="py-10 flex justify-center">
              {isFetchingNextPage ? (
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 border-2 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading more content...</p>
                </div>
              ) : hasNextPage ? (
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scroll to discover more</p>
              ) : (
                <div className="flex flex-col items-center gap-2 opacity-50">
                  <div className="h-1 w-12 bg-slate-200 rounded-full"></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">You've reached the end of the stream</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}


function PostCard({ post }: { post: Post }) {
  const getEliteAvatar = (n: string) => {
    const mapping: Record<string, string> = {
        'Pratham Bisht': 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop',
        'Admin': 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop',
        'Member': 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop',
        'Moderator': 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop',
        'Pratham-Admin': 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=400&fit=crop'
    };
    return mapping[n] || mapping[n.replace('-Admin', '')];
  };

  const authorName = post.author.name || 'User Alpha';
  const avatarUrl = post.author.avatarUrl || getEliteAvatar(authorName);
  const authorInitial = authorName[0];
  
  return (
    <div className="bg-white rounded-[40px] border border-slate-100 p-10 shadow-sm hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300 group relative">
      <div className="flex gap-8">
        <div className="shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={authorName} className="h-16 w-16 rounded-[24px] object-cover border-4 border-white shadow-xl group-hover:scale-105 transition-transform" />
          ) : (
            <div className="h-16 w-16 rounded-[24px] bg-slate-900 flex items-center justify-center text-white text-xl font-bold border-4 border-white shadow-xl group-hover:scale-105 transition-transform">
              {authorInitial}
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-slate-900 text-xl tracking-tight font-outfit">{authorName}</span>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-emerald-100">
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                  REP {post.author.trustScore}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1 font-inter">
                {formatDistanceToNow(new Date(post.createdAt))} ago • AI VERIFIED
              </p>
            </div>
            <button className="h-11 w-11 flex items-center justify-center text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all">
              <span className="material-symbols-outlined text-[20px]">more_horiz</span>
            </button>
          </div>
          <div className="mt-8 text-slate-600 text-[16px] leading-[1.8] font-medium font-inter">
            {post.text}
          </div>
          
          {post.mediaUrls && post.mediaUrls.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-4">
              {post.mediaUrls.map((url, i) => (
                <img key={i} src={url} alt="Post content" className="w-full h-72 object-cover rounded-[32px] border border-slate-50 shadow-sm" />
              ))}
            </div>
          )}
          
          <div className="mt-10 flex items-center gap-3 border-t border-slate-50 pt-8">
            <PostInteraction 
              postId={post.id} 
              icon="favorite" 
              count={post._count.likes} 
              activeColor="text-rose-500" 
              hoverBg="hover:bg-rose-50" 
              isActive={post.isLiked}
              actionPath="like"
            />
            <PostInteraction 
              postId={post.id} 
              icon="chat_bubble" 
              count={post._count.comments} 
              activeColor="text-blue-500" 
              hoverBg="hover:bg-blue-50" 
              actionPath="comment"
              isActive={false}
            />
            <div className="ml-auto flex gap-2">
              <button className="h-11 w-11 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all">
                <span className="material-symbols-outlined text-[20px]">share</span>
              </button>
              <PostInteraction 
                postId={post.id} 
                icon="bookmark" 
                count={0}
                activeColor="text-blue-600" 
                hoverBg="hover:bg-blue-50" 
                isActive={post.isSaved}
                showCount={false}
                actionPath="save"
              />
            </div>
          </div>

          {/* Comment Section */}
          <div className="mt-10 space-y-8">
            <CommentInput postId={post.id} />
            <CommentsList postId={post.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentsList({ postId }: { postId: string }) {
  const getEliteAvatar = (n: string) => {
    const mapping: Record<string, string> = {
        'Pratham Bisht': 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop',
        'Admin': 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop',
        'Member': 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop',
        'Moderator': 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop',
        'Pratham-Admin': 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=400&fit=crop'
    };
    return mapping[n] || mapping[n.replace('-Admin', '')];
  };

  const { data: comments, isLoading } = useQuery({
    queryKey: ['posts', postId, 'comments'],
    queryFn: async () => {
      const { data } = await api.get(`/posts/${postId}/comments`);
      return data.comments as any[];
    },
  });

  if (isLoading) return null;
  if (!comments?.length) return null;

  return (
    <div className="space-y-6 pt-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar font-inter">
      {comments.map((comment) => {
        const commenterName = comment.user.name || 'User Sigma';
        const avatarUrl = comment.user.avatarUrl || getEliteAvatar(commenterName);
        return (
          <div key={comment.id} className="flex gap-5 group/comment">
            <div className="shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt={commenterName} className="h-10 w-10 rounded-xl object-cover border border-slate-100 shadow-sm" />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white text-[11px] font-bold border border-slate-100 shadow-sm">
                  {commenterName[0]}
                </div>
              )}
            </div>
            <div className="flex-1 bg-slate-50/50 rounded-3xl p-5 border border-slate-50 group-hover/comment:bg-slate-50 transition-all">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[12px] font-bold text-slate-900 tracking-tight">{commenterName}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{formatDistanceToNow(new Date(comment.createdAt))} ago</span>
              </div>
              <p className="text-sm text-slate-600 font-medium leading-relaxed italic">"{comment.text}"</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CommentInput({ postId }: { postId: string }) {
  const [text, setText] = useState('');
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (comment: string) => api.post(`/posts/${postId}/comment`, { text: comment }),
    onMutate: async (newCommentText: string) => {
      // 1. Optimistically update the comment count in the feed
      await qc.cancelQueries({ queryKey: ['posts'] });
      qc.setQueriesData({ queryKey: ['posts'] }, (old: any) => {
        if (!old) return old;
        const update = (p: any) => {
          if (p.id !== postId) return p;
          return { ...p, _count: { ...p._count, comments: (p._count?.comments || 0) + 1 } };
        };

        // Handle InfiniteQuery pages
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              posts: page.posts.map(update)
            }))
          };
        }

        if (Array.isArray(old)) return old.map(update);
        if (old.posts) return { ...old, posts: old.posts.map(update) };
        return old;
      });

      // 2. Optimistically add the comment to the comments list
      await qc.cancelQueries({ queryKey: ['posts', postId, 'comments'] });
      const previousComments = qc.getQueryData(['posts', postId, 'comments']);
      
      qc.setQueryData(['posts', postId, 'comments'], (old: any) => {
        const fakeComment = {
          id: Math.random().toString(),
          text: newCommentText,
          createdAt: new Date().toISOString(),
          user: { name: 'You' } // Or pull actual user name from store
        };
        const currentList = Array.isArray(old) ? old : (old?.comments || []);
        return [...currentList, fakeComment];
      });

      return { previousComments };
    },
    onSuccess: () => {
      setText('');
    },
    onError: (_err, _newComment, context) => {
      if (context?.previousComments) {
        qc.setQueryData(['posts', postId, 'comments'], context.previousComments);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['posts', postId, 'comments'] });
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  return (
    <div className="flex gap-3 items-center bg-slate-50 p-2 rounded-2xl border border-slate-100 focus-within:bg-white focus-within:border-blue-200 transition-all">
      <div className="h-8 w-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
        <span className="material-symbols-outlined text-[18px]">add_comment</span>
      </div>
      <input 
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && text.trim()) {
            mutation.mutate(text);
          }
        }}
        placeholder="Write a comment..." 
        className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-600 placeholder:text-slate-400 py-2"
      />
      <button 
        onClick={() => text.trim() && mutation.mutate(text)}
        disabled={mutation.isPending || !text.trim()}
        className="h-8 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
      >
        {mutation.isPending ? '...' : 'Post'}
      </button>
    </div>
  );
}
