import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function CreatePostModal({ onClose, communityId, queryClient }: any) {
    const [text, setText] = useState('');

    const mutation = useMutation({
        mutationFn: async (payload: { text: string }) => {
            const { data } = await api.post(`/communities/${communityId}/posts`, payload);
            return data.post;
        },
        onMutate: async (newPost) => {
            await queryClient.cancelQueries({ queryKey: ['posts', communityId] });
            const previousPosts = queryClient.getQueryData(['posts', communityId]);
            
            // Optimistically add the new post
            const optimisticPost = {
                id: 'temp-' + Date.now(),
                text: newPost.text,
                status: 'PENDING',
                createdAt: new Date().toISOString(),
                author: { name: 'You', trustScore: 100 }, // Placeholder for optimistic view
                likes: [],
                savedBy: [],
                _count: { likes: 0, comments: 0, savedBy: 0 }
            };

            queryClient.setQueryData(['posts', communityId], (old: any) => [optimisticPost, ...(old || [])]);
            
            return { previousPosts };
        },
        onError: (_err, _newPost, context: any) => {
            queryClient.setQueryData(['posts', communityId], context.previousPosts);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['posts', communityId] });
            onClose();
        }
    });

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight font-outfit">Create New Post</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Submit content to the community</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 font-inter">Post Content</label>
                        <textarea 
                            value={text} 
                            onChange={e => setText(e.target.value)} 
                            placeholder="What's on your mind?" 
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm font-medium font-inter min-h-[120px] resize-none" 
                        />
                    </div>
                </div>
                <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                    <button onClick={onClose} className="flex-1 px-6 py-3 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all font-inter">Cancel</button>
                    <button 
                        onClick={() => mutation.mutate({ text })} 
                        disabled={mutation.isPending || !text.trim()} 
                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all font-inter disabled:opacity-50"
                    >
                        {mutation.isPending ? 'Posting...' : 'Post Content'}
                    </button>
                </div>
            </div>
        </div>
    );
}
