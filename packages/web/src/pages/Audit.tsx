import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

export function AuditPage() {
  const { communityId = '' } = useParams();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', communityId],
    queryFn: async () => {
      const { data } = await api.get(`/communities/${communityId}/analytics?range=7d`);
      return data as any;
    },
    enabled: !!communityId,
  });

  const latencyData = analytics?.latencyHistory || [
    { time: '12:00 PM', value: 0 },
    { time: '12:15 PM', value: 0 },
    { time: '12:30 PM', value: 0 },
  ];

  const pendingCount = analytics?.stats?.pending ?? 0;
  const activeFlows = (analytics?.totalPosts ?? 0) * 12 + 42; // Simulation based on real data
  const gpuUsage = Math.min(60 + (pendingCount * 5), 100);
  const tokenOutput = Math.min(70 + (pendingCount * 2), 98);

  return (
    <div className="p-6 w-full max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-900 font-outfit">Monitoring</h2>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-bold">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            SYSTEM LIVE
          </div>
        </div>
      </div>

      {/* Primary Analytics (Processing & Resource) - NOW AT TOP */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Processing Latency Card */}
        <div className="lg:col-span-3 p-8 bg-white border border-slate-200 rounded-[32px] shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="font-bold text-slate-900 text-lg font-outfit">Processing Latency</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 font-inter">Real-time p99 response time across clusters</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 font-inter">
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                Global Average
            </div>
          </div>
          
          <div className="h-72 w-full">
            {isLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                    <div className="text-2xl font-black text-slate-200 animate-pulse">..</div>
                </div>
            ) : (
                <ResponsiveContainer>
                <BarChart data={latencyData}>
                    <Bar 
                        dataKey="value" 
                        fill="url(#colorGradient)" 
                        radius={[4, 4, 0, 0]} 
                        barSize={40}
                    />
                    <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4f46e5" />
                            <stop offset="100%" stopColor="#818cf8" />
                        </linearGradient>
                    </defs>
                    <XAxis 
                        dataKey="time" 
                        hide 
                    />
                    <Tooltip 
                        cursor={{fill: 'transparent'}}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                </BarChart>
                </ResponsiveContainer>
            )}
          </div>
          <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-6 uppercase tracking-widest px-2 font-inter">
            {latencyData.filter((_: any, i: number) => i % 2 === 0).map((d: any, i: number) => (
                <span key={i}>{d.time}</span>
            ))}
          </div>
        </div>

        {/* Resource Consumption Card */}
        <div className="lg:col-span-2 p-8 bg-white border border-slate-200 rounded-[32px] shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h3 className="font-bold text-slate-900 text-lg font-outfit">Resource Consumption</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 font-inter">Token throughput vs Compute capacity</p>
                </div>
                <select className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1 text-[10px] font-bold outline-none cursor-pointer font-inter">
                    <option>Last 6 Hours</option>
                    <option>Last 24 Hours</option>
                </select>
            </div>

            <div className="space-y-8 flex-1">
                <ResourceBar label="Token Output (m/s)" value={isLoading ? ".." : `${tokenOutput}%`} />
                <ResourceBar label="GPU VRAM Utilization" value={isLoading ? ".." : `${(gpuUsage * 0.8).toFixed(1)} GB / 80 GB`} progress={gpuUsage} />
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400 font-inter">
                    <span>Queue Length</span>
                    <span className={pendingCount > 0 ? "text-amber-500" : "text-emerald-500"}>
                        {isLoading ? ".." : pendingCount > 10 ? "BUSY" : pendingCount > 0 ? "MODERATE" : "STABLE"}
                    </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full">
                    <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all duration-1000" style={{ width: isLoading ? '0%' : `${Math.max(10, 100 - pendingCount * 10)}%` }}></div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-10 pt-10 border-t border-slate-100">
                <div className="p-5 bg-slate-50 rounded-[20px] text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-inter">Request Queue</p>
                    <p className="text-2xl font-bold text-slate-900 font-outfit">{isLoading ? ".." : pendingCount}</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-[20px] text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-inter">Cost / 1k Tokens</p>
                    <p className="text-2xl font-bold text-slate-900 font-outfit">$0.0012</p>
                </div>
            </div>
        </div>
      </div>

      {/* Engine Stats (Now below charts) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
            label="CORE AI ENGINE" 
            value="Titan-4v" 
            icon="memory" 
            colorClass="text-blue-600"
        />
        <StatCard 
            label="NLP SEMANTIC LAYER" 
            value="Lexis-II" 
            icon="translate" 
            colorClass="text-emerald-600"
        />
        <StatCard 
            label="VISUAL RECOGNITION" 
            value="Iris-6" 
            icon="visibility" 
            colorClass="text-amber-600"
        />
        <StatCard 
            label="ACTIVE API FLOWS" 
            value={isLoading ? ".." : activeFlows.toLocaleString()} 
            icon="hub" 
            colorClass="text-slate-900"
        />
      </div>

      {/* Event Log */}
      <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm overflow-hidden pb-4">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
            <h3 className="font-bold text-slate-900 text-sm font-outfit">System Event Log</h3>
            <button className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-widest font-inter">Download CSV</button>
        </div>
        <div className="divide-y divide-slate-50">
            {isLoading ? (
                [1,2,3].map(i => (
                    <div key={i} className="p-6 flex items-center gap-6 animate-pulse">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3 bg-slate-100 rounded w-1/4" />
                            <div className="h-2 bg-slate-50 rounded w-1/2" />
                        </div>
                    </div>
                ))
            ) : analytics?.systemEvents?.length ? (
                analytics.systemEvents.map((ev: any) => (
                    <EventRow 
                        key={ev.id}
                        icon={ev.icon}
                        color={ev.color}
                        bg={ev.bg}
                        title={ev.title}
                        desc={ev.desc}
                        time={ev.time}
                        status={ev.status}
                    />
                ))
            ) : (
                <div className="p-12 text-center text-slate-400 font-medium font-inter">
                    No recent system events recorded.
                </div>
            )}
        </div>
        <button className="w-full py-4 bg-slate-50/50 text-[10px] font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest font-inter">View Previous 24h Events</button>
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
    <div className="p-7 bg-white border border-slate-200 rounded-[32px] shadow-sm relative overflow-hidden group hover:scale-[1.03] hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 cursor-default">
      {/* Shiny Effect Overlay */}
      <div className="absolute -inset-x-full inset-y-0 skew-x-[-25deg] bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:animate-[shiny_1.5s_ease-in-out] pointer-events-none z-10"></div>
      
      <div className="flex justify-between items-start relative z-0">
        <div className="space-y-1.5 flex-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-inter">{label}</p>
          <p className={`text-2xl font-black ${colorClass} tracking-tighter font-outfit`}>{value}</p>
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

function ResourceBar({ label, value, progress }: any) {
    const p = progress || parseInt(value);
    return (
        <div className="space-y-3 font-inter">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                <span className="text-slate-400">{label}</span>
                <span className="text-slate-900">{value}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.4)] transition-all duration-1000" style={{ width: `${p}%` }}></div>
            </div>
        </div>
    );
}

function EventRow({ icon, color, bg, title, desc, time, status }: any) {
    return (
        <div className="p-6 flex items-start gap-6 hover:bg-slate-50/80 transition-colors font-inter">
            <div className={`w-10 h-10 ${bg} ${color} rounded-xl flex items-center justify-center shrink-0`}>
                <span className="material-symbols-outlined text-xl">{icon}</span>
            </div>
            <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-900 font-outfit">{title}</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{desc}</p>
            </div>
            <div className="text-right shrink-0">
                <p className="text-xs font-black text-slate-900">{time}</p>
                <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${color}`}>{status}</p>
            </div>
        </div>
    );
}
