import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function CreatePostPage() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [text, setText] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [tempUrl, setTempUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const createPost = useMutation({
    mutationFn: async (data: { text: string; mediaUrls: string[] }) => {
      await api.post(`/communities/${communityId}/posts`, data);
    },
    onSuccess: () => {
      toast('Post Published', {
        description: 'Your post is now broadcasting to the community feed.',
        style: { background: '#eff6ff', border: '1px solid #dbeafe', color: '#1e40af' },
        icon: <span className="material-symbols-outlined text-blue-600">send</span>
      });
      qc.invalidateQueries({ queryKey: ['posts', communityId] });
      navigate(`/c/${communityId}/feed`);
    },
  });

  const handleAddMedia = () => {
    if (tempUrl.trim()) {
      setMediaUrls([...mediaUrls, tempUrl.trim()]);
      setTempUrl('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setMediaUrls([...mediaUrls, base64String]);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = (index: number) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full min-h-screen py-12 px-10 space-y-12 bg-slate-50/30">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 font-outfit tracking-tight">Create Post</h1>
          <p className="text-sm text-slate-500 font-medium">Draft your message to the community stream</p>
        </div>
        <button 
          onClick={() => navigate(-1)}
          className="h-14 w-14 flex items-center justify-center rounded-[20px] bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50 transition-all shadow-sm group"
        >
          <span className="material-symbols-outlined text-3xl group-hover:rotate-90 transition-transform">close</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl shadow-blue-500/5 p-10 space-y-10">
            {/* Post Text */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Content</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Share your thoughts, questions, or updates..."
                className="w-full bg-slate-50 border border-slate-100 rounded-[32px] p-8 text-xl font-medium focus:ring-[12px] focus:ring-blue-600/5 focus:border-blue-600/20 transition-all resize-none min-h-[320px] placeholder:text-slate-300 outline-none"
              />
            </div>

            {/* Media Section */}
            <div className="space-y-6">
              <div className="flex justify-between items-center px-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Attachment Gallery</label>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 px-4 py-2 rounded-xl transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">upload</span>
                  {isUploading ? 'Processing...' : 'Upload Image'}
                </button>
              </div>
              
              <div className="flex gap-4">
                <input
                  type="text"
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  placeholder="Or paste an image URL..."
                  className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-semibold focus:ring-0 focus:border-blue-600/30 transition-all outline-none"
                />
                <button 
                  onClick={handleAddMedia}
                  className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                >
                  Link Media
                </button>
              </div>

              {mediaUrls.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {mediaUrls.map((url, i) => (
                    <div key={i} className="relative group aspect-video rounded-[24px] overflow-hidden border border-slate-100 shadow-sm bg-slate-100">
                      <img src={url} alt="Post media" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          onClick={() => removeMedia(i)}
                          className="h-12 w-12 rounded-full bg-white text-rose-600 shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-[40px] border border-slate-200 p-10 shadow-sm space-y-8">
            <h3 className="font-black text-slate-900 text-base uppercase tracking-widest">Publish Settings</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4 text-slate-500">
                <span className="material-symbols-outlined">public</span>
                <span className="text-sm font-bold">Public Stream</span>
              </div>
              <div className="flex items-center gap-4 text-slate-500">
                <span className="material-symbols-outlined">verified</span>
                <span className="text-sm font-bold">Instant Approval</span>
              </div>
            </div>
            
            <div className="h-px bg-slate-50"></div>

            <button
              onClick={() => createPost.mutate({ text, mediaUrls })}
              disabled={!text.trim() || createPost.isPending}
              className="w-full py-5 bg-blue-600 text-white rounded-[24px] text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
            >
              {createPost.isPending ? 'Broadcasting...' : 'Publish Post Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
