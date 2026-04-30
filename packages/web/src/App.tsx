import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/Login';
import { SignUpPage } from '@/pages/SignUp';
import { IndexPage } from '@/pages/Index';
import { DashboardPage } from '@/pages/Dashboard';
import { ModerationQueuePage } from '@/pages/ModerationQueue';
import { PostsPage } from '@/pages/Posts';
import { PostReviewPage } from '@/pages/PostReview';
import { AnalyticsPage } from '@/pages/Analytics';
import { TrustPage } from '@/pages/Trust';
import { MembersPage } from '@/pages/Members';
import { RulesPage } from '@/pages/Rules';
import { SettingsPage } from '@/pages/Settings';
import { AuditPage } from '@/pages/Audit';
import { OnboardingPage } from '@/pages/Onboarding';
import { FeedPage } from '@/pages/Feed';
import { ProfilePage } from '@/pages/Profile';
import { CreatePostPage } from '@/pages/CreatePost';
import { MyPostsPage } from '@/pages/MyPosts';
import { SavedPostsPage } from '@/pages/SavedPosts';

import { PostViewPage } from '@/pages/PostView';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <>
      <Toaster position="top-center" richColors />
      <Routes>
      <Route path="/login/*" element={<LoginPage />} />
      <Route path="/signup/*" element={<SignUpPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/" element={<IndexPage />} />
      <Route element={<AppLayout />}>
        <Route path="/c/:communityId/dashboard" element={<DashboardPage />} />
        <Route path="/c/:communityId/queue" element={<ModerationQueuePage />} />
        <Route path="/c/:communityId/posts" element={<PostsPage />} />
        <Route path="/c/:communityId/posts/:postId" element={<PostReviewPage />} />
        <Route path="/c/:communityId/posts/:postId/view" element={<PostViewPage />} />
        <Route path="/c/:communityId/analytics" element={<AnalyticsPage />} />
        <Route path="/c/:communityId/trust" element={<TrustPage />} />
        <Route path="/c/:communityId/members" element={<MembersPage />} />
        <Route path="/c/:communityId/rules" element={<RulesPage />} />
        <Route path="/c/:communityId/settings" element={<SettingsPage />} />
        <Route path="/c/:communityId/audit" element={<AuditPage />} />
        <Route path="/c/:communityId/feed" element={<FeedPage />} />
        <Route path="/c/:communityId/create-post" element={<CreatePostPage />} />
        <Route path="/c/:communityId/your-posts" element={<MyPostsPage />} />
        <Route path="/c/:communityId/saved" element={<SavedPostsPage />} />
        <Route path="/c/:communityId/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    </>
  );
}
