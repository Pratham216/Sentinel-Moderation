import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Account');
  const queryClient = useQueryClient();
  
  // Account Form State
  const [displayName, setDisplayName] = useState('');
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '' });

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get<{ user: { id: string; email: string; name: string; avatarUrl?: string } }>(
        '/auth/me'
      );
      if (!displayName) setDisplayName(data.user.name);
      return data.user;
    },
  });


  const updateProfile = useMutation({
    mutationFn: async (vars: { name: string; avatarUrl?: string }) => {
      await api.patch('/auth/update-me', vars);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    }
  });

  const updatePassword = useMutation({
    mutationFn: async (vars: { current: string; next: string }) => {
      await api.post('/auth/update-password', {
        currentPassword: vars.current,
        newPassword: vars.next
      });
    },
    onSuccess: () => {
      setIsEditingPassword(false);
      setPasswords({ current: '', next: '' });
      alert('Password updated successfully');
    },
    onError: (err: any) => {
        alert(err.response?.data?.error || 'Failed to update password');
    }
  });

  return (
    <div className="p-8 w-full max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 font-outfit tracking-tight">Settings</h2>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mt-1 font-inter">Manage your account preferences, security, and team workspace.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-10 border-b border-slate-100 mb-10 overflow-x-auto no-scrollbar">
        {['Account', 'Security', 'Team', 'Billing'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-xs font-bold uppercase tracking-[0.15em] transition-all border-b-2 font-inter shrink-0 ${
              activeTab === tab 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          {activeTab === 'Account' && (
            <div className="p-10 bg-white border border-slate-100 rounded-[40px] shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-10 uppercase tracking-tight font-outfit">Profile Information</h3>
              
              {/* Avatar Section */}
              <div className="flex flex-col md:flex-row items-center gap-10 mb-12">
                <div className="relative group">
                  <div className="w-28 h-28 rounded-[36px] bg-slate-900 flex items-center justify-center text-white text-3xl font-bold shadow-2xl overflow-hidden border-4 border-white">
                      {(() => {
                          if (!me) return <div className="w-full h-full bg-slate-100 animate-pulse" />;

                          const getEliteAvatar = (name: string) => {
                              const mapping: Record<string, string> = {
                                  'Pratham Bisht': 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop',
                                  'Admin': 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop',
                                  'Member': 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop',
                                  'Moderator': 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop',
                                  'Pratham-Admin': 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=400&fit=crop'
                              };
                              return mapping[name] || mapping[name?.replace('-Admin', '')];
                          };
                          const currentAvatar = me?.avatarUrl || getEliteAvatar(me?.name);
                          
                          return currentAvatar ? (
                              <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                              <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white text-3xl font-bold uppercase">
                                  {me?.name?.[0] || '?'}
                              </div>
                          );
                      })()}
                  </div>
                  <label className="absolute -bottom-1 -right-1 w-9 h-9 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-blue-600 shadow-lg cursor-pointer hover:scale-110 transition-all">
                      <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                      <input type="file" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                              // In a real app we'd upload here. For now just mock.
                              alert("Photo upload feature ready for S3/Blob integration.");
                          }
                      }} />
                  </label>
                </div>
                <div className="space-y-4 text-center md:text-left">
                  <p className="text-xs font-bold text-slate-900 uppercase tracking-widest font-inter">Administrator Avatar</p>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest font-inter">Recommended: 400x400px • PNG, JPG or WEBP</p>
                  <div className="flex gap-3 justify-center md:justify-start">
                      <button className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/10 font-inter">Upload New</button>
                      <button className="px-6 py-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all font-inter">Remove</button>
                  </div>
                </div>
              </div>

              {/* Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                  <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 font-inter">Display Name</label>
                      <input 
                          type="text"
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-semibold text-slate-900 focus:ring-4 focus:ring-blue-600/5 focus:border-blue-500 outline-none transition-all font-inter"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                      />
                  </div>
                  <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 font-inter">Email Address</label>
                      <div className="relative">
                        <input 
                            disabled
                            className="w-full bg-slate-100/50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-semibold text-slate-400 outline-none font-inter cursor-not-allowed"
                            value={me?.email || ''}
                        />
                        <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 text-[18px]">lock</span>
                      </div>
                  </div>
              </div>

              <div className="space-y-3 mb-12">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 font-inter">Language & Timezone</label>
                  <div className="relative">
                      <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-semibold text-slate-900 appearance-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-500 outline-none transition-all font-inter cursor-pointer">
                          <option>English (United States) • (GMT-08:00) Pacific Time</option>
                          <option>English (United Kingdom) • (GMT+00:00) London</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                  </div>
              </div>

              <div className="flex justify-end gap-4 pt-8 border-t border-slate-50">
                  <button 
                    onClick={() => setDisplayName(me?.name || '')}
                    className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors font-inter"
                  >
                    Reset
                  </button>
                  <button 
                    onClick={() => updateProfile.mutate({ name: displayName })}
                    disabled={updateProfile.isPending}
                    className="px-10 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 shadow-xl shadow-slate-900/10 transition-all font-inter disabled:opacity-50"
                  >
                    {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
              </div>
            </div>
          )}

          {activeTab === 'Security' && (
            <div className="p-10 bg-white border border-slate-100 rounded-[40px] shadow-sm space-y-10">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight font-outfit">Security Control</h3>
              
              <div className="space-y-6">
                <SecurityRow 
                    icon="lock" 
                    title="Change Password" 
                    desc="Update your login credentials regularly." 
                    action={isEditingPassword ? "Cancel" : "Update"} 
                    onClick={() => setIsEditingPassword(!isEditingPassword)}
                />

                {isEditingPassword && (
                    <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 space-y-6 animate-in slide-in-from-top-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Current Password</label>
                                <input 
                                    type="password"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                                    value={passwords.current}
                                    onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">New Password</label>
                                <input 
                                    type="password"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                                    value={passwords.next}
                                    onChange={(e) => setPasswords({...passwords, next: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button 
                                onClick={() => updatePassword.mutate(passwords)}
                                disabled={updatePassword.isPending || !passwords.current || !passwords.next}
                                className="px-8 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
                            >
                                {updatePassword.isPending ? 'Processing...' : 'Confirm Update'}
                            </button>
                        </div>
                    </div>
                )}

                <SecurityRow icon="phonelink_setup" title="Two-Factor Authentication" desc="Add an extra layer of security to your account." action="Enable" active />
                <SecurityRow icon="history" title="Session Management" desc="Monitor and revoke active sessions on other devices." action="View All" />
              </div>
            </div>
          )}

          {activeTab === 'Team' && (
            <div className="p-10 bg-white border border-slate-100 rounded-[40px] shadow-sm">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight font-outfit">Team Workspace</h3>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-600/10 hover:bg-blue-700 transition-all font-inter">
                  <span className="material-symbols-outlined text-sm">add</span>
                  Invite Member
                </button>
              </div>
              <div className="space-y-4">
                <TeamMember name={me?.name || '---'} role="Owner" email={me?.email || '---'} status="Active" />
                <TeamMember name="Sarah Smith" role="Moderator" email="sarah@sentinel.test" status="Away" />
                <TeamMember name="Jordan Lee" role="Viewer" email="jordan@sentinel.test" status="Offline" />
              </div>
            </div>
          )}

          {activeTab === 'Billing' && (
            <div className="p-10 bg-white border border-slate-100 rounded-[40px] shadow-sm space-y-10">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight font-outfit">Plan & Billing</h3>
              <div className="p-8 bg-slate-50 rounded-[32px] flex flex-col md:flex-row justify-between items-center gap-6 border border-slate-100">
                <div className="text-center md:text-left">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Plan</p>
                  <p className="text-2xl font-bold text-blue-600 font-outfit tracking-tight">Enterprise Pro</p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-wider">$499/month • Billed monthly</p>
                </div>
                <button className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 shadow-sm transition-all font-inter">Change Plan</button>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 font-inter">Payment Method</h4>
                <div className="flex items-center gap-6 p-6 border border-slate-100 rounded-3xl bg-white shadow-sm hover:shadow-md transition-all">
                  <div className="w-14 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white text-[10px] font-bold italic shadow-inner">VISA</div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900 font-inter">Visa ending in 4242</p>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Expires 12/26</p>
                  </div>
                  <button className="text-blue-600 text-[11px] font-bold uppercase tracking-widest hover:underline transition-all">Edit</button>
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone */}
          <div className="p-10 bg-rose-50/20 border border-rose-100 rounded-[40px]">
            <h3 className="text-lg font-bold text-rose-600 mb-8 uppercase tracking-tight font-outfit">Advanced Controls</h3>
            <div className="p-6 bg-white border border-rose-100 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm shadow-rose-500/5">
                <div className="text-center md:text-left">
                    <h4 className="font-bold text-slate-900 text-sm uppercase tracking-tight font-inter">Deactivate Workspace</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-wider">Stop all AI moderation engines and archive current data.</p>
                </div>
                <button className="px-8 py-3 bg-rose-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/10 font-inter">Deactivate</button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Usage Card */}
          <div className="p-8 bg-[#0f0f15] rounded-[40px] text-white relative overflow-hidden shadow-2xl shadow-blue-900/20 group">
            <div className="flex justify-between items-center mb-8">
                <div className="px-4 py-1.5 bg-blue-500/20 text-blue-400 rounded-xl text-[9px] font-bold uppercase tracking-widest border border-blue-500/20">WORKSPACE STATUS: OPTIMAL</div>
            </div>
            <h3 className="text-lg font-bold mb-8 uppercase tracking-tight font-outfit">Infrastructure</h3>
            <div className="space-y-8 mb-10">
                <div className="space-y-4">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest opacity-40">
                        <span>AI Inference Load</span>
                        <span>85%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full w-[85%] shadow-[0_0_15px_rgba(79,70,229,1)]"></div>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest opacity-40">
                        <span>Database Capacity</span>
                        <span>42%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full w-[42%]"></div>
                    </div>
                </div>
            </div>
            <button className="w-full py-5 bg-white text-[#0f0f15] rounded-3xl text-[11px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2 group/btn font-inter">
                Scale Infrastructure
                <span className="material-symbols-outlined text-lg group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-all">north_east</span>
            </button>
            <div className="absolute top-0 right-0 opacity-[0.03] scale-150 rotate-12 pointer-events-none group-hover:rotate-45 transition-transform duration-1000">
                <span className="material-symbols-outlined text-[200px]">auto_awesome</span>
            </div>
          </div>

          {/* Connected Accounts */}
          <div className="p-8 bg-white border border-slate-100 rounded-[40px] shadow-sm">
            <h4 className="font-bold text-slate-900 mb-8 text-xs uppercase tracking-tight font-outfit">Cloud Connectors</h4>
            <div className="space-y-4">
                <ConnectedAccount icon="https://www.google.com/favicon.ico" name="Google Cloud" status="CONNECTED" />
                <ConnectedAccount icon="https://github.com/favicon.ico" name="GitHub Enterprise" status="LINK" />
                <ConnectedAccount icon="https://www.vector.dev/favicon.ico" name="Vector Engine" status="CONNECTED" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityRow({ icon, title, desc, action, active, onClick }: any) {
  return (
    <div className="flex items-center gap-6 p-6 border border-slate-50 rounded-3xl hover:border-blue-100 transition-all group">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${active ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'} group-hover:scale-105 transition-transform`}>
        <span className="material-symbols-outlined text-[24px]">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight font-inter">{title}</h4>
        <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-wider leading-relaxed">{desc}</p>
      </div>
      <button 
        onClick={onClick}
        className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'} active:scale-95`}
      >
        {action}
      </button>
    </div>
  );
}

function TeamMember({ name, role, email, status }: any) {
  const getEliteAvatar = (n: string) => {
      const mapping: Record<string, string> = {
          'Pratham Bisht': 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop',
          'Admin': 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop',
          'Member': 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop',
          'Moderator': 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop',
          'Pratham-Admin': 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=400&fit=crop',
          'Sarah Smith': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop',
          'Jordan Lee': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop'
      };
      return mapping[n] || mapping[n?.replace('-Admin', '')];
  };
  const avatarUrl = getEliteAvatar(name);

  return (
    <div className="flex items-center gap-5 p-5 border border-slate-50 rounded-3xl group hover:border-slate-100 transition-all bg-white shadow-sm">
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="w-12 h-12 rounded-2xl object-cover shadow-lg border-2 border-white" />
      ) : (
        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center font-bold text-white text-xs shadow-lg">
          {name.split(' ').map((n:any)=>n[0]).join('')}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900 font-inter">{name}</p>
        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest truncate">{role} • {email}</p>
      </div>
      <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
        <div className={`w-2 h-2 rounded-full ${status === 'Active' ? 'bg-emerald-500' : status === 'Away' ? 'bg-amber-500' : 'bg-slate-300'} animate-pulse`}></div>
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-inter">{status}</span>
      </div>
    </div>
  );
}

function ConnectedAccount({ icon, name, status }: { icon: string; name: string; status: string }) {
    const isConnected = status === 'CONNECTED';
    return (
        <div className="p-5 border border-slate-50 rounded-[28px] flex items-center justify-between group hover:border-slate-100 transition-all bg-slate-50/30">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <img src={icon} alt={name} className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight font-inter">{name}</span>
            </div>
            <span className={`text-[8px] font-bold tracking-widest ${isConnected ? 'text-emerald-500 bg-emerald-50 border border-emerald-100' : 'text-blue-600 bg-blue-50 border border-blue-100'} px-2.5 py-1 rounded-lg`}>
                {status}
            </span>
        </div>
    );
}
