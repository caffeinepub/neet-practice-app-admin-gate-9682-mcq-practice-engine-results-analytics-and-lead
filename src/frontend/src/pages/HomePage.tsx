import { useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import MobilePage from '../components/layout/MobilePage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Trophy, UserPlus, Loader2 } from 'lucide-react';
import { LIVE_DISPLAY_NAME } from '../config/liveDeployment';

export default function HomePage() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();

  const isAuthenticated = !!identity;
  const isActorReady = !!actor && !actorFetching;

  const handleContributorClick = () => {
    if (!isActorReady) {
      return; // Prevent navigation while actor is initializing
    }
    navigate({ to: '/contributor' });
  };

  return (
    <MobilePage maxWidth="md">
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {LIVE_DISPLAY_NAME}
          </h1>
          <p className="text-muted-foreground">Master Physics, Chemistry & Biology</p>
        </div>

        <div className="grid gap-4">
          <Card
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => navigate({ to: '/subject' })}
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Student Mode</CardTitle>
              <CardDescription>Practice MCQs by subject and chapter</CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => navigate({ to: '/rankings' })}
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-2">
                <Trophy className="w-6 h-6 text-accent" />
              </div>
              <CardTitle>Rankings</CardTitle>
              <CardDescription>View leaderboard and track your progress</CardDescription>
            </CardHeader>
          </Card>

          <Card
            className={`transition-all ${
              isActorReady
                ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
                : 'opacity-60 cursor-not-allowed'
            }`}
            onClick={handleContributorClick}
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-2">
                {!isActorReady ? (
                  <Loader2 className="w-6 h-6 text-warning animate-spin" />
                ) : (
                  <UserPlus className="w-6 h-6 text-warning" />
                )}
              </div>
              <CardTitle>Contributor Mode</CardTitle>
              <CardDescription>
                {!isActorReady
                  ? 'Connecting to the canister...'
                  : 'Add and edit questions (password required)'}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </MobilePage>
  );
}
