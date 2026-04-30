import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export function OnboardingPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('My Community');
  const [slug, setSlug] = useState('my-community');
  const [loading, setLoading] = useState(false);

  // If the user lands here, give them an easy way to just skip to the main community
  const skipToMain = () => navigate('/', { replace: true });

  async function submit() {
    setLoading(true);
    try {
      const { data } = await api.post<{ community: { id: string } }>('/communities', {
        name,
        slug,
        description: '',
      });
      navigate(`/c/${data.community.id}/dashboard`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md space-y-4 p-8">
        <h1 className="text-xl font-semibold">Create your first community</h1>
        <div className="space-y-2">
          <label className="text-xs uppercase text-[hsl(var(--foreground)/0.55)]">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase text-[hsl(var(--foreground)/0.55)]">Slug</label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9-]/g, ''))} />
        </div>
        <Button className="w-full" disabled={loading} type="button" onClick={() => submit()}>
          {loading ? 'Creating…' : 'Create Community'}
        </Button>
        <button 
          onClick={skipToMain}
          className="w-full py-2 text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest font-inter"
        >
          Or join main community
        </button>
      </Card>
    </div>
  );
}
