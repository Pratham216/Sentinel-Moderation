import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function ProfilePage() {
  const { communityId } = useParams();
  const navigate = useNavigate();

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get<{ user: { id: string; email: string; name: string; trustScore: number } }>('/auth/me');
      return data.user;
    },
  });

  const { data: myPosts } = useQuery({
    queryKey: ['posts', communityId, 'me'],
    queryFn: async () => {
      const { data } = await api.get(`/communities/${communityId}/posts?authorId=${me?.id}`);
      return data.posts as any[];
    },
    enabled: !!me?.id && !!communityId,
  });

  const hasPosts = myPosts && myPosts.length > 0;

  return (
    <div className="w-full py-8 px-8 space-y-8">
      {/* Profile Header */}
      <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
        <div className="h-40 bg-gradient-to-r from-blue-500 via-purple-600 to-blue-700"></div>
        <div className="px-10 pb-10">
          <div className="relative flex justify-between items-end -mt-16 mb-8">
            <div className="h-32 w-32 rounded-[32px] bg-white p-1 shadow-2xl">
              <div className="h-full w-full rounded-[28px] bg-slate-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-400 text-5xl">person</span>
              </div>
            </div>
            <button className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-900 hover:bg-slate-50 transition-all shadow-sm">
              Edit Public Profile
            </button>
          </div>
          
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900 font-outfit tracking-tight">{me?.name}</h2>
            <p className="text-slate-500 font-medium text-lg">{me?.email}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            <div className="bg-slate-50 rounded-[24px] p-6 border border-slate-100 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Trust Score</p>
              <p className="text-3xl font-black text-emerald-600">{me?.trustScore}%</p>
            </div>
            <div className="bg-slate-50 rounded-[24px] p-6 border border-slate-100 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Contributions</p>
              <p className="text-3xl font-black text-blue-600">{myPosts?.length || 0}</p>
            </div>
            <div className="bg-slate-50 rounded-[24px] p-6 border border-slate-100 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Account Age</p>
              <p className="text-3xl font-black text-slate-900">3 Days</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Account Settings */}
        <div className={hasPosts ? "lg:col-span-2 space-y-6" : "lg:col-span-3 space-y-6"}>
          <div className="bg-white rounded-[40px] border border-slate-200 p-10 shadow-sm space-y-8">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 font-outfit tracking-tight">Security & Settings</h3>
              <p className="text-sm text-slate-500 font-medium">Manage your personal information and account security</p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Full Name</label>
                  <input type="text" defaultValue={me?.name} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-semibold focus:border-blue-600/30 transition-all outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Email Address</label>
                  <input type="email" defaultValue={me?.email} disabled className="w-full bg-slate-100/50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-semibold text-slate-400 cursor-not-allowed outline-none" />
                </div>
              </div>

              <div className="h-px bg-slate-50"></div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <span className="material-symbols-outlined">lock</span>
                  </div>
                  <h4 className="font-black text-slate-900 text-base">Change Password</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                  <input type="password" placeholder="Current Password" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-semibold focus:border-blue-600/30 transition-all outline-none" />
                  <input type="password" placeholder="New Password" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-semibold focus:border-blue-600/30 transition-all outline-none" />
                </div>
                <button className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all mt-2">
                  Update Security Profile
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Only show if there are posts */}
        {hasPosts ? (
          <div className="space-y-6">
            <div className="bg-blue-600 rounded-[40px] p-10 text-white shadow-2xl shadow-blue-600/20 relative overflow-hidden group">
              <div className="relative z-10 space-y-6">
                <span className="material-symbols-outlined text-5xl opacity-50">verified_user</span>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Reputation Level</p>
                  <p className="text-4xl font-black font-outfit">Elite Member</p>
                </div>
                <div className="w-full bg-blue-500/50 h-3 rounded-full overflow-hidden">
                  <div className="bg-white h-full transition-all duration-1000" style={{ width: `${me?.trustScore}%` }}></div>
                </div>
                <p className="text-xs font-bold leading-relaxed">Your high trust score grants you instant publishing rights.</p>
              </div>
              <div className="absolute -bottom-10 -right-10 h-64 w-64 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
            </div>

            <div className="bg-white rounded-[40px] border border-slate-200 p-8 shadow-sm">
              <h3 className="font-black text-slate-900 text-base uppercase tracking-widest mb-8 ml-2">Recent Log</h3>
              <div className="space-y-8">
                {myPosts?.slice(0, 3).map(p => (
                  <div key={p.id} className="flex gap-5">
                    <div className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 shadow-sm ${p.status === 'APPROVED' ? 'bg-emerald-500 ring-4 ring-emerald-500/10' : 'bg-amber-500 ring-4 ring-amber-500/10'}`}></div>
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-slate-700 line-clamp-2 leading-relaxed">{p.text}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{new Date(p.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[40px] border border-slate-200 p-12 shadow-sm text-center space-y-6">
             <div className="h-20 w-20 bg-slate-50 rounded-[28px] flex items-center justify-center mx-auto border border-slate-100 text-slate-300">
               <span className="material-symbols-outlined text-4xl">post_add</span>
             </div>
             <div className="space-y-2">
               <h4 className="text-xl font-black text-slate-900 tracking-tight">No posts yet</h4>
               <p className="text-slate-500 font-medium max-w-xs mx-auto">Your activity log is currently empty. Start sharing to build your reputation!</p>
             </div>
             <button 
               onClick={() => navigate(`/c/${communityId}/create-post`)}
               className="inline-flex items-center gap-3 px-8 py-3.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:scale-105 transition-all"
             >
               <span className="material-symbols-outlined text-[18px]">add</span>
               Create your first post
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
