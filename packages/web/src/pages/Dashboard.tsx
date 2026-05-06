import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCommunitySocket } from '@/hooks/useCommunitySocket';

export function DashboardPage() {
  const { communityId = '' } = useParams();
  const navigate = useNavigate();
  useCommunitySocket(communityId);

  // Redirect normal users to Feed
  const { data: communities } = useQuery({
    queryKey: ['communities'],
    queryFn: async () => {
      const { data } = await api.get<{ communities: { id: string; role: string }[] }>('/communities');
      return data.communities;
    },
  });

  const currentRole = communities?.find(c => c.id === communityId)?.role;
  
  useEffect(() => {
    if (currentRole && currentRole !== 'ADMIN' && currentRole !== 'MODERATOR') {
      navigate(`/c/${communityId}/feed`, { replace: true });
    }
  }, [currentRole, communityId, navigate]);

  if (currentRole && currentRole !== 'ADMIN' && currentRole !== 'MODERATOR') {
    return null;
  }

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,Metric,Value\nTotal Posts,1.2M\nFlagged Content,14203\nRemoved Content,2841\nAvg Trust Score,94.2";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Sentinel_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [range, setRange] = useState('7d');

  const { data: analytics, isLoading: isAnalyticsLoading, isFetching } = useQuery({
    queryKey: ['analytics', communityId, range],
    queryFn: async () => {
      const { data } = await api.get(`/communities/${communityId}/analytics?range=${range}`);
      return data as {
        totalPosts: number;
        completedPosts: number;
        decisions: Record<string, number>;
        volumeByDay: { day: string; count: number }[];
        toxicityTrend: { day: string; avgToxicity: number }[];
        avgResponseTimeMs: number;
        stats: {
          total: number;
          approved: number;
          rejected: number;
          pending: number;
          flagged: number;
        };
        avgTrustScore?: number;
      };
    },
    enabled: !!communityId,
  });

  const { data: spotlightItems, isLoading: isPendingLoading } = useQuery({
    queryKey: ['posts', communityId, 'FLAGGED-spotlight'],
    queryFn: async () => {
      const { data } = await api.get(
        `/communities/${communityId}/posts?status=FLAGGED&limit=2`
      );
      return data.posts as any[];
    },
    enabled: !!communityId,
    refetchInterval: 30000,
  });

  const { data: recentActivity, isLoading: isActivityLoading } = useQuery({
    queryKey: ['posts', communityId, 'activity'],
    queryFn: async () => {
      // Fetch the 5 most recently reviewed posts (APPROVED or REJECTED)
      const [approved, rejected] = await Promise.all([
        api.get(`/communities/${communityId}/posts?status=APPROVED&limit=5`),
        api.get(`/communities/${communityId}/posts?status=REJECTED&limit=5`),
      ]);
      const combined = [
        ...(approved.data.posts as any[]),
        ...(rejected.data.posts as any[]),
      ];
      // Sort by most recently updated and take top 5
      return combined
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
    },
    enabled: !!communityId,
    refetchInterval: 30000, // auto-refresh every 30s
  });

  const isLoading = isAnalyticsLoading || isPendingLoading || isActivityLoading;

  const totalPostsCount = analytics?.stats?.total ?? 0;
  const flaggedCount = analytics?.stats?.flagged ?? 0;
  const removedCount = analytics?.stats?.rejected ?? 0;

  return (
    <div className="p-8 w-full max-w-[1600px] mx-auto space-y-8 flex flex-col min-h-screen">
      {/* Page Header */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-outfit">System Overview</h2>
          <p className="text-sm text-slate-500 mt-1 font-medium font-inter">Live AI oversight and platform health metrics.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export Report
          </button>
          <button onClick={() => navigate(`/c/${communityId}/rules`, { state: { openNewRule: true } })} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/20 hover:opacity-90 transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Rule
          </button>
        </div>
      </div>

      {/* Bento Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 shrink-0">
        <StatCard
          icon="forum"
          label="Total Posts"
          value={totalPostsCount.toLocaleString()}
          colorClass="text-blue-600"
          isLoading={isLoading}
        />
        <StatCard
          icon="flag"
          label="Flagged Content"
          value={flaggedCount.toLocaleString()}
          colorClass="text-amber-600"
          isLoading={isLoading}
        />
        <StatCard
          icon="delete_sweep"
          label="Removed Content"
          value={removedCount.toLocaleString()}
          colorClass="text-rose-600"
          isLoading={isLoading}
        />
        <StatCard
          icon="verified"
          label="Avg Trust Score"
          value={`${(analytics?.avgTrustScore ?? 0).toFixed(1)}%`}
          colorClass="text-emerald-600"
          isLoading={isLoading}
        />
      </div>

      {/* Main Analysis Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm flex flex-col min-h-[440px]">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-outfit flex items-center gap-3">
                Moderation Activity
                {isFetching && !isLoading && (
                  <span className="flex gap-1">
                    <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce"></span>
                    <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce [animation-delay:0.4s]"></span>
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1 font-inter">Real-time enforcement volume across all channels.</p>
            </div>
            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 shrink-0">
              {['7d', '14d', '21d', '28d'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider ${
                    range === r 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {r.replace('d', '')}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 flex items-end justify-between gap-4 px-2 min-h-0">
            {isLoading ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                    <div className="flex gap-2.5 items-center">
                        <div className="w-3 h-3 rounded-full bg-blue-100 animate-pulse"></div>
                        <div className="w-3 h-3 rounded-full bg-blue-200 animate-pulse delay-75"></div>
                        <div className="w-3 h-3 rounded-full bg-blue-300 animate-pulse delay-150"></div>
                    </div>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest animate-pulse">Synchronizing Graph...</p>
                </div>
            ) : (analytics?.volumeByDay?.length ? analytics.volumeByDay : []).map((v, i) => {
              const maxCount = Math.max(...(analytics?.volumeByDay?.map(d => d.count) || [10]));
              const h = Math.max((v.count / maxCount) * 100, 8);
              const isToday = i === (analytics?.volumeByDay?.length || 1) - 1;
              return (
              <div key={i} className="flex-1 h-full relative group cursor-pointer flex flex-col justify-end">
                {/* Value Bar */}
                <div 
                    className={`w-full rounded-t-2xl transition-all duration-1000 ease-out shadow-sm relative group/bar
                        ${isToday ? 'bg-gradient-to-t from-blue-700 via-blue-600 to-blue-500' : 'bg-blue-100/80 group-hover:bg-blue-200'}
                    `} 
                    style={{ height: `${h}%` }}
                >
                    {isToday && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/40 rounded-full animate-ping"></div>
                    )}
                    
                    {/* Tooltip - Now relative to bar height */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all group-hover:-translate-y-1 whitespace-nowrap pointer-events-none z-10 shadow-xl border border-white/10 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isToday ? 'bg-blue-400' : 'bg-blue-200'}`}></div>
                      {v.count} Contributions
                    </div>
                </div>
              </div>
            )})}
          </div>
          <div className="flex justify-between mt-8 text-[9px] text-slate-400 font-black uppercase tracking-[0.1em] px-2 font-inter">
            {!isLoading && analytics?.volumeByDay?.map((v, i) => {
               const dateObj = new Date(v.day);
               const isToday = i === (analytics?.volumeByDay?.length || 1) - 1;
               const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'short' });
               const dateNum = dateObj.getDate().toString().padStart(2, '0');
               const monthNum = (dateObj.getMonth() + 1).toString().padStart(2, '0');
               
               return (
                <div key={i} className={`flex flex-col items-center gap-0.5 flex-1 ${isToday ? 'text-blue-600' : ''}`}>
                  <span className="font-bold">{dayName}</span>
                  <span className="text-[7px] opacity-60 font-medium">{dateNum}/{monthNum}</span>
                </div>
               );
            })}
          </div>
        </div>

        <div className="bg-white rounded-[32px] border border-slate-200 flex flex-col shadow-sm overflow-hidden min-h-[440px]">
          <div className="p-8 border-b border-slate-100 bg-slate-50/30 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <h3 className="font-bold text-slate-900 font-outfit">Live Activity</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-inter">Real-time</span>
            </div>
          </div>
          <div className="flex-1 p-8 overflow-y-auto space-y-8">
            {isActivityLoading ? (
              [1,2,3].map(i => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2.5">
                    <div className="h-3 bg-slate-100 rounded-md w-3/4" />
                    <div className="h-2 bg-slate-50 rounded-md w-1/3" />
                  </div>
                </div>
              ))
            ) : recentActivity?.slice(0, 3).map((p: any) => {
              const isApproved = p.status === 'APPROVED';
              const isRejected = p.status === 'REJECTED';
              const isFlagged = p.status === 'FLAGGED';

              const icon = isApproved ? 'check_circle' : isRejected ? 'cancel' : isFlagged ? 'flag' : 'pending';
              const color = isApproved ? 'text-emerald-500' : isRejected ? 'text-rose-500' : isFlagged ? 'text-amber-500' : 'text-slate-400';
              const bg = isApproved ? 'bg-emerald-50' : isRejected ? 'bg-rose-50' : isFlagged ? 'bg-amber-50' : 'bg-slate-50';
              const text = isApproved
                ? `by ${p.author?.name || 'Unknown'} passed automated validation.`
                : isRejected
                ? `by ${p.author?.name || 'Unknown'} was removed by AI.`
                : isFlagged
                ? `by ${p.author?.name || 'Unknown'} flagged for review.`
                : `by ${p.author?.name || 'Unknown'} awaiting review.`;

              const tag = isApproved ? 'APPROVE' : isRejected ? 'REJECT' : isFlagged ? 'FLAG' : 'PENDING';
              const tagColor = isApproved ? 'bg-emerald-500' : isRejected ? 'bg-rose-500' : isFlagged ? 'bg-amber-500' : 'bg-slate-400';
              
              // Relative time
              const diff = Date.now() - new Date(p.createdAt).getTime();
              const mins = Math.floor(diff / 60000);
              const hrs = Math.floor(diff / 3600000);
              const timeLabel = mins < 1 ? 'Just now' : mins < 60 ? `${mins}m ago` : hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs/24)}d ago`;
              
              return (
                <ActivityItem 
                  key={p.id}
                  icon={icon}
                  color={color}
                  bg={bg}
                  title={`Post #${p.id.slice(0, 6).toUpperCase()}`}
                  text={text}
                  tag={tag}
                  tagColor={tagColor}
                  time={timeLabel}
                />
              );
            })}
          </div>
          <button onClick={() => navigate(`/c/${communityId}/feed`)} className="w-full py-5 text-xs font-bold text-blue-600 bg-slate-50/50 hover:bg-blue-50 transition-colors uppercase tracking-widest shrink-0 border-t border-slate-100 font-inter">
            View Full Stream
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-10 py-6 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-outfit">Queue Spotlight</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5 font-inter">High-priority items requiring immediate attention.</p>
          </div>
          <button onClick={() => navigate(`/c/${communityId}/queue`)} className="px-5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 transition-all uppercase tracking-widest font-inter">Full Queue</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/20 text-slate-400 uppercase text-[10px] font-bold tracking-[0.15em] border-b border-slate-100">
                <th className="px-10 py-5">Source</th>
                <th className="px-10 py-5">Violation Type</th>
                <th className="px-10 py-5">AI Confidence</th>
                <th className="px-10 py-5">Reputation</th>
                <th className="px-10 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isPendingLoading ? (
                [1, 2].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-10 py-4"><div className="h-4 w-24 bg-slate-50 rounded" /></td>
                    <td className="px-10 py-4"><div className="h-4 w-32 bg-slate-50 rounded" /></td>
                    <td className="px-10 py-4"><div className="h-4 w-20 bg-slate-50 rounded" /></td>
                    <td className="px-10 py-4"><div className="h-4 w-20 bg-slate-50 rounded" /></td>
                    <td className="px-10 py-4 text-right"><div className="h-8 w-24 bg-slate-50 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : (spotlightItems || []).map((p: any) => (
                <QueueRow 
                  key={p.id}
                  source={p.author.name}
                  id={p.id.slice(0, 8)}
                  type={p.moderationResult?.recommendation || 'MANUAL'}
                  confidence={Math.round((p.moderationResult?.confidence || 0.85) * 100)}
                  reputation={`Rep (${p.author.trustScore})`}
                  repColor={p.author.trustScore > 50 ? 'text-emerald-500' : 'text-rose-500'}
                  typeColor={p.moderationResult?.recommendation === 'REJECT' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}
                  avatarUrl={p.author.avatarUrl}
                  onClick={() => navigate(`/c/${communityId}/posts/${p.id}`)}
                />
              ))}
              {!isPendingLoading && spotlightItems?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-10 py-12 text-center text-slate-400 font-medium font-inter">
                    No critical items in queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, colorClass, icon, isLoading }: any) {
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
          {isLoading ? (
            <p className={`text-3xl font-black ${colorClass} tracking-tighter animate-pulse`}>...</p>
          ) : (
            <p className={`text-3xl font-black ${colorClass} tracking-tighter`}>{value}</p>
          )}
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

function ActivityItem({ icon, color, bg, title, text, tag, tagColor, time }: any) {
  return (
    <div className="flex gap-4 group border-b border-slate-50 pb-4 last:border-0 last:pb-0">
      <div className={`mt-0.5 w-8 h-8 ${bg} rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
        <span className={`material-symbols-outlined ${color} text-[16px]`}>{icon}</span>
      </div>
      <div className="flex-1">
        <p className="text-[13px] text-slate-600 leading-snug font-inter"><span className="font-bold text-slate-900">{title}</span> {text}</p>
        <div className="flex gap-2.5 mt-2">
          <span className={`text-[8px] text-white ${tagColor} px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider`}>{tag}</span>
          <span className="text-[8px] text-slate-400 font-semibold uppercase tracking-widest">{time}</span>
        </div>
      </div>
    </div>
  );
}

function QueueRow({ source, id, type, confidence, reputation, repColor, typeColor, avatarUrl, onClick }: any) {
  const dynamicBarColor = confidence > 80 ? 'bg-emerald-500' : confidence > 40 ? 'bg-amber-500' : 'bg-rose-500';
  const dynamicTextColor = confidence > 80 ? 'text-emerald-500' : confidence > 40 ? 'text-amber-500' : 'text-rose-500';

  const getEliteAvatar = (name: string, url?: string) => {
    if (url) return url;
    const mapping: Record<string, string> = {
        'Pratham Bisht': 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop',
        'Admin': 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop',
        'Member': 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop',
        'Moderator': 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop',
        'Pratham-Admin': 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=400&fit=crop'
    };
    return mapping[name] || mapping[name?.replace('-Admin', '')] || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0f172a&color=fff`;
  };

  const finalAvatar = getEliteAvatar(source, avatarUrl);

  return (
    <tr className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={onClick}>
      <td className="px-10 py-4">
        <div className="flex items-center gap-4">
          <img src={finalAvatar} alt={source} className="h-8 w-8 rounded-lg object-cover shadow-sm border border-white" />
          <div>
            <p className="text-sm font-bold text-slate-900 font-inter">{source}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight font-inter">ID: {id}</p>
          </div>
        </div>
      </td>
      <td className="px-10 py-4">
        <span className={`px-2.5 py-1 rounded-lg ${typeColor} text-[9px] font-bold uppercase tracking-widest border border-current/10`}>{type}</span>
      </td>
      <td className="px-10 py-4">
        <div className="w-full max-w-[100px] bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div className={`${dynamicBarColor} h-full transition-all duration-1000`} style={{ width: `${confidence}%` }}></div>
        </div>
        <span className={`text-[9px] font-bold ${dynamicTextColor} mt-1 block tracking-widest`}>{confidence}% CONFIDENCE</span>
      </td>
      <td className="px-10 py-4">
        <span className={`text-xs font-bold ${repColor}`}>{reputation}</span>
      </td>
      <td className="px-10 py-4 text-right">
        <div className="flex justify-end gap-3 transition-opacity">
          <button className="p-1.5 bg-slate-50 hover:bg-rose-50 text-rose-400 rounded-lg transition-all hover:scale-110 border border-slate-100"><span className="material-symbols-outlined text-[16px]">close</span></button>
          <button className="p-1.5 bg-slate-50 hover:bg-emerald-50 text-emerald-400 rounded-lg transition-all hover:scale-110 border border-slate-100"><span className="material-symbols-outlined text-[16px]">check</span></button>
          <button className="p-1.5 bg-slate-50 hover:bg-blue-50 text-blue-400 rounded-lg transition-all hover:scale-110 border border-slate-100"><span className="material-symbols-outlined text-[16px]">visibility</span></button>
        </div>
      </td>
    </tr>
  );
}
