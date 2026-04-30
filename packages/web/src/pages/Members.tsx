import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useState } from 'react';

export function MembersPage() {
  const { communityId = '' } = useParams();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('USER');

  const { data } = useQuery({
    queryKey: ['members', communityId],
    queryFn: async () => {
      const { data } = await api.get(`/communities/${communityId}/members`);
      return data.members as {
        userId: string;
        role: string;
        user: { name: string; email: string; trustScore: number };
      }[];
    },
    enabled: !!communityId,
  });

  const invite = useMutation({
    mutationFn: async () => {
      await api.post(`/communities/${communityId}/members`, { email, role });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', communityId] });
      setEmail('');
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Members</h1>
      <Card className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px] space-y-1">
          <label className="text-xs uppercase text-[hsl(var(--foreground)/0.5)]">Email</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase text-[hsl(var(--foreground)/0.5)]">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-10 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] px-3 text-sm"
          >
            <option value="USER">USER</option>
            <option value="MODERATOR">MODERATOR</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
        <Button type="button" onClick={() => invite.mutate()} disabled={invite.isPending}>
          Add / update
        </Button>
      </Card>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase">
              <th className="p-3">User</th>
              <th className="p-3">Role</th>
              <th className="p-3 text-right">Trust</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((m) => (
              <tr key={m.userId} className="border-t border-[hsl(var(--border))]">
                <td className="p-3">
                  {m.user.name}
                  <div className="text-xs text-[hsl(var(--foreground)/0.5)]">{m.user.email}</div>
                </td>
                <td className="p-3">{m.role}</td>
                <td className="p-3 text-right">{m.user.trustScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
