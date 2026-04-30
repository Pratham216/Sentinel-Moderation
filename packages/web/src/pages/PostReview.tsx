import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

export function PostReviewPage() {
  const { communityId = '', postId = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      const { data } = await api.get(`/posts/${postId}`);
      return data;
    },
    enabled: !!postId,
  });

  const action = useMutation({
    mutationFn: async (a: 'APPROVE' | 'REJECT' | 'FLAG') => {
      await api.post(`/posts/${postId}/actions`, { action: a });
    },
    onMutate: async (a: 'APPROVE' | 'REJECT' | 'FLAG') => {
      // 1. Show beautiful toast immediately
      if (a === 'APPROVE') {
        toast.success('Post Approved Successfully', {
          description: `Post #${postId.slice(0,8).toUpperCase()} has been processed.`,
        });
      } else {
        toast.error('Post Rejected and Removed', {
          description: `Post #${postId.slice(0,8).toUpperCase()} has been removed from the platform.`,
          style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }
        });
      }

      // 2. Navigate back to queue INSTANTLY
      navigate(`/c/${communityId}/queue`);

      // 3. Optimistically update local post state (in case user clicks back)
      await qc.cancelQueries({ queryKey: ['post', postId] });
      const previousPost = qc.getQueryData(['post', postId]);
      qc.setQueryData(['post', postId], (old: any) => {
          if (!old) return old;
          return { ...old, post: { ...old.post, status: a === 'APPROVE' ? 'APPROVED' : 'REJECTED' } };
      });

      // 4. Optimistically remove from FLAGGED queue
      await qc.cancelQueries({ queryKey: ['posts', communityId, 'FLAGGED'] });
      qc.setQueryData(['posts', communityId, 'FLAGGED'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.filter((p: any) => p.id !== postId);
      });

      // 5. If approved, add to feed
      if (a === 'APPROVE') {
        await qc.cancelQueries({ queryKey: ['posts', communityId, 'feed'] });
        qc.setQueryData(['posts', communityId, 'feed'], (old: any) => {
          const currentFeed = Array.isArray(old) ? old : [];
          const postData = (previousPost as any)?.post;
          if (!postData) return old;
          return [{ ...postData, status: 'APPROVED' }, ...currentFeed];
        });
      }

      return { previousPost };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts', communityId] });
    },
  });

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get<{ user: { id: string; name: string; avatarUrl?: string } }>('/auth/me');
      return data.user;
    }
  });

  const getEliteAvatar = (name: string, avatarUrl?: string) => {
    if (avatarUrl) return avatarUrl;
    const mapping: Record<string, string> = {
        'Pratham Bisht': 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop',
        'Admin': 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop',
        'Member': 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop',
        'Moderator': 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop',
        'Pratham-Admin': 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=400&fit=crop'
    };
    return mapping[name] || mapping[name?.replace('-Admin', '')] || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0f172a&color=fff`;
  };

  const p = data?.post;
  const authorAvatar = getEliteAvatar(p?.author?.name, p?.author?.avatarUrl);
  const adminAvatar = getEliteAvatar(me?.name || 'Admin', me?.avatarUrl);

  const mr = p?.moderationResult;
  const toxicity = mr?.toxicity ? mr.toxicity * 100 : 0;
  const safetyScore = Math.round(100 - toxicity);
  const confidence = Math.round((mr?.confidence || 0.85) * 100);
  
  if (!p) return (
    <div className="w-full flex flex-col items-center justify-center min-h-[80vh]">
        <div className="relative flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full border-[4px] border-blue-100/50"></div>
            <div className="w-16 h-16 rounded-full border-[4px] border-blue-600 border-t-transparent animate-spin absolute top-0 left-0"></div>
            <span className="material-symbols-outlined absolute text-blue-600 text-2xl opacity-80">bubble_chart</span>
        </div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] font-inter animate-pulse">Loading post data...</p>
    </div>
  );

  return (
    <div className="w-full flex flex-col relative bg-slate-50/50 font-inter min-h-screen">
      {/* Top Bar inside the view */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white shrink-0 z-10 sticky top-0">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-xl transition-all">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight font-outfit">Post #{postId.slice(0,8).toUpperCase()}</h1>
            {toxicity > 80 && (
              <span className="px-2.5 py-1 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-md border border-rose-100">Urgent Review</span>
            )}
            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-md border ${p.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : p.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                {p.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
                <input type="text" placeholder="Search moderation history..." className="pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-semibold w-[300px] outline-none focus:ring-2 focus:ring-blue-600/20 placeholder:text-slate-400 transition-all" />
            </div>
            <button className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-xl transition-all">
                <span className="material-symbols-outlined">notifications_active</span>
            </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 pb-28">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-5 xl:grid-cols-4 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-3 xl:col-span-3 space-y-6">
                {/* Post Content Box */}
                <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start mb-8">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-full bg-slate-900 overflow-hidden flex items-center justify-center shadow-lg border border-slate-100">
                                <img src={authorAvatar} alt={p.author.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <h3 className="text-base font-bold text-slate-900">{p.author.name}</h3>
                                    <span className="text-xs font-medium text-slate-400">@{p.author.name.toLowerCase().replace(' ', '_')}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-1.5 text-[11px] font-semibold text-slate-500">
                                    <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100/50">
                                        <span className="material-symbols-outlined text-[14px]">verified</span>
                                        {p.author.trustScore > 80 ? 'Trusted Member' : 'Community Member'}
                                    </span>
                                    <span className="text-slate-300">•</span>
                                    <span>Joined {format(new Date(p.author.createdAt || Date.now()), 'MMM yyyy')}</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Trust Score</p>
                            <div className="flex items-center gap-3">
                                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full ${p.author.trustScore > 50 ? 'bg-emerald-500' : 'bg-rose-600'}`} style={{ width: `${p.author.trustScore}%` }}></div>
                                </div>
                                <span className="text-sm font-black text-slate-900">{p.author.trustScore}/100</span>
                            </div>
                        </div>
                    </div>

                    <p className="text-xl font-bold text-slate-900 leading-[1.6] mb-8">
                        {p.text}
                    </p>

                    {(p.mediaUrls?.length ?? 0) > 0 && (
                        <div className="rounded-2xl overflow-hidden mb-8 border border-slate-100 shadow-sm">
                            {p.mediaUrls.map((u: string) => (
                                <img key={u} src={u} alt="Post media" className="w-full h-auto object-cover max-h-[450px]" />
                            ))}
                        </div>
                    )}
                    {!p.mediaUrls?.length && (
                        <div className="rounded-2xl overflow-hidden mb-8 bg-slate-50 flex items-center justify-center h-[300px] border border-slate-100 border-dashed">
                            <div className="text-slate-400 flex flex-col items-center gap-3">
                            <span className="material-symbols-outlined text-5xl opacity-50">image</span>
                            <span className="text-xs font-bold uppercase tracking-widest opacity-60">Text-only Post</span>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-8 border-t border-slate-50 text-[13px] font-semibold text-slate-400">
                        <div className="flex gap-8">
                            <div className="flex items-center gap-2.5 hover:text-blue-600 cursor-pointer transition-colors"><span className="material-symbols-outlined text-[20px]">favorite</span> {p._count?.likes || 0}</div>
                            <div className="flex items-center gap-2.5 hover:text-blue-600 cursor-pointer transition-colors"><span className="material-symbols-outlined text-[20px]">chat_bubble</span> {p._count?.comments || 0}</div>
                            <div className="flex items-center gap-2.5 hover:text-blue-600 cursor-pointer transition-colors"><span className="material-symbols-outlined text-[20px]">bookmark</span> {p._count?.savedBy || 0}</div>
                        </div>
                        <p>Posted {formatDistanceToNow(new Date(p.createdAt))} ago</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col h-full">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2.5 mb-8">
                            <span className="material-symbols-outlined text-blue-600 bg-blue-50 p-1.5 rounded-lg">history</span>
                            Moderation Timeline
                        </h3>
                        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[2px] before:bg-slate-100 flex-1">
                            <div className="relative flex items-start gap-5">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border-2 border-emerald-500 shrink-0 z-10 ml-0 md:ml-[calc(50%-16px)] shadow-sm">
                                    <span className="material-symbols-outlined text-[16px] text-emerald-500">check</span>
                                </div>
                                <div className="flex-1 mt-1">
                                    <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">{format(new Date(p.createdAt), 'HH:mm aa')}</p>
                                    <p className="text-[13px] font-bold text-slate-900">Post Submitted</p>
                                    <p className="text-[11px] font-medium text-slate-500 mt-1">Origin IP detected: Residential</p>
                                </div>
                            </div>
                            {mr && (
                                <div className="relative flex items-start gap-5">
                                    <div className={`w-8 h-8 rounded-full bg-white flex items-center justify-center border-2 ${mr.recommendation === 'REJECT' ? 'border-rose-500' : mr.recommendation === 'FLAG' ? 'border-amber-500' : 'border-blue-500'} shrink-0 z-10 ml-0 md:ml-[calc(50%-16px)] shadow-sm`}>
                                        <span className="material-symbols-outlined text-[16px]">{mr.recommendation === 'REJECT' ? 'error' : mr.recommendation === 'FLAG' ? 'flag' : 'psychology'}</span>
                                    </div>
                                    <div className="flex-1 mt-1">
                                        <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">{format(new Date(mr.createdAt), 'HH:mm aa')}</p>
                                        <p className="text-[13px] font-bold text-slate-900">AI Analysis Complete</p>
                                        <p className="text-[11px] font-medium text-slate-500 mt-1">Decision: {mr.recommendation} ({confidence}% Confidence)</p>
                                    </div>
                                </div>
                            )}
                            {p.actions?.map((a: any) => (
                                <div key={a.id} className="relative flex items-start gap-5">
                                    <div className={`w-8 h-8 rounded-full bg-white flex items-center justify-center border-2 ${a.action === 'REJECT' ? 'border-rose-600' : 'border-emerald-600'} shrink-0 z-10 ml-0 md:ml-[calc(50%-16px)] shadow-sm`}>
                                        <span className="material-symbols-outlined text-[16px]">{a.action === 'REJECT' ? 'gavel' : 'verified'}</span>
                                    </div>
                                    <div className="flex-1 mt-1">
                                        <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">{format(new Date(a.createdAt), 'HH:mm aa')}</p>
                                        <p className="text-[13px] font-bold text-slate-900">Moderator Action: {a.action}</p>
                                        <p className="text-[11px] font-medium text-slate-500 mt-1">By {a.moderator.name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col h-full">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2.5 mb-8">
                            <span className="material-symbols-outlined text-blue-600 bg-blue-50 p-1.5 rounded-lg">psychology</span>
                            Contextual Analysis
                        </h3>
                        <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-100 flex-1 relative">
                            <span className="material-symbols-outlined absolute top-4 left-4 text-slate-200 text-4xl -z-10">format_quote</span>
                            <p className="text-[13px] text-slate-600 italic leading-[1.8] font-medium">
                                {mr?.reasoning || "The AI is processing the semantic layers of this post. Currently analyzing for nuanced violations or community guideline alignment."}
                            </p>
                        </div>
                        <div className="mt-6 flex items-center gap-2 text-[11px] font-bold text-blue-600 bg-blue-50/50 w-fit px-3 py-1.5 rounded-lg border border-blue-100/50">
                            <span className="material-symbols-outlined text-[14px]">info</span>
                            AI Confidence: {confidence}%
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-2 xl:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-8 text-base">Safety Breakdown</h3>
                    <div className="space-y-6">
                        <ProgressBar label="Safety Score" value={safetyScore} colorClass={safetyScore > 70 ? 'bg-emerald-500' : safetyScore > 30 ? 'bg-amber-500' : 'bg-rose-500'} textClass={safetyScore > 70 ? 'text-emerald-600' : safetyScore > 30 ? 'text-amber-600' : 'text-rose-600'} />
                        <ProgressBar label="AI Confidence" value={confidence} colorClass="bg-blue-600" textClass="text-blue-600" />
                        <ProgressBar label="Community Trust" value={p.author.trustScore} colorClass={p.author.trustScore > 70 ? 'bg-emerald-500' : 'bg-amber-500'} textClass={p.author.trustScore > 70 ? 'text-emerald-600' : 'text-amber-600'} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-8 text-base">Engagement Stats</h3>
                    <div className="space-y-5">
                        <div className="flex justify-between items-center p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                            <span className="text-xs font-bold text-slate-500">Likes</span>
                            <span className="text-sm font-black text-slate-900">{p._count?.likes || 0}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                            <span className="text-xs font-bold text-slate-500">Comments</span>
                            <span className="text-sm font-black text-slate-900">{p._count?.comments || 0}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                            <span className="text-xs font-bold text-slate-500">Saved By</span>
                            <span className="text-sm font-black text-slate-900">{p._count?.savedBy || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-6 w-full max-w-[1000px] left-[50%] -translate-x-[40%] z-50 px-6 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] p-4 rounded-2xl flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-4 px-2">
                  <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white shadow-lg overflow-hidden border border-slate-100">
                      <img src={adminAvatar} alt="Admin" className="w-full h-full object-cover" />
                  </div>
                  <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-0.5">Currently reviewing as</p>
                      <p className="text-xs font-bold text-slate-900">{me?.name || 'Administrator Console'}</p>
                  </div>
              </div>
              
              <div className="flex items-center gap-3">
                  <button className="px-6 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all" onClick={() => navigate(-1)}>
                      Skip Review
                  </button>
                  <button className="px-6 py-2.5 bg-white border border-blue-100 text-blue-600 text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 hover:bg-blue-50 hover:border-blue-200 transition-all" onClick={() => action.mutate('APPROVE')}>
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Approve Post
                  </button>
                  <button className="px-6 py-2.5 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-[0_8px_20px_-8px_rgba(225,29,72,0.5)] flex items-center gap-2 hover:bg-rose-700 transition-all" onClick={() => action.mutate('REJECT')}>
                      <span className="material-symbols-outlined text-[16px]">cancel</span>
                      Reject Post
                  </button>
                  <div className="w-px h-8 bg-slate-200 mx-2"></div>
                  <div className="text-center px-2">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Queue Status</p>
                      <p className="text-[13px] font-black text-blue-600 tracking-tight">ACTIVE</p>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}

function ProgressBar({ label, value, colorClass, textClass }: any) {
    return (
        <div>
            <div className="flex justify-between items-center text-[11px] font-bold mb-2.5">
                <span className="text-slate-600">{label}</span>
                <span className={textClass}>{value}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${colorClass} transition-all duration-1000`} style={{ width: `${value}%` }}></div>
            </div>
        </div>
    );
}
