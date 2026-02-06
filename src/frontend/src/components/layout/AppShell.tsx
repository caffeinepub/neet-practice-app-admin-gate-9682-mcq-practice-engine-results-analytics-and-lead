import { ReactNode, useEffect } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import LoginButton from '../auth/LoginButton';
import { Button } from '@/components/ui/button';
import { Home, Trophy, UserPlus, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { LIVE_DISPLAY_NAME, getLiveNameWarning } from '../../config/liveDeployment';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const isAuthenticated = !!identity;

  // Validate Live deployment name on mount (non-blocking)
  useEffect(() => {
    const warning = getLiveNameWarning();
    if (warning) {
      console.warn(warning);
    }
  }, []);

  const navItems = [
    { label: 'Home', icon: Home, path: '/', show: true },
    { label: 'Rankings', icon: Trophy, path: '/rankings', show: true },
    { label: 'Contributor', icon: UserPlus, path: '/contributor', show: isAuthenticated },
  ];

  const NavLinks = () => (
    <>
      {navItems
        .filter((item) => item.show)
        .map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;
          return (
            <Button
              key={item.path}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate({ to: item.path })}
              className="gap-2"
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{item.label}</span>
            </Button>
          );
        })}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate({ to: '/' })}
              className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
                L
              </div>
              <span className="hidden sm:inline">LearningXHub</span>
            </button>
          </div>

          <nav className="hidden md:flex items-center gap-2">
            <NavLinks />
          </nav>

          <div className="flex items-center gap-2">
            <LoginButton />
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="mb-6">
                  <img
                    src="/assets/generated/drawer-banner.dim_1200x400.png"
                    alt="LearningXHub by RAHIL & MEHRAN"
                    className="w-full h-auto rounded-lg"
                  />
                </div>
                <nav className="flex flex-col gap-4">
                  <NavLinks />
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t py-6 md:py-8">
        <div className="container px-4 text-center text-sm text-muted-foreground">
          <p>
            © 2026. Built with ❤️ using{' '}
            <a
              href="https://caffeine.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
