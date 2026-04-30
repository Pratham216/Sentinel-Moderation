export type GlobalRole = 'USER' | 'ADMIN';
export type CommunityRole = 'USER' | 'MODERATOR' | 'ADMIN';
export type PostStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';
export type ModerationRecommendation = 'APPROVE' | 'FLAG' | 'REJECT';

export interface CommunityRule {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface CommunitySettings {
  autoApproveBelow?: number;
  autoRejectAbove?: number;
  openRouterModel?: string;
}
