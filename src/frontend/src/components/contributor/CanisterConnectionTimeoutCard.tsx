import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

interface CanisterConnectionTimeoutCardProps {
  onRetry: () => void;
  isRetrying?: boolean;
}

export default function CanisterConnectionTimeoutCard({
  onRetry,
  isRetrying = false,
}: CanisterConnectionTimeoutCardProps) {
  const navigate = useNavigate();

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate({ to: '/' });
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-destructive" />
          Connection Taking Too Long
        </CardTitle>
        <CardDescription>
          The canister is taking longer than expected to respond
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This usually happens when the network is slow or the canister is initializing. 
            Please try one of the recovery options below.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            className="w-full"
            variant="default"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Connection
              </>
            )}
          </Button>

          <Button
            onClick={handleReload}
            variant="outline"
            className="w-full"
          >
            Reload Page
          </Button>

          <Button
            onClick={handleGoHome}
            variant="ghost"
            className="w-full"
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Home
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          If the problem persists, please wait a few minutes and try again.
        </p>
      </CardContent>
    </Card>
  );
}
