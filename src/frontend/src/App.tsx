import { RouterProvider, createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useQueries';
import HomePage from './pages/HomePage';
import SubjectSelectPage from './pages/SubjectSelectPage';
import ChapterSelectPage from './pages/ChapterSelectPage';
import PracticePage from './pages/PracticePage';
import ResultsPage from './pages/ResultsPage';
import RankingsPage from './pages/RankingsPage';
import AdminPage from './pages/AdminPage';
import AppShell from './components/layout/AppShell';
import ProfileSetupCard from './components/auth/ProfileSetupCard';
import GlobalErrorBoundary from './components/errors/GlobalErrorBoundary';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';

function Layout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

const rootRoute = createRootRoute({
  component: Layout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const subjectSelectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/subject',
  component: SubjectSelectPage,
});

const chapterSelectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/chapter/$subject',
  component: ChapterSelectPage,
});

const practiceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/practice/$subject/$chapterId',
  component: PracticePage,
});

const resultsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/results/$resultId',
  component: ResultsPage,
});

const rankingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rankings',
  component: RankingsPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  subjectSelectRoute,
  chapterSelectRoute,
  practiceRoute,
  resultsRoute,
  rankingsRoute,
  adminRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function AppContent() {
  const { identity, isInitializing } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched, error: profileError } = useGetCallerUserProfile();
  
  const isAuthenticated = !!identity;
  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

  // Show profile setup modal when authenticated user has no profile
  if (showProfileSetup) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <ProfileSetupCard />
      </div>
    );
  }

  // Show friendly error if profile fetch failed for authenticated user
  if (isAuthenticated && profileError && isFetched) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold">Unable to Load Profile</h2>
          <p className="text-muted-foreground">
            We couldn't load your profile. Please try refreshing the page or logging in again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Render router for all users (authenticated and anonymous)
  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <GlobalErrorBoundary>
        <AppContent />
        <Toaster />
      </GlobalErrorBoundary>
    </ThemeProvider>
  );
}
