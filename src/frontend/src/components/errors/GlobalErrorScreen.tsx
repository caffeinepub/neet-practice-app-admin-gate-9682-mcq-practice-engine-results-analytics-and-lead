import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface GlobalErrorScreenProps {
  error: Error | null;
}

export default function GlobalErrorScreen({ error }: GlobalErrorScreenProps) {
  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Something Went Wrong</CardTitle>
          <CardDescription>
            We encountered an unexpected error. Please try reloading the page or returning to the home page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-muted text-sm font-mono text-muted-foreground overflow-auto max-h-32">
              {error.message}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleReload} className="flex-1 gap-2">
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </Button>
            <Button onClick={handleGoHome} variant="outline" className="flex-1 gap-2">
              <Home className="w-4 h-4" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
