import { useNavigate, useParams } from '@tanstack/react-router';
import { useGetSessionReview } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import MobilePage from '../components/layout/MobilePage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Home, Trophy, CheckCircle2, XCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export default function ResultsPage() {
  const navigate = useNavigate();
  const { resultId } = useParams({ from: '/results/$resultId' });
  const { identity } = useInternetIdentity();

  const { data, isLoading, error } = useGetSessionReview(resultId ? BigInt(resultId) : null);

  // Show login prompt for anonymous users
  if (!identity) {
    return (
      <MobilePage maxWidth="md">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Login Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Please log in to view your test results.
            </p>
            <Button onClick={() => navigate({ to: '/' })} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </MobilePage>
    );
  }

  if (isLoading) {
    return (
      <MobilePage>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobilePage>
    );
  }

  if (error || !data) {
    return (
      <MobilePage maxWidth="md">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error && error.message.includes('Unauthorized')
              ? 'You do not have permission to view this result.'
              : 'Failed to load test results. The result may not exist or you may not have permission to view it.'}
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate({ to: '/' })} className="mt-4">
          Go to Home
        </Button>
      </MobilePage>
    );
  }

  const [testResult, questions] = data;
  const totalQuestions = testResult.attempts.length;
  const correctAnswers = testResult.attempts.filter((a) => a.isCorrect).length;
  const incorrectAnswers = totalQuestions - correctAnswers;
  const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

  // Calculate average time per question (convert from microseconds to seconds)
  const totalTimeMicroseconds = testResult.attempts.reduce((sum, a) => sum + Number(a.timeTaken), 0);
  const averageTimeSeconds = totalQuestions > 0 ? totalTimeMicroseconds / totalQuestions / 1_000_000 : 0;

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
                <div className="text-3xl font-bold text-success">{correctAnswers}</div>
                <div className="text-sm text-muted-foreground mt-1">Correct</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-destructive/10">
                <div className="text-3xl font-bold text-destructive">{incorrectAnswers}</div>
                <div className="text-sm text-muted-foreground mt-1">Incorrect</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Questions</span>
                <span className="font-semibold">{totalQuestions}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Accuracy</span>
                <span className="font-semibold">{accuracy.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Average Time</span>
                <span className="font-semibold">{averageTimeSeconds.toFixed(1)}s per question</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question Review */}
        <Card>
          <CardHeader>
            <CardTitle>Question Review</CardTitle>
            <CardDescription>Review your answers for each question</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {testResult.attempts.map((attempt, index) => {
              const question = questions[index];
              if (!question) return null;

              const options = [
                { label: 'A', value: 'A', text: question.optionA },
                { label: 'B', value: 'B', text: question.optionB },
                { label: 'C', value: 'C', text: question.optionC },
                { label: 'D', value: 'D', text: question.optionD },
              ];

              const chosenOptionText = options.find((o) => o.value === attempt.chosenOption)?.text;
              const correctOptionText = options.find((o) => o.value === question.correctOption)?.text;

              return (
                <div
                  key={index}
                  className={cn(
                    'p-4 rounded-lg border-2',
                    attempt.isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-red-500 bg-red-50 dark:bg-red-950'
                  )}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                        attempt.isCorrect ? 'bg-green-500' : 'bg-red-500'
                      )}
                    >
                      {attempt.isCorrect ? <CheckCircle2 className="w-5 h-5 text-white" /> : <XCircle className="w-5 h-5 text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">Question {index + 1}</span>
                        <Badge variant={attempt.isCorrect ? 'default' : 'destructive'} className="text-xs">
                          {attempt.isCorrect ? 'Correct' : 'Incorrect'}
                        </Badge>
                      </div>
                      <p className="text-sm mb-3">{question.questionText}</p>

                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-semibold text-muted-foreground">Your Answer: </span>
                          <span className={attempt.isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                            {attempt.chosenOption} - {chosenOptionText}
                          </span>
                        </div>
                        {!attempt.isCorrect && (
                          <div>
                            <span className="font-semibold text-muted-foreground">Correct Answer: </span>
                            <span className="text-green-700 dark:text-green-400">
                              {question.correctOption} - {correctOptionText}
                            </span>
                          </div>
                        )}
                        {question.explanation && (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <span className="font-semibold text-muted-foreground">Explanation: </span>
                            <span className="text-muted-foreground">{question.explanation}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-muted-foreground mt-2">
                          <Clock className="w-3 h-3" />
                          <span className="text-xs">{(Number(attempt.timeTaken) / 1_000_000).toFixed(1)}s</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={() => navigate({ to: '/' })} variant="outline" className="flex-1">
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>
          <Button onClick={() => navigate({ to: '/rankings' })} className="flex-1">
            <Trophy className="w-4 h-4 mr-2" />
            View Rankings
          </Button>
        </div>
      </div>
    </MobilePage>
  );
}
