import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export function IndexPage() {
  const { accessToken } = useAuthStore();
  const navigate = useNavigate();

  const { data: list, isLoading, isError } = useQuery({
    queryKey: ['communities'],
    queryFn: async () => {
      const { data } = await api.get<{ communities: { id: string; role: string; name: string; slug: string }[] }>('/communities');
      return data.communities;
    },
    enabled: !!accessToken,
    retry: 1,
  });

  useEffect(() => {
    if (!accessToken) {
      navigate('/login', { replace: true });
      return;
    }
    if (isError) return;
    if (!isLoading && list) {
      if (list.length > 0) {
        const first = list[0];
        const isPrivileged = first.role === 'ADMIN' || first.role === 'MODERATOR';
        navigate(`/c/${first.id}/${isPrivileged ? 'dashboard' : 'feed'}`, { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [accessToken, list, isLoading, isError, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <img src="/logo.png" alt="Sentinel Logo" className="w-16 h-16 mb-6 animate-pulse" />
      <div className="w-12 h-1 border-2 border-blue-600/20 bg-blue-600/10 rounded-full overflow-hidden">
        <div className="w-1/2 h-full bg-blue-600 animate-[loading_1s_ease-in-out_infinite]"></div>
      </div>
      <p className="mt-4 text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">Initializing Sentinel Core</p>
    </div>
  );
}
