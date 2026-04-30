import { useParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import { toast } from 'sonner';

export function RulesPage() {
  const { communityId = '' } = useParams();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(location.state?.openNewRule || false);

  const { data: community, isLoading } = useQuery({
    queryKey: ['community', communityId],
    queryFn: async () => {
      const { data } = await api.get(`/communities/${communityId}`);
      return data.community;
    },
    enabled: !!communityId,
  });

  const rules = community?.rules || [];

  if (isLoading) {
    return (
      <div className="w-full flex flex-col relative bg-[#f8f9fc] font-inter min-h-screen">
        {/* Top Bar Skeleton */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white shrink-0 z-10 sticky top-0">
          <div className="h-10 w-full max-w-2xl bg-slate-50 rounded-xl animate-pulse"></div>
          <div className="flex gap-6">
            <div className="w-10 h-10 bg-slate-50 rounded-xl animate-pulse"></div>
            <div className="w-32 h-10 bg-slate-100 rounded-xl animate-pulse"></div>
          </div>
        </div>

        <div className="p-8 w-full max-w-[1600px] mx-auto space-y-8">
          <div className="flex justify-between items-center shrink-0">
            <div className="space-y-3">
              <div className="h-9 w-64 bg-slate-100 rounded-lg animate-pulse"></div>
              <div className="h-4 w-96 bg-slate-50 rounded-lg animate-pulse"></div>
            </div>
            <div className="h-12 w-44 bg-slate-100 rounded-xl animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm flex flex-col min-h-[320px] animate-pulse">
                <div className="flex justify-between mb-6">
                   <div className="w-10 h-10 bg-slate-100 rounded-xl"></div>
                   <div className="w-20 h-6 bg-slate-50 rounded-lg"></div>
                </div>
                <div className="flex-1 space-y-3">
                   <div className="h-6 w-3/4 bg-slate-100 rounded-md"></div>
                   <div className="h-4 w-full bg-slate-50 rounded-md"></div>
                   <div className="h-4 w-5/6 bg-slate-50 rounded-md"></div>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-50 space-y-4">
                   <div className="h-4 w-full bg-slate-50 rounded-md"></div>
                   <div className="h-4 w-full bg-slate-50 rounded-md"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 w-full max-w-[1600px] mx-auto space-y-8 h-[calc(100vh-80px)] overflow-y-auto pb-12">
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-outfit">Community Guidelines</h2>
          <p className="text-sm font-medium text-slate-500 mt-1 font-inter">
            Configure and manage AI-driven content enforcement policies.
          </p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:opacity-90 transition-all font-inter" onClick={() => setIsModalOpen(true)}>
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Rule
        </button>
      </div>

      {/* Rules Grid - Wider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Define Custom Rule Card (First) */}
        <div 
          onClick={() => setIsModalOpen(true)}
          className="p-8 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center text-center group hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer min-h-[320px]"
        >
          <div className="w-12 h-12 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-300 mb-6 group-hover:border-blue-400 group-hover:text-blue-600 group-hover:bg-white group-hover:shadow-xl group-hover:shadow-blue-500/10 transition-all">
            <span className="material-symbols-outlined text-2xl">add</span>
          </div>
          <h4 className="font-bold text-slate-700 text-lg font-outfit">Define Custom Rule</h4>
          <p className="text-[11px] text-slate-400 font-medium mt-2 max-w-[200px] leading-relaxed font-inter">Start from scratch or utilize pre-built templates</p>
        </div>

        {rules.map((rule: any) => (
          <RuleCard 
            key={rule.id}
            icon={rule.severity === 'high' ? 'security' : rule.severity === 'medium' ? 'policy' : 'visibility_off'} 
            title={rule.title} 
            description={rule.description}
            sensitivity={rule.severity === 'high' ? 0.85 : rule.severity === 'medium' ? 0.50 : 0.20}
            logic="Contextual LLM"
            status="Active"
          />
        ))}
      </div>

      {isModalOpen && <NewRuleModal onClose={() => setIsModalOpen(false)} communityId={communityId} rules={rules} />}
    </div>
  );
}

function NewRuleModal({ onClose, communityId, rules }: any) {
    const queryClient = useQueryClient();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [sensitivity, setSensitivity] = useState('medium');

    const mutation = useMutation({
      mutationFn: async (newRule: any) => {
        const updatedRules = [...rules, newRule];
        await api.put(`/communities/${communityId}/rules`, { rules: updatedRules });
      },
      onSuccess: (_data, variables) => {
        toast.success('Rule Created Successfully', {
          description: `Policy "${variables.title}" is now active and enforced.`
        });
        queryClient.invalidateQueries({ queryKey: ['community', communityId] });
        onClose();
      }
    });

    const handleCreate = () => {
      mutation.mutate({
        id: Math.random().toString(36).substr(2, 9),
        title,
        description,
        severity: sensitivity
      });
    };

    return (
        <div className="fixed top-20 left-[240px] right-0 bottom-0 bg-white/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight font-outfit">Define New Rule</h3>
                        <p className="text-xs text-slate-500 font-medium mt-1 font-inter">Configure automated AI enforcement logic.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 font-inter">Rule Name</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} type="text" placeholder="e.g. Toxicity Filter" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm font-medium font-inter" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 font-inter">Violation Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe what this rule should identify..." className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm font-medium font-inter min-h-[80px] resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 font-inter">Sensitivity</label>
                            <select value={sensitivity} onChange={e => setSensitivity(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all text-sm font-bold appearance-none bg-slate-50 font-inter cursor-pointer">
                                <option value="low">Low (0.20)</option>
                                <option value="medium">Medium (0.50)</option>
                                <option value="high">High (0.85)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 font-inter">Trigger Logic</label>
                            <select className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all text-sm font-bold appearance-none bg-slate-50 font-inter cursor-pointer">
                                <option>Contextual LLM</option>
                                <option>Vector Search</option>
                                <option>Keyword Match</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                    <button onClick={onClose} className="flex-1 px-6 py-3 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all font-inter">Cancel</button>
                    <button onClick={handleCreate} disabled={mutation.isPending} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all font-inter disabled:opacity-50">
                        {mutation.isPending ? 'Creating...' : 'Create Rule'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function RuleCard({ icon, title, description, sensitivity, logic, status }: any) {
  const isActive = status === 'Active';
  
  return (
    <div className="p-8 bg-white border border-slate-200 rounded-[32px] shadow-sm flex flex-col relative overflow-hidden group hover:shadow-xl hover:shadow-blue-500/5 transition-all min-h-[320px]">
      <div className="flex justify-between items-start mb-6">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'} group-hover:scale-110 transition-transform shadow-sm`}>
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-widest border ${isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'} font-inter`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></div>
          {status.toUpperCase()}
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-2 font-outfit">{title}</h3>
        <p className="text-[13px] text-slate-500 font-medium leading-relaxed mb-4 font-inter">
          {description}
        </p>
      </div>

      <div className="space-y-4 pt-6 border-t border-slate-50">
        <div className="space-y-3">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.1em] font-inter">
            <span className="text-slate-400">AI Sensitivity</span>
            <span className="text-slate-900">{sensitivity === 1 ? 'MAX (1.00)' : sensitivity >= 0.8 ? `HIGH (${sensitivity.toFixed(2)})` : sensitivity >= 0.5 ? `MEDIUM (${sensitivity.toFixed(2)})` : `LOW (${sensitivity.toFixed(2)})`}</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${isActive ? 'bg-blue-600 shadow-[0_0_12px_rgba(79,70,229,0.4)]' : 'bg-slate-300'}`}
              style={{ width: `${sensitivity * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-[0.1em] font-inter">
          <span className="text-slate-400">Trigger Logic</span>
          <span className="text-slate-900">{logic}</span>
        </div>
      </div>
    </div>
  );
}
