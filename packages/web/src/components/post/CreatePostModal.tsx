import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth';

export function CreatePostModal({ onClose, communityId, queryClient }: any) {
    const [text, setText] = useState('');
    const { accessToken } = useAuthStore();

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
                author: { name: 'You', trustScore: 100 }, 
                likes: [],
                savedBy: [],
                _count: { likes: 0, comments: 0, savedBy: 0 }
            };

            queryClient.setQueryData(['posts', communityId], (old: any) => [optimisticPost, ...(old || [])]);
            
            return { previousPosts };
        },
        onSuccess: (post) => {
            const socket = getSocket(accessToken);
            
            // Show the analysis toast immediately
            const toastId = toast.loading('Sentinel AI is analyzing your post...', {
                description: 'This usually takes a few seconds.',
            });

            const onModerationUpdate = (data: { postId: string; status: string }) => {
                if (data.postId === post.id) {
                    socket.off('moderation:update', onModerationUpdate);
                    
                    if (data.status === 'APPROVED') {
                        toast.success('Post Auto-Approved', {
                            id: toastId,
                            description: 'Content passed safety validation and is now live.',
                        });
                    } else if (data.status === 'FLAGGED') {
                        toast.warning('Moved to Moderation Queue', {
                            id: toastId,
                            description: 'Post flagged for manual review due to borderline safety score.',
                        });
                    } else if (data.status === 'REJECTED') {
                        toast.error('Post Auto-Rejected', {
                            id: toastId,
                            description: 'Content violated community safety policies and was removed.',
                        });
                    }
                }
            };

            socket.on('moderation:update', onModerationUpdate);
            
            // Safety timeout: if after 15s we still have no update, just clear the loading toast
            setTimeout(() => {
                socket.off('moderation:update', onModerationUpdate);
                // We only dismiss if it's still the loading toast (though sonner handles ID correctly)
                toast.dismiss(toastId);
            }, 15000);
        },
        onError: (_err, _newPost, context: any) => {
            queryClient.setQueryData(['posts', communityId], context.previousPosts);
            toast.error('Failed to create post');
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
