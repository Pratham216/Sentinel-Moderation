import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCommunitySocket } from '@/hooks/useCommunitySocket';
import { toast } from 'sonner';

type PostRow = {
  id: string;
  text: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'REMOVED';
  createdAt: string;
  authorId: string;
  author?: {
    name: string;
    trustScore: number;
  };
  moderationResult?: {
    toxicity: number;
    confidence: number;
  };
};

export function ModerationQueuePage() {
  const { communityId = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [page, setPage] = React.useState(1);
  const pageSize = 10;
  useCommunitySocket(communityId);

  const { data: posts, isLoading: isPostsLoading } = useQuery({
    queryKey: ['posts', communityId, 'FLAGGED'],
    queryFn: async () => {
      const { data } = await api.get(`/communities/${communityId}/posts?status=FLAGGED&limit=100`);
      return data.posts as PostRow[];
    },
    enabled: !!communityId,
  });

  const { data: analytics, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ['analytics', communityId],
    queryFn: async () => {
      const { data } = await api.get(`/communities/${communityId}/analytics?range=1d`);
      return data as { completedPosts: number; stats: { pending: number } };
    },
    enabled: !!communityId,
  });

  const act = useMutation({
    mutationFn: async ({ postId, action }: { postId: string; action: 'APPROVE' | 'REJECT' | 'FLAG' }) => {
      await api.post(`/posts/${postId}/actions`, { action });
    },
    onMutate: async ({ postId, action }) => {
      // 1. Optimistic list update
      const queueKey = ['posts', communityId, 'FLAGGED'];
      await qc.cancelQueries({ queryKey: queueKey });
      const prevPosts = qc.getQueryData(queueKey);
      qc.setQueryData(queueKey, (old: any) => {
        // Ensure we are working with an array of posts
        const postsArray = Array.isArray(old) ? old : (old?.posts || []);
        return postsArray.filter((p: any) => p.id !== postId);
      });

      // 2. Optimistic analytics update
      const analyticsKey = ['analytics', communityId];
      await qc.cancelQueries({ queryKey: analyticsKey });
      const prevAnalytics = qc.getQueryData(analyticsKey);
      qc.setQueryData(analyticsKey, (old: any) => ({
        ...old,
        completedPosts: (old?.completedPosts ?? 0) + 1
      }));

      if (action === 'APPROVE') toast.success('Approved');
      else toast.error('Rejected');

      return { prevPosts, prevAnalytics };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevPosts) qc.setQueryData(['posts', communityId, 'FLAGGED'], context.prevPosts);
      if (context?.prevAnalytics) qc.setQueryData(['analytics', communityId], context.prevAnalytics);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['posts', communityId] });
      qc.invalidateQueries({ queryKey: ['analytics', communityId] });
    },
  });

  const bulk = async (action: 'APPROVE' | 'REJECT' | 'FLAG') => {
    const count = selected.size;
    const queueKey = ['posts', communityId, 'FLAGGED'];
    const analyticsKey = ['analytics', communityId];

    qc.setQueryData(queueKey, (old: any) => {
      const postsArray = Array.isArray(old) ? old : (old?.posts || []);
      return postsArray.filter((p: any) => !selected.has(p.id));
    });
    qc.setQueryData(analyticsKey, (old: any) => ({
      ...old,
      completedPosts: (old?.completedPosts ?? 0) + count
    }));

    toast.promise(Promise.all(Array.from(selected).map(id => act.mutateAsync({ postId: id, action }))), {
      loading: `Updating ${count} items...`,
      success: `Updated ${count} items.`,
      error: 'Failed to update.',
    });
    setSelected(new Set());
  };

  const postsArray = Array.isArray(posts) ? posts : [];
  const highRiskCount = postsArray.filter(p => (p.moderationResult?.toxicity ?? 0) > 0.85).length;
  
  const avgConfidence = postsArray.length 
    ? Math.round(postsArray.reduce((acc, p) => acc + (p.moderationResult?.confidence ?? 0.85), 0) / postsArray.length * 100)
    : 0;

  const paginatedPosts = postsArray.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(postsArray.length / pageSize) || 1;

  const isRefreshing = isPostsLoading || isAnalyticsLoading;

  return (
    <div className="p-8 w-full max-w-[1600px] mx-auto space-y-8 flex flex-col pb-12">
      {/* Page Header */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Moderation Queue</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Review flagged content across the platform with AI-assisted insights.</p>
        </div>
        <div className="flex gap-4">
          {selected.size > 0 ? (
            <>
              <button onClick={() => bulk('APPROVE')} className="px-6 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm">Approve ({selected.size})</button>
              <button onClick={() => bulk('REJECT')} className="px-6 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-rose-100 transition-all border border-rose-100 shadow-sm">Reject ({selected.size})</button>
            </>
          ) : (
            <>
              <button className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                <span className="material-symbols-outlined text-[18px]">filter_list</span>
                Filter
              </button>
              <button 
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:opacity-90 transition-all" 
                onClick={() => {
                  qc.invalidateQueries({ queryKey: ['posts', communityId] });
                  qc.invalidateQueries({ queryKey: ['analytics', communityId] });
                }}
              >
                <span className={`material-symbols-outlined text-[18px] ${isRefreshing ? 'animate-spin' : ''}`}>refresh</span>
                Refresh Queue
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 shrink-0">
        <QueueStat label="Pending Items" value={isRefreshing ? ".." : (analytics?.stats?.flagged ?? 0)} colorClass="text-slate-900" icon="pending_actions" />
        <QueueStat label="High Risk" value={isRefreshing ? ".." : highRiskCount} colorClass="text-rose-600" icon="emergency_home" />
        <QueueStat label="Avg. Confidence" value={isRefreshing ? ".." : `${avgConfidence}%`} colorClass="text-blue-600" icon="psychology" />
        <QueueStat label="Total Reviewed" value={isRefreshing ? ".." : (analytics?.completedPosts ?? 0)} colorClass="text-emerald-600" icon="verified" />
      </div>

      {/* Queue Table Section - Full Page Scroll */}
      <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm flex flex-col overflow-hidden">
        <div className="overflow-x-visible px-2">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white border-b border-slate-100">
              <tr className="bg-slate-50/30 text-slate-900 uppercase text-[11px] font-bold tracking-[0.2em]">
                <th className="py-5 px-8 w-12">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.checked && posts) setSelected(new Set(posts.map((p) => p.id)));
                      else setSelected(new Set());
                    }}
                  />
                </th>
                <th className="py-5 px-8 whitespace-nowrap">Author Identity</th>
                <th className="py-5 px-8 w-[40%] text-center">Content Insight</th>
                <th className="py-5 px-8 text-center">AI Safety Score</th>
                <th className="py-5 px-8 text-center">Action Reasoning</th>
                <th className="py-5 px-8 text-right whitespace-nowrap">Moderator Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isPostsLoading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-6 px-8"><div className="w-4 h-4 bg-slate-100 rounded" /></td>
                    <td className="py-6 px-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100" />
                        <div className="space-y-2">
                          <div className="h-3 w-24 bg-slate-100 rounded" />
                          <div className="h-2 w-12 bg-slate-50 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-8"><div className="h-3 w-48 bg-slate-50 rounded" /></td>
                    <td className="py-6 px-8"><div className="h-5 w-16 bg-slate-50 rounded-lg" /></td>
                    <td className="py-6 px-8"><div className="h-4 w-20 bg-slate-50 rounded" /></td>
                    <td className="py-6 px-8 text-right"><div className="h-8 w-24 bg-slate-50 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : null}
              {(paginatedPosts).map((p) => (
                <QueueItemRow
                  key={p.id}
                  p={p}
                  isSelected={selected.has(p.id)}
                  onSelect={(val: boolean) => {
                    const n = new Set(selected);
                    if (val) n.add(p.id);
                    else n.delete(p.id);
                    setSelected(n);
                  }}
                  onAction={(action: any) => {
                    console.log('[Debug] Button Clicked:', action, 'for', p.id);
                    act.mutate({ postId: p.id, action });
                  }}
                  onNavigate={(id: string) => navigate(`/c/${communityId}/posts/${id}`)}
                />
              ))}
              {posts?.length === 0 && !isPostsLoading && (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-4xl text-slate-200">done_all</span>
                        <p className="text-slate-400 font-medium">All clear! No pending items in the queue.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center shrink-0">
          <p className="text-xs font-semibold text-slate-500">Showing <span className="text-slate-900">{(page - 1) * pageSize + 1}-{Math.min(page * pageSize, posts?.length || 0)}</span> of <span className="text-slate-900">{posts?.length || 0}</span> critical items</p>
          <div className="flex gap-2">
            <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1}
                className={`p-2 rounded-lg border border-slate-200 shadow-sm transition-colors ${page === 1 ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-slate-700 hover:bg-slate-50 bg-white'}`}
            >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-sm">{page}</button>
            <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`p-2 rounded-lg border border-slate-200 shadow-sm transition-colors ${page === totalPages ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-slate-700 hover:bg-slate-50 bg-white'}`}
            >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

function QueueStat({ label, value, colorClass, icon }: any) {
  const getColors = (cls: string) => {
    if (cls === 'text-slate-900') return { bg: 'bg-slate-100', accent: 'bg-slate-600' };
    if (cls.includes('blue')) return { bg: 'bg-blue-50', accent: 'bg-blue-600' };
    if (cls.includes('rose')) return { bg: 'bg-rose-50', accent: 'bg-rose-600' };
    if (cls.includes('emerald')) return { bg: 'bg-emerald-50', accent: 'bg-emerald-600' };
    if (cls.includes('amber')) return { bg: 'bg-amber-50', accent: 'bg-amber-600' };
    return { bg: 'bg-slate-50', accent: 'bg-slate-400' };
  };

  const { bg, accent } = getColors(colorClass);

  return (
    <div className="p-7 bg-white border border-slate-200 rounded-[32px] shadow-sm relative overflow-hidden group hover:scale-[1.03] hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 cursor-default">
      {/* Shiny Effect Overlay */}
      <div className="absolute -inset-x-full inset-y-0 skew-x-[-25deg] bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:animate-[shiny_1.5s_ease-in-out] pointer-events-none z-10"></div>
      
      <div className="flex justify-between items-start relative z-0">
        <div className="space-y-1.5 flex-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
          <p className={`text-3xl font-black ${colorClass} tracking-tighter`}>{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} shadow-inner shrink-0`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>
      
      {/* Bottom accent glow - More Prominent */}
      <div className={`absolute bottom-0 left-0 right-0 h-1.5 ${accent} opacity-20 group-hover:opacity-100 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.1)] group-hover:shadow-[0_-4px_12px_rgba(0,0,0,0.1)]`}></div>
    </div>
  );
}

function QueueItemRow({ p, isSelected, onSelect, onAction, onNavigate }: any) {
  const toxicity = (p.moderationResult?.toxicity ?? 0) * 100;
  const isHighRisk = toxicity > 80;

  return (
    <tr className={`group hover:bg-blue-50/40 hover:shadow-lg hover:shadow-blue-900/5 transition-all duration-300 cursor-pointer border-b border-slate-50/50 last:border-none relative z-0 hover:z-10 ${isHighRisk ? 'bg-rose-50/20' : ''}`} onClick={() => onNavigate(p.id)}>
      <td className="py-6 px-8" onClick={(e) => e.stopPropagation()}>
        <input 
            type="checkbox" 
            checked={isSelected} 
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            onChange={(e) => onSelect(e.target.checked)} 
        />
      </td>
      <td className="py-6 px-8 whitespace-nowrap">
        <div className="flex items-center gap-4">
          {(() => {
              const getEliteAvatar = (n: string, url?: string) => {
                  if (url) return url;
                  const mapping: Record<string, string> = {
                      'Pratham Bisht': 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop',
                      'Admin': 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop',
                      'Member': 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop',
                      'Moderator': 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop',
                      'Pratham-Admin': 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=400&fit=crop'
                  };
                  return mapping[n] || mapping[n.replace('-Admin', '')] || `https://ui-avatars.com/api/?name=${encodeURIComponent(n)}&background=0f172a&color=fff`;
              };
              return <img src={getEliteAvatar(p.author.name, p.author.avatarUrl)} alt={p.author.name} className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-sm" />;
          })()}
          <div>
            <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{p.author.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Trust Index:</span>
                <span className={`text-[10px] font-bold ${p.author.trustScore > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{p.author.trustScore}%</span>
            </div>
          </div>
        </div>
      </td>
      <td className="py-6 px-8 max-w-sm">
        <p className="text-[13px] text-slate-600 leading-relaxed italic line-clamp-1">"{p.text}"</p>
      </td>
      <td className="py-6 px-8 text-center">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-1000 ${toxicity > 70 ? 'bg-rose-500' : toxicity > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${100 - toxicity}%` }}></div>
            </div>
            <span className={`text-[11px] font-black ${toxicity > 70 ? 'text-rose-600' : toxicity > 30 ? 'text-amber-600' : 'text-emerald-600'}`}>{Math.round(100 - toxicity)}%</span>
          </div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">AI Confidence: {Math.round((p.moderationResult?.confidence ?? 0.85) * 100)}%</span>
        </div>
      </td>
      <td className="py-6 px-8 text-center">
        <span className="text-[10px] font-black text-amber-600 px-2.5 py-1.5 bg-amber-50 rounded-lg border border-amber-100 uppercase tracking-tight shadow-sm">
          {p.moderationResult?.recommendation === 'FLAG' ? 'FLAGGED' : (p.moderationResult?.recommendation || 'FLAGGED')}
        </span>
      </td>
      <td className="py-6 px-8 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end gap-3">
          <button className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100 shadow-sm" title="View Context" onClick={() => onNavigate(p.id)}>
            <span className="material-symbols-outlined text-[20px]">visibility</span>
          </button>
          <button className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-transparent hover:border-emerald-100 shadow-sm" title="Approve Entry" onClick={() => onAction('APPROVE')}>
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
          </button>
          <button className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100 shadow-sm" title="Remove Entry" onClick={() => onAction('REJECT')}>
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
}
