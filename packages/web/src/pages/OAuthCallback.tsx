import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setAccessToken } from '@/lib/api';
import { api } from '@/lib/api';

export function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      navigate('/login?error=oauth');
      return;
    }
    setAccessToken(token);
    void (async () => {
      try {
        const { data } = await api.get<{ communities: { id: string }[] }>('/communities');
        if (data.communities.length) {
          navigate(`/c/${data.communities[0].id}/dashboard`);
        } else {
          navigate('/onboarding');
        }
      } catch {
        navigate('/login');
      }
    })();
  }, [navigate, params]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-[hsl(var(--foreground)/0.7)]">Completing sign-in…</p>
    </div>
  );
}
