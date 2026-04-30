import { useParams, useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, useEffect, useRef } from 'react';
import { CreatePostModal } from '@/components/post/CreatePostModal';

export function PostsPage() {
    const { communityId = '' } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [sortBy, setSortBy] = useState('Recent');
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [isSortOpen, setIsSortOpen] = useState(false);
    const sortRef = useRef<HTMLDivElement>(null);

    // Close sort dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
                setIsSortOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const { data: postsData, isLoading: isPostsLoading } = useQuery({
        queryKey: ['posts', communityId, 'all'],
        queryFn: async () => {
            const { data } = await api.get(`/communities/${communityId}/posts?limit=100`);
            return data;
        },
        enabled: !!communityId,
    });

    const { data: _analytics, isLoading: isAnalyticsLoading } = useQuery({
        queryKey: ['analytics', communityId],
        queryFn: async () => {
            const { data } = await api.get(`/communities/${communityId}/analytics?range=30d`);
            return data as any;
        },
        enabled: !!communityId,
    });

    const allPosts = postsData?.posts || [];
    const totalCount = postsData?.totalCount ?? allPosts.length;
    
    // Client-side sorting
    const sortedPosts = [...allPosts].sort((a: any, b: any) => {
        let diff = 0;
        if (sortBy === 'Recent') {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            diff = dateB - dateA;
        } else if (sortBy === 'Engagement') {
            const getEng = (p: any) => (p._count?.likes || 0) + (p._count?.comments || 0) + (p._count?.savedBy || 0);
            diff = getEng(b) - getEng(a);
        } else if (sortBy === 'Score') {
            const statusWeight: Record<string, number> = {
                'APPROVED': 4,
                'PENDING': 3,
                'FLAGGED': 2,
                'REJECTED': 1,
                'REMOVED': 0
            };
            diff = (statusWeight[b.status] || 0) - (statusWeight[a.status] || 0);
        }
        if (diff === 0) return b.id.localeCompare(a.id);
        return diff;
    });

    const paginatedPosts = sortedPosts.slice((page - 1) * pageSize, page * pageSize);
    const totalPages = Math.ceil(sortedPosts.length / pageSize);

    return (
        <div className="p-8 w-full max-w-[1600px] mx-auto space-y-6 flex flex-col pb-12">
            {/* Header */}
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-outfit">Content Management</h2>
                    <p className="text-sm font-medium text-slate-500 mt-1 font-inter">
                        Audit and manage high-engagement community contributions.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">filter_list</span>
                        Filters
                    </button>
                    <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:opacity-90 transition-all">
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Create Post
                    </button>
                </div>
            </div>

            {/* Metrics Bento */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
                <StatCard
                    icon="article"
                    label="Total Posts"
                    value={isPostsLoading || isAnalyticsLoading ? ".." : totalCount.toLocaleString()}
                    colorClass="text-blue-600"
                />
                <StatCard
                    icon="query_stats"
                    label="Engagement Rate"
                    value={isPostsLoading || isAnalyticsLoading ? ".." : "4.8%"}
                    colorClass="text-emerald-600"
                />
                <StatCard
                    icon="shield"
                    label="Safety Score"
                    value={isPostsLoading || isAnalyticsLoading ? ".." : `${(_analytics?.avgTrustScore ?? 0).toFixed(1)}%`}
                    colorClass="text-slate-900"
                />
                <StatCard
                    icon="group"
                    label="Active Users"
                    value={isPostsLoading || isAnalyticsLoading ? ".." : (new Set(allPosts.map((p: any) => p.authorId)).size || 0)}
                    colorClass="text-amber-600"
                />
            </div>

            {/* Main Table Content */}
            <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm flex flex-col overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-white/50 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                        <h3 className="font-bold text-slate-900 font-outfit text-lg tracking-tight">
                            {sortBy} Submissions
                        </h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-inter">Sort by:</span>
                        <div className="relative" ref={sortRef}>
                            <button 
                                onClick={() => setIsSortOpen(!isSortOpen)}
                                className="flex items-center gap-3 px-5 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 transition-all cursor-pointer group"
                            >
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest font-inter">{sortBy}</span>
                                <span className={`material-symbols-outlined text-[18px] text-blue-400 transition-transform duration-300 ${isSortOpen ? 'rotate-180' : ''}`}>expand_more</span>
                            </button>
                            
                            {isSortOpen && (
                                <div className="absolute top-[calc(100%+8px)] right-0 w-48 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    {['Recent', 'Engagement', 'Score'].map((option) => (
                                        <button
                                            key={option}
                                            onClick={() => {
                                                setSortBy(option);
                                                setIsSortOpen(false);
                                                setPage(1);
                                            }}
                                            className={`w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest transition-colors ${sortBy === option ? 'text-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/30 text-[11px] font-bold text-slate-900 uppercase tracking-[0.2em] border-b border-slate-100">
                                <th className="py-5 px-8 whitespace-nowrap">Author Identity</th>
                                <th className="py-5 px-8 w-[45%] text-center">Content Preview</th>
                                <th className="py-5 px-8 text-center">AI Score</th>
                                <th className="py-5 px-8 text-right whitespace-nowrap">Live Status</th>
                                <th className="py-5 px-8 text-right">Total Interactions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isPostsLoading ? (
                                [1, 2, 3, 4, 5].map((i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-5 px-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100" />
                                                <div className="space-y-2">
                                                    <div className="h-3 w-24 bg-slate-100 rounded" />
                                                    <div className="h-2 w-12 bg-slate-50 rounded" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-8">
                                            <div className="h-3 w-64 bg-slate-50 rounded" />
                                        </td>
                                        <td className="py-5 px-8">
                                            <div className="h-5 w-16 bg-slate-50 rounded-lg" />
                                        </td>
                                        <td className="py-5 px-8">
                                            <div className="h-3 w-20 bg-slate-50 rounded" />
                                        </td>
                                        <td className="py-5 px-8"></td>
                                    </tr>
                                ))
                            ) : paginatedPosts.length ? (
                                paginatedPosts.map((post: any, i: number) => {
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

                                    const authorName = post.author?.name || `User ${String.fromCharCode(65 + (i % 26))}`;
                                    const avatarUrl = post.author?.avatarUrl || getEliteAvatar(authorName);
                                    const authorInitial = authorName.split(' ').pop()?.[0] || authorName[0];
                                    return (
                                        <PostTableRow 
                                            key={post.id}
                                            user={authorName} 
                                            role={post.author?.trustScore > 80 ? 'Trusted' : 'Member'} 
                                            avatarUrl={avatarUrl}
                                            text={post.text} 
                                            status={post.status} 
                                            aiScore={post.moderationResult ? Math.round((1 - post.moderationResult.toxicity) * 100) : null}
                                            likes={post._count?.likes || 0}
                                            comments={post._count?.comments || 0} 
                                            saves={post._count?.savedBy || 0}
                                            index={authorInitial} 
                                            onClick={() => navigate(`/c/${communityId}/posts/${post.id}/view`)}
                                        />
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400 font-medium font-inter">
                                        No submissions found in this community.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center shrink-0">
                    <p className="text-xs font-semibold text-slate-500">
                        Showing <span className="text-slate-900">{(page - 1) * pageSize + 1}-{Math.min(page * pageSize, sortedPosts.length)}</span> of <span className="text-slate-900">{sortedPosts.length}</span> contributions
                    </p>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setPage(p => Math.max(1, p - 1))} 
                            disabled={page === 1}
                            className={`p-2 rounded-lg border border-slate-200 shadow-sm transition-colors ${page === 1 ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-slate-700 hover:bg-slate-50 bg-white'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                        </button>
                        <button className="px-4 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-sm">{page}</button>
                        <button 
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || totalPages === 0}
                            className={`p-2 rounded-lg border border-slate-200 shadow-sm transition-colors ${page === totalPages || totalPages === 0 ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-slate-700 hover:bg-slate-50 bg-white'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>

            {isCreateModalOpen && <CreatePostModal onClose={() => setIsCreateModalOpen(false)} communityId={communityId} queryClient={queryClient} />}
        </div>
    );
}


function StatCard({ label, value, colorClass, icon }: any) {
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
        <div className="space-y-1.5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
          <p className={`text-3xl font-black ${colorClass} tracking-tighter`}>{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} shadow-inner`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>
      
      {/* Bottom accent glow - More Prominent */}
      <div className={`absolute bottom-0 left-0 right-0 h-1.5 ${accent} opacity-20 group-hover:opacity-100 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.1)] group-hover:shadow-[0_-4px_12px_rgba(0,0,0,0.1)]`}></div>
    </div>
  );
}

function PostTableRow({ user, role, text, status, aiScore, likes, comments, saves, index, avatarUrl, onClick }: any) {
    const isRemoved = status === 'Removed' || status === 'REJECTED';
    const isReview = status === 'Under Review' || status === 'FLAGGED' || status === 'PENDING';

    return (
        <tr className="group hover:bg-blue-50/40 hover:shadow-lg hover:shadow-blue-900/5 transition-all duration-300 cursor-pointer border-b border-slate-50/50 last:border-none relative z-0 hover:z-10" onClick={onClick}>
            <td className="py-6 px-8 whitespace-nowrap">
                <div className="flex items-center gap-4">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={user} className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-sm group-hover:border-blue-200 transition-all shrink-0" />
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-[13px] font-bold text-white border border-slate-200 shadow-sm group-hover:border-blue-200 transition-all shrink-0">
                            {index}
                        </div>
                    )}
                    <div>
                        <p className="text-sm font-bold text-slate-900 font-inter group-hover:text-blue-600 transition-colors">{user}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-inter mt-0.5">{role}</p>
                    </div>
                </div>
            </td>
            <td className="py-6 px-8">
                <p className="text-[13px] text-slate-600 leading-relaxed font-inter line-clamp-1 italic max-w-lg">
                    "{text}"
                </p>
            </td>
            <td className="py-6 px-8 text-center">
                {aiScore !== null ? (
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full ${aiScore > 75 ? 'bg-emerald-500' : aiScore < 30 ? 'bg-rose-500' : 'bg-amber-500'}`} style={{ width: `${aiScore}%` }}></div>
                            </div>
                            <span className={`text-[10px] font-black ${aiScore > 75 ? 'text-emerald-600' : aiScore < 30 ? 'text-rose-600' : 'text-amber-600'}`}>{aiScore}%</span>
                        </div>
                    </div>
                ) : (
                    <span className="text-[10px] font-bold text-slate-300">N/A</span>
                )}
            </td>
            <td className="py-6 px-8 text-right whitespace-nowrap">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest border ${isRemoved ? 'bg-rose-50 text-rose-500 border-rose-100' : isReview ? 'bg-amber-50 text-amber-500 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm'}`}>
                    {status.toUpperCase()}
                </span>
            </td>
            <td className="py-6 px-8">
                <div className="flex items-center justify-end gap-8 text-[11px] font-black text-slate-500 font-inter">
                    <div className="flex items-center gap-2 hover:text-rose-600 transition-colors">
                        <span className="material-symbols-outlined text-[18px] opacity-70">favorite</span>
                        {likes}
                    </div>
                    <div className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                        <span className="material-symbols-outlined text-[18px] opacity-70">chat_bubble</span>
                        {comments}
                    </div>
                    <div className="flex items-center gap-2 hover:text-amber-600 transition-colors">
                        <span className="material-symbols-outlined text-[18px] opacity-70">bookmark</span>
                        {saves}
                    </div>
                </div>
            </td>
        </tr>
    );
}
