import { useState } from 'react';
import { useActor } from '../../hooks/useActor';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Loader2, AlertCircle, UserPlus } from 'lucide-react';

export default function ContributorGateCard() {
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  const isActorReady = !!actor && !actorFetching;
  const isLoggedIn = !!identity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!password) {
      setErrorMessage('Please enter the contributor password');
      return;
    }

    if (!isLoggedIn) {
      setErrorMessage('Please log in first');
      return;
    }

    if (!isActorReady) {
      setErrorMessage('Connecting to the canister… please wait');
      return;
    }

    // Backend method unlockContributorMode is not yet implemented
    setErrorMessage('Contributor unlock functionality is not yet available. Please contact the administrator.');
    setPassword('');
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <UserPlus className="w-8 h-8 text-primary" />
        </div>
        <CardTitle>Contributor Access</CardTitle>
        <CardDescription>Enter the password to add and edit questions</CardDescription>
      </CardHeader>
      <CardContent>
        {!isLoggedIn && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please log in before attempting to unlock contributor mode
            </AlertDescription>
          </Alert>
        )}
        
        {isLoggedIn && !isActorReady && (
          <Alert className="mb-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Connecting to the canister… please wait
            </AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Contributor Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage('');
                }}
                disabled={!isActorReady || !isLoggedIn}
                className="pl-10"
                autoFocus={isActorReady && isLoggedIn}
              />
            </div>
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={!isActorReady || !isLoggedIn}
          >
            {!isLoggedIn ? (
              'Log in required'
            ) : !isActorReady ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              'Unlock Contributor Mode'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
