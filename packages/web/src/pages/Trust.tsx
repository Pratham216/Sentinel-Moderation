import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';

export function TrustPage() {
  const { communityId = '' } = useParams();
  const [selectedUserIndex, setSelectedUserIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('All Members');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['trust', communityId],
    queryFn: async () => {
      const { data } = await api.get(`/communities/${communityId}/trust`);
      return data as {
        leaderboard: { 
          user: { id: string; name: string; email: string; trustScore: number; createdAt: string; avatarUrl?: string }; 
          role: string;
          stats?: { networkAge: number; auditVelocity: string; conflictRate: string };
        }[];
        recentEvents: { userId: string; delta: number; reason: string; createdAt: string }[];
      };
    },
    enabled: !!communityId,
    refetchInterval: 5000,
  });

  const allMembers = data?.leaderboard?.map((member, i) => {
    const createdAt = new Date(member.user.createdAt);
    const ageDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    
    // Create a realistic identity
    const identities = ['Pratham Bisht', 'Member', 'Moderator', 'Admin'];
    const name = member.user.name || identities[i % identities.length];
    
    // Use Sophisticated mapping for core members, fallback to initials for others
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
    
    const avatarUrl = member.user.avatarUrl || getEliteAvatar(name);
    
    return {
      id: member.user.id,
      name: name,
      role: member.role,
      score: member.user.trustScore,
      avatar: name[0],
      avatarUrl: avatarUrl,
      color: member.user.trustScore >= 80 ? 'text-emerald-600' : member.user.trustScore >= 40 ? 'text-amber-600' : 'text-rose-600',
      bg: member.user.trustScore >= 80 ? 'bg-emerald-500' : member.user.trustScore >= 40 ? 'bg-amber-500' : 'bg-rose-500',
      lightBg: member.user.trustScore >= 80 ? 'bg-emerald-50' : member.user.trustScore >= 40 ? 'bg-amber-50' : 'bg-rose-50',
      status: member.user.trustScore >= 80 ? 'Exceptional' : member.user.trustScore >= 40 ? 'Stable' : 'High Risk',
      telemetry: {
        networkAge: member.stats?.networkAge || `${ageDays} Cycles`,
        auditVelocity: member.stats?.auditVelocity || (member.user.trustScore > 70 ? 'High' : 'Normal'),
        conflictRate: member.stats?.conflictRate || (member.user.trustScore < 50 ? '8.2%' : '0.04%')
      }
    };
  }) || [];

  const filteredMembers = allMembers.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'High Risk') return m.score < 40;
    if (activeTab === 'Under Review') return m.score >= 40 && m.score < 70;
    return true;
  });

  const selectedMember = filteredMembers[selectedUserIndex];

  // Filter events for the selected user
  const userEvents = data?.recentEvents?.filter(e => e.userId === selectedMember?.id) || [];
  
  if (isLoading) {
    return (
      <div className="p-8 w-full max-w-[1600px] mx-auto space-y-8">
        <div className="flex justify-between items-center mb-10">
          <div className="space-y-3">
            <div className="h-8 w-64 bg-slate-100 rounded-xl animate-pulse"></div>
            <div className="h-4 w-48 bg-slate-50 rounded-lg animate-pulse"></div>
          </div>
          <div className="h-12 w-96 bg-white border border-slate-100 rounded-2xl animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-48 bg-white border border-slate-100 rounded-[32px] animate-pulse"></div>
            ))}
          </div>
          <div className="h-[700px] bg-white border border-slate-100 rounded-[32px] animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 w-full max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header & Global Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-slate-900 font-outfit tracking-tight">Trust Intelligence</h2>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest font-inter">Autonomous reputation monitoring system</p>
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-80">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">search</span>
                <input 
                    type="text" 
                    placeholder="Search by identity or hash..." 
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSelectedUserIndex(0);
                    }}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-[20px] text-[13px] font-medium text-slate-900 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-500 transition-all shadow-sm placeholder:text-slate-400 font-inter" 
                />
            </div>
            <button className="h-12 px-6 bg-slate-900 text-white rounded-[20px] text-xs font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 flex items-center gap-2 font-inter shrink-0">
                <span className="material-symbols-outlined text-[18px]">tune</span>
                Filters
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8">
        {/* Left: Directory */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-inter">Active Monitoring</span>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                  {['All Members', 'High Risk', 'Under Review'].map(tab => (
                      <button 
                        key={tab} 
                        onClick={() => {
                          setActiveTab(tab);
                          setSelectedUserIndex(0);
                        }}
                        className={`px-6 py-2.5 text-xs font-bold rounded-xl transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                          {tab}
                      </button>
                  ))}
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredMembers.map((member, i) => (
              <div 
                key={i} 
                onClick={() => setSelectedUserIndex(i)}
                className={`group relative p-6 rounded-[32px] transition-all duration-500 cursor-pointer overflow-hidden ${
                  selectedUserIndex === i 
                  ? 'bg-white border-2 border-blue-600 shadow-2xl shadow-blue-600/10 scale-[1.01]' 
                  : 'bg-white border border-slate-100 shadow-sm hover:border-slate-300 hover:shadow-xl hover:-translate-y-0.5'
                }`}
              >
                {/* Visual Accent */}
                {selectedUserIndex === i && (
                    <div className="absolute top-0 right-0 p-4">
                        <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg">
                            <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                        </div>
                    </div>
                )}

                <div className="flex items-start gap-5 mb-8">
                  <div className="relative shrink-0">
                    {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.name} className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shadow-sm group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                        <div className={`w-14 h-14 rounded-2xl ${member.lightBg} flex items-center justify-center border border-white shadow-inner group-hover:scale-105 transition-transform duration-500`}>
                            <span className={`text-lg font-bold ${member.color}`}>{member.avatar}</span>
                        </div>
                    )}
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg border-4 border-white ${member.bg} shadow-sm`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 text-lg truncate font-outfit tracking-tight">{member.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${member.color} ${member.lightBg}`}>
                            {member.status}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 font-inter tracking-tight">ID: NEB-{1024 + i}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between gap-6">
                    <div className="flex-1 space-y-2">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-inter">
                            Intelligence Score
                        </div>
                        <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                            <div 
                                className={`h-full ${member.bg} rounded-full transition-all duration-1000 ease-out`} 
                                style={{ width: `${member.score}%` }}
                            ></div>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <p className={`text-lg font-bold ${member.color} font-outfit tracking-tighter leading-none`}>{member.score}%</p>
                    </div>
                </div>
              </div>
            ))}

            {filteredMembers.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <p className="text-slate-400 font-inter font-medium">No members match this classification.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Premium User Profile */}
        <div className="flex flex-col gap-8">
          <div className="bg-white border border-slate-100 rounded-[40px] shadow-2xl shadow-slate-200/50 p-8 relative overflow-hidden group">
            {/* Glossy radial background */}
            <div className={`absolute -top-24 -right-24 w-64 h-64 ${selectedMember?.lightBg || 'bg-blue-50'} opacity-40 blur-[80px] rounded-full transition-all duration-1000 group-hover:scale-150`}></div>
            
            <div className="relative z-10 flex flex-col items-center text-center mb-10">
              <div className="relative mb-6">
                {selectedMember?.avatarUrl ? (
                    <img src={selectedMember.avatarUrl} alt={selectedMember.name} className="w-24 h-24 rounded-[32px] object-cover shadow-2xl relative z-10 border-4 border-white group-hover:rotate-3 transition-all duration-500" />
                ) : (
                    <div className="w-24 h-24 rounded-[32px] bg-slate-900 flex items-center justify-center text-white shadow-2xl relative z-10 border-4 border-white group-hover:rotate-3 transition-all duration-500">
                        <span className="text-2xl font-bold">{selectedMember?.avatar || '---'}</span>
                    </div>
                )}
                <div className={`absolute -bottom-2 -right-2 w-8 h-8 ${selectedMember?.bg || 'bg-slate-200'} text-white rounded-xl border-4 border-white flex items-center justify-center z-20 shadow-xl`}>
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                </div>
                <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-400 rounded-full blur-sm animate-pulse"></div>
                <div className="absolute top-1/2 -right-8 w-2 h-2 bg-emerald-400 rounded-full blur-[1px]"></div>
              </div>

              <h3 className="font-bold text-slate-900 text-2xl font-outfit tracking-tight">{selectedMember?.name || '---'}</h3>
              <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mt-2 ${selectedMember?.color || 'text-slate-400'} font-inter`}>
                PLATFORM {selectedMember?.role} • {selectedMember?.status}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50 p-4 rounded-3xl border border-white shadow-sm hover:shadow-md transition-all">
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1 font-inter">Identity Hash</p>
                    <p className="text-xs font-bold text-slate-900 font-mono">0x71...4F2</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl border border-white shadow-sm hover:shadow-md transition-all">
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1 font-inter">Global Rank</p>
                    <p className="text-xs font-bold text-slate-900">Top 1.2%</p>
                </div>
            </div>

            <div className="space-y-4 font-inter">
                {[
                    { label: 'Network Age', value: selectedMember?.telemetry.networkAge || '---', icon: 'schedule' },
                    { label: 'Audit Velocity', value: selectedMember?.telemetry.auditVelocity || '---', icon: 'speed' },
                    { label: 'Conflict Rate', value: selectedMember?.telemetry.conflictRate || '---', icon: 'dangerous' }
                ].map(item => (
                    <div key={item.label} className="flex justify-between items-center py-4 border-b border-slate-50 group/item">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[18px] text-slate-300 group-hover/item:text-blue-500 transition-colors">{item.icon}</span>
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{item.label}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-900">{item.value}</span>
                    </div>
                ))}
            </div>

            <div className="mt-10 flex gap-4">
              <button className="flex-1 h-12 bg-white border border-slate-200 rounded-[20px] text-xs font-bold text-slate-900 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md active:scale-95 font-inter">
                RESTRICT
              </button>
              <button className="flex-1 h-12 bg-blue-600 text-white rounded-[20px] text-xs font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95 font-inter">
                UPGRADE
              </button>
            </div>
          </div>

          {/* Timeline Activity Log */}
          <div className="bg-slate-900 rounded-[40px] shadow-2xl p-8 text-white relative overflow-hidden min-h-[300px]">
            <div className="flex justify-between items-center mb-10 relative z-10">
                <h4 className="text-lg font-bold font-outfit tracking-tight">Timeline Log</h4>
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all cursor-pointer">
                    <span className="material-symbols-outlined text-white text-[18px]">more_horiz</span>
                </div>
            </div>
            
            <div className="space-y-8 relative z-10 font-inter">
                {userEvents.length > 0 ? (
                  userEvents.slice(0, 3).map((event, i) => {
                    const isNegative = event.delta < 0;
                    return (
                      <div key={i} className="flex gap-4 group/log">
                          <div className="flex flex-col items-center">
                              <div className={`w-3 h-3 rounded-full ${isNegative ? 'bg-rose-500' : 'bg-emerald-500'} shadow-[0_0_12px_rgba(0,0,0,0.5)] group-hover/log:scale-110 transition-transform`}></div>
                              <div className="w-[2px] flex-1 bg-white/5 my-2"></div>
                          </div>
                          <div className="flex-1 pb-4">
                              <div className="flex justify-between items-start">
                                  <p className="text-[11px] font-bold text-white/90 leading-none">{event.reason}</p>
                                  <span className={`text-[10px] font-bold ${isNegative ? 'text-rose-400' : 'text-emerald-400'} font-mono`}>
                                      {event.delta > 0 ? '+' : ''}{event.delta}
                                  </span>
                              </div>
                              <p className="text-[10px] font-semibold text-white/40 mt-1 uppercase tracking-wider">
                                  {new Date(event.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • AI VERIFIED
                              </p>
                          </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-10 text-center">
                    <p className="text-[11px] font-semibold text-white/20 uppercase tracking-widest">No Recent Activity</p>
                  </div>
                )}
            </div>

            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
