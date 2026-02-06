import { useNavigate, useParams } from '@tanstack/react-router';
import { useGetQuestionsForChapter } from '../hooks/useQueries';
import MobilePage from '../components/layout/MobilePage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Home, Trophy, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ResultsPage() {
  const navigate = useNavigate();
  const { resultId } = useParams({ from: '/results/$resultId' });

  // Note: In a real implementation, we would fetch the test result from backend
  // For now, we'll show a placeholder since the backend doesn't have a getTestResult method
  
  return (
    <MobilePage maxWidth="lg">
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Trophy className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Test Completed!</h1>
            <p className="text-muted-foreground">Great job on completing the practice session</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Performance</CardTitle>
            <CardDescription>Summary of your test results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-success/10">
                <div className="text-3xl font-bold text-success">--</div>
                <div className="text-sm text-muted-foreground mt-1">Correct</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-destructive/10">
                <div className="text-3xl font-bold text-destructive">--</div>
                <div className="text-sm text-muted-foreground mt-1">Incorrect</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Accuracy</span>
                <span className="font-semibold">--%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Average Time</span>
                <span className="font-semibold">--s</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Review</CardTitle>
            <CardDescription>Detailed breakdown of your answers</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-8">
              Detailed results will be available once the backend implements result retrieval
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" onClick={() => navigate({ to: '/' })}>
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>
          <Button onClick={() => navigate({ to: '/rankings' })}>
            <Trophy className="w-4 h-4 mr-2" />
            Rankings
          </Button>
        </div>
      </div>
    </MobilePage>
  );
}
