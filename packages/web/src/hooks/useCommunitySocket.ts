import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth';

export function useCommunitySocket(communityId: string | undefined) {
  const qc = useQueryClient();
  const { accessToken } = useAuthStore();

  useEffect(() => {
    if (!communityId || !accessToken) return;
    const s = getSocket();
    s.emit('join:community', communityId);

    const onMod = () => {
      qc.invalidateQueries({ queryKey: ['posts', communityId] });
    };
    const onPost = () => {
      qc.invalidateQueries({ queryKey: ['posts', communityId] });
    };
    const onAction = () => {
      qc.invalidateQueries({ queryKey: ['posts', communityId] });
    };
    const onUpdate = () => {
      qc.invalidateQueries({ queryKey: ['posts', communityId] });
    };

    s.on('moderation:update', onMod);
    s.on('post:new', onPost);
    s.on('action:taken', onAction);
    s.on('post:updated', onUpdate);

    return () => {
      s.emit('leave:community', communityId);
      s.off('moderation:update', onMod);
      s.off('post:new', onPost);
      s.off('action:taken', onAction);
      s.off('post:updated', onUpdate);
    };
  }, [communityId, accessToken, qc]);
}
