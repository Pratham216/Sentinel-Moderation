import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export function SignUpPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER');
  const [safeCode, setSafeCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (role === 'ADMIN' && safeCode !== '2783') {
      setError('Invalid Admin Safe Code. Access Denied.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { 
        name, 
        email, 
        password,
        globalRole: role
      });
      setAuth(data.accessToken, data.user);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-background flex flex-col min-h-screen items-center justify-center p-4">
      <div className="mb-8 flex flex-col items-center">
        <img src="/logo.png" alt="Sentinel Logo" className="w-20 h-14 mb-1 drop-shadow-2xl hover:scale-105 transition-transform" />
        <h1 className="text-3xl font-black tracking-tight text-slate-900 font-outfit">Sentinel</h1>
      </div>

      <div className="w-full max-w-sm bg-white shadow-2xl rounded-[32px] border border-slate-100 p-6">
        <h2 className="text-xl font-black text-slate-900 mb-1">Create account</h2>
        <p className="text-slate-500 text-sm font-medium mb-6">Join the Sentinel platform</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="mt-1 w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="mt-1 w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Account Role</label>
                <select
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                    className="mt-1 w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all appearance-none cursor-pointer"
                >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                </select>
            </div>
            <div>
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Password</label>
                <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="mt-1 w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all"
                    placeholder="Min 8 chars"
                />
            </div>
          </div>

          {role === 'ADMIN' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Admin Safe Code</label>
                <input
                    type="password"
                    value={safeCode}
                    onChange={e => setSafeCode(e.target.value)}
                    required
                    className="mt-1 w-full bg-blue-50/30 border border-blue-200 rounded-xl px-4 py-3 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all"
                    placeholder="Enter 4-digit code"
                />
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm font-bold text-center mt-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest py-3 rounded-xl transition-all disabled:opacity-50 mt-2 shadow-lg shadow-blue-600/20"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-slate-600 text-sm font-medium text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 font-black hover:underline">Sign in</Link>
        </p>
      </div>

      <footer className="w-full max-w-7xl mx-auto mt-8 pt-2 pb-2 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-widest shrink-0">
        <div className="flex items-center gap-3 mb-6 md:mb-0">
          <span className="font-black text-slate-900 text-sm tracking-tighter">Sentinel</span>
          <div className="h-4 w-px bg-slate-200"></div>
          <span>© 2026 Sentinel Systems Inc.</span>
        </div>
      </footer>
    </div>
  );
}
