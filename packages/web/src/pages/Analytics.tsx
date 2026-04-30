import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  AreaChart,
  Area,
  XAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export function AnalyticsPage() {
  const { communityId = '' } = useParams();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', communityId],
    queryFn: async () => {
      const { data } = await api.get(`/communities/${communityId}/analytics?range=7d`);
      return data as any;
    },
    enabled: !!communityId,
  });

  const trendData = analytics?.activityTrends || [
    { day: '...', ai: 0, manual: 0 },
  ];

  const fpr = analytics?.moderationAccuracy?.falsePositiveRate ?? 0;
  const precision = (1 - fpr) * 100;

  const accuracyData = [
    { name: 'True Positives', value: precision, color: '#4f46e5' },
    { name: 'False Positives', value: fpr * 100, color: '#f43f5e' },
  ];

  const totalActions = analytics?.totalPosts ?? 0;
  const manualAudits = analytics?.completedPosts ?? 0;
  const sentiment = analytics?.avgTrustScore > 80 ? 'Exceptional' : analytics?.avgTrustScore > 60 ? 'Stable' : 'Volatile';

  const handleExport = () => {
    window.print();
  };

  return (
    <div className="p-6 w-full max-w-[1600px] mx-auto space-y-6 print:p-0">
      {/* Print-only CSS */}
      <style>
        {`
          @media print {
            body { background: white !important; }
            .print\\:hidden { display: none !important; }
            aside, nav, header, .sidebar, .topbar { display: none !important; }
            main { margin: 0 !important; padding: 0 !important; width: 100% !important; }
            .ml-60 { margin-left: 0 !important; }
            .shadow-sm, .shadow-lg { shadow: none !important; border: 1px solid #eee !important; }
            .rounded-[32px] { border-radius: 12px !important; }
            button { display: none !important; }
          }
        `}
      </style>

      {/* Header */}
      <div className="flex justify-between items-center mb-8 print:mb-12">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-outfit">Analytics Overview</h2>
          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest font-inter">
            Real-time performance metrics and content integrity data.
          </p>
        </div>
        <div className="flex items-center gap-4 ml-auto print:hidden">
            <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm font-inter">
                <button className="px-5 py-2 text-[11px] font-bold text-blue-600 bg-blue-50 border-r border-slate-200">Last 7 Days</button>
                <button className="px-5 py-2 text-[11px] font-bold text-slate-500 hover:bg-slate-50 border-r border-slate-200 transition-colors">Last 30 Days</button>
                <button className="px-5 py-2 text-[11px] font-bold text-slate-500 hover:bg-slate-50 transition-colors">Custom Range</button>
            </div>
            <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-[11px] font-bold shadow-lg shadow-blue-600/20 hover:opacity-90 transition-all font-inter"
            >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export PDF
            </button>
        </div>
      </div>

      {/* Main Analysis Block: Trends (Left) & Stats (Vertical Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Activity Trends Card */}
        <div className="lg:col-span-3 p-6 bg-white border border-slate-200 rounded-[32px] shadow-sm flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div>
                <h3 className="font-bold text-slate-900 text-lg font-outfit">Activity Trends</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 font-inter">AI vs Manual Enforcement Volume</p>
            </div>
            <div className="flex gap-4 font-inter">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    AI Actions
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                    <div className="w-2 h-2 border-2 border-dashed border-slate-400 rounded-full"></div>
                    Manual
                </div>
            </div>
          </div>
          
          <div className="flex-1 w-full">
            {isLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                    <span className="text-2xl font-black text-slate-200 animate-pulse">..</span>
                </div>
            ) : (
                <ResponsiveContainer>
                <AreaChart data={trendData}>
                    <defs>
                    <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                    </defs>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} dy={10} />
                    <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Area type="monotone" dataKey="ai" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorAi)" />
                    <Area type="monotone" dataKey="manual" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" fill="transparent" />
                </AreaChart>
                </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Vertical Stats Stack */}
        <div className="lg:col-span-1 flex flex-col gap-4">
            <StatCard icon="auto_awesome" label="AI ACTIONS" value={isLoading ? ".." : totalActions.toLocaleString()} colorClass="text-blue-600" />
            <StatCard icon="sentiment_satisfied" label="COMMUNITY SENTIMENT" value={isLoading ? ".." : sentiment} colorClass="text-emerald-600" />
            <StatCard icon="warning" label="FALSE POSITIVE RATE" value={isLoading ? ".." : `${(fpr * 100).toFixed(1)}%`} colorClass="text-rose-600" />
            <StatCard icon="person_search" label="MANUAL AUDITS" value={isLoading ? ".." : manualAudits.toLocaleString()} colorClass="text-slate-900" />
        </div>
      </div>

      {/* Secondary Row: Accuracy & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accuracy Breakdown Card */}
        <div className="p-8 bg-white border border-slate-200 rounded-[32px] shadow-sm flex flex-col">
            <h3 className="font-bold text-slate-900 text-lg mb-8 font-outfit">Accuracy Breakdown</h3>
            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[280px]">
                {isLoading ? (
                    <div className="text-xl font-black text-slate-100 animate-pulse">..</div>
                ) : (
                    <>
                    <div className="h-full w-full">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={accuracyData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    startAngle={90}
                                    endAngle={450}
                                >
                                    {accuracyData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none font-outfit">
                        <p className="text-4xl font-black text-slate-900">{precision.toFixed(1)}%</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Precision</p>
                    </div>
                    </>
                )}
            </div>

            <div className="mt-6 space-y-3 font-inter">
                <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-500 uppercase tracking-widest">True Positives</span>
                    <span className="text-blue-600 font-black">{isLoading ? ".." : `${precision.toFixed(1)}%`}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-500 uppercase tracking-widest">False Positives</span>
                    <span className="text-rose-500 font-black">{isLoading ? ".." : `${(fpr * 100).toFixed(1)}%`}</span>
                </div>
            </div>
        </div>

        {/* Flagged Keywords List */}
        <div className="p-8 bg-white border border-slate-200 rounded-[32px] shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <h3 className="font-bold text-slate-900 text-lg font-outfit">Top Flagged Keywords</h3>
                <button className="text-slate-400 hover:text-slate-600">
                    <span className="material-symbols-outlined">more_vert</span>
                </button>
            </div>
            <div className="space-y-6 flex-1 font-inter">
                <KeywordRow label="suspicious_link_pattern" count="12" progress={90} index="01" />
                <KeywordRow label="aggr_profanity_v2" count="8" progress={65} index="02" />
                <KeywordRow label="spam_bot_signature" count="5" progress={45} index="03" />
                <KeywordRow label="hate_speech_ref_09" count="2" progress={25} index="04" />
            </div>
            <button className="w-full mt-8 text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-widest font-inter">Full Report</button>
        </div>

        {/* Violators Table */}
        <div className="p-8 bg-white border border-slate-200 rounded-[32px] shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-900 text-lg font-outfit">Frequent Violators</h3>
                <button className="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-all">
                    <span className="material-symbols-outlined text-[18px]">filter_list</span>
                </button>
            </div>
            <div className="overflow-hidden flex-1 font-inter">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                            <th className="py-3">ENTITY</th>
                            <th className="py-3">FLAGS</th>
                            <th className="py-3">SCORE</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        <ViolatorRow user="Member" flags="2" score={20} index="U1" />
                        <ViolatorRow user="Member" flags="1" score={45} index="U2" />
                        <ViolatorRow user="Member" flags="1" score={15} index="U3" />
                    </tbody>
                </table>
            </div>
            <button className="mt-6 w-full py-2.5 bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-500 rounded-xl hover:bg-slate-100 transition-all uppercase tracking-widest font-inter">
                View All Violators
            </button>
        </div>
      </div>
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
    <div className="p-4 bg-white border border-slate-200 rounded-[24px] shadow-sm relative overflow-hidden group hover:scale-[1.03] hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 cursor-default flex-1 flex flex-col justify-center">
      {/* Shiny Effect Overlay */}
      <div className="absolute -inset-x-full inset-y-0 skew-x-[-25deg] bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:animate-[shiny_1.5s_ease-in-out] pointer-events-none z-10"></div>
      
      <div className="flex justify-between items-start relative z-0">
        <div className="space-y-1.5 flex-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-inter">{label}</p>
          <p className={`text-2xl font-black ${colorClass} tracking-tighter font-outfit`}>{value}</p>
        </div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg} shadow-inner shrink-0`}>
          <span className="material-symbols-outlined text-base">{icon}</span>
        </div>
      </div>
      
      {/* Bottom accent glow - More Prominent */}
      <div className={`absolute bottom-0 left-0 right-0 h-1.5 ${accent} opacity-20 group-hover:opacity-100 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.1)] group-hover:shadow-[0_-4px_12px_rgba(0,0,0,0.1)]`}></div>
    </div>
  );
}

function KeywordRow({ label, count, progress, index }: any) {
    return (
        <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-slate-300">{index}</span>
            <div className="flex-1 space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-slate-700">{label}</span>
                    <span className="text-blue-600">{count}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        </div>
    );
}

function ViolatorRow({ user, flags, score, index }: any) {
    return (
        <tr className="group hover:bg-slate-50 transition-colors">
            <td className="py-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 text-slate-400 rounded-lg flex items-center justify-center font-bold text-[10px]">
                        {index}
                    </div>
                    <p className="text-[11px] font-bold text-slate-900">{user}</p>
                </div>
            </td>
            <td className="py-3 text-[11px] font-bold text-rose-500">{flags}</td>
            <td className="py-3">
                <div className="flex items-center gap-2">
                    <div className="h-1 w-12 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500" style={{ width: `${score}%` }}></div>
                    </div>
                </div>
            </td>
        </tr>
    );
}
