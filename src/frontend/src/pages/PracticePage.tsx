import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useGetQuestionsForChapter, useSubmitTestResult, useGetOrCreatePracticeProgress, useSavePracticeProgress } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { usePracticeTimer } from '../hooks/usePracticeTimer';
import MobilePage from '../components/layout/MobilePage';
import QuestionNavigator from '../components/practice/QuestionNavigator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Clock, Loader2, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Subject, QuestionAttempt, Category, PracticeProgressKey } from '../backend';
import { cn } from '@/lib/utils';
import { loadLastIndex, saveLastIndex, clearProgress, createStorageKey } from '../utils/practiceProgressStorage';

export default function PracticePage() {
  const navigate = useNavigate();
  const { subject, chapterId, category } = useParams({ from: '/practice/$subject/$chapterId/$category' });
  const search = useSearch({ from: '/practice/$subject/$chapterId/$category' });
  const year = (search as any)?.year as number | undefined;
  
  const { identity } = useInternetIdentity();
  const { data: allQuestions, isLoading } = useGetQuestionsForChapter(BigInt(chapterId));
  const submitResult = useSubmitTestResult();
  const savePracticeProgressMutation = useSavePracticeProgress();

  const progressKey: PracticeProgressKey = {
    subject: subject as Subject,
    chapterId: BigInt(chapterId),
    category: category as Category,
    year: year !== undefined ? BigInt(year) : undefined,
  };

  const { data: backendProgress, isLoading: progressLoading } = useGetOrCreatePracticeProgress(
    progressKey,
    BigInt(allQuestions?.length || 0)
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [attempts, setAttempts] = useState<QuestionAttempt[]>([]);
  const [progressRestored, setProgressRestored] = useState(false);
  const timer = usePracticeTimer();

  // Filter questions by category and optional year
  let questions = allQuestions?.filter((q) => q.category === (category as Category)) || [];
  
  // For PYQ categories, filter by year if provided
  if (year !== undefined && (category === Category.neetPYQ || category === Category.jeePYQ)) {
    questions = questions.filter((q) => q.year !== undefined && Number(q.year) === year);
  }

  const currentQuestion = questions?.[currentIndex];
  const totalQuestions = questions?.length || 0;
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

  // Restore progress on mount
  useEffect(() => {
    if (questions && questions.length > 0 && !progressRestored) {
      let restoredIndex = 0;

      if (identity && backendProgress && !progressLoading) {
        // Authenticated user: use backend progress
        const lastQuestionIndex = Number(backendProgress.lastQuestionIndex);
        if (lastQuestionIndex > 0 && lastQuestionIndex <= questions.length) {
          restoredIndex = lastQuestionIndex - 1; // Convert 1-based to 0-based
        }
      } else if (!identity) {
        // Anonymous user: use localStorage
        const storageKey = createStorageKey(subject, chapterId, category, year);
        const savedIndex = loadLastIndex(storageKey);
        if (savedIndex !== null && savedIndex >= 0 && savedIndex < questions.length) {
          restoredIndex = savedIndex;
        }
      }

      setCurrentIndex(restoredIndex);
      setProgressRestored(true);
      timer.start();
    }
  }, [questions, backendProgress, identity, progressLoading, progressRestored]);

  useEffect(() => {
    if (currentQuestion && !showFeedback && progressRestored) {
      setSelectedOption(null);
      timer.reset();
      timer.start();
    }
  }, [currentIndex, showFeedback, progressRestored]);

  // Save progress whenever currentIndex changes
  useEffect(() => {
    if (questions && questions.length > 0 && currentQuestion && progressRestored) {
      const storageKey = createStorageKey(subject, chapterId, category, year);

      if (identity) {
        // Authenticated: save to backend (1-based index)
        savePracticeProgressMutation.mutate({
          key: progressKey,
          progress: {
            lastQuestionIndex: BigInt(currentIndex + 1),
            discoveredQuestionIds: questions.slice(0, currentIndex + 1).map((q) => q.id),
          },
        });
      } else {
        // Anonymous: save to localStorage
        saveLastIndex(storageKey, currentIndex);
      }
    }
  }, [currentIndex, questions, currentQuestion, identity, progressRestored]);

  const handleOptionSelect = (option: string) => {
    if (!showFeedback) {
      setSelectedOption(option);
    }
  };

  const handleSubmitAnswer = () => {
    if (!currentQuestion || !selectedOption) {
      toast.error('Please select an option');
      return;
    }

    timer.stop();
    setShowFeedback(true);
  };

  const handleNext = () => {
    if (!currentQuestion || !selectedOption) return;

    const attempt: QuestionAttempt = {
      questionId: currentQuestion.id,
      chosenOption: selectedOption,
      isCorrect: selectedOption === currentQuestion.correctOption,
      timeTaken: timer.elapsedMicroseconds,
    };

    const newAttempts = [...attempts, attempt];
    setAttempts(newAttempts);

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowFeedback(false);
    } else {
      handleSubmit(newAttempts);
    }
  };

  const handleSubmit = async (finalAttempts: QuestionAttempt[]) => {
    try {
      const resultId = await submitResult.mutateAsync({
        subject: subject as Subject,
        chapterId: BigInt(chapterId),
        attempts: finalAttempts,
      });
      toast.success('Test completed!');

      // Clear progress after submission
      const storageKey = createStorageKey(subject, chapterId, category, year);
      if (identity) {
        savePracticeProgressMutation.mutate({
          key: progressKey,
          progress: {
            lastQuestionIndex: BigInt(1),
            discoveredQuestionIds: [],
          },
        });
      } else {
        clearProgress(storageKey);
      }

      navigate({ to: '/results/$resultId', params: { resultId: resultId.toString() } });
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit test');
    }
  };

  const handleNavigateToQuestion = (index: number) => {
    if (showFeedback) {
      // Clear feedback state when navigating
      setShowFeedback(false);
    }
    setCurrentIndex(index);
    setSelectedOption(null);
    timer.reset();
    timer.start();
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setShowFeedback(false);
    setSelectedOption(null);
    setAttempts([]);
    timer.reset();
    timer.start();

    // Clear saved progress
    const storageKey = createStorageKey(subject, chapterId, category, year);
    if (identity) {
      savePracticeProgressMutation.mutate({
        key: progressKey,
        progress: {
          lastQuestionIndex: BigInt(1),
          discoveredQuestionIds: [],
        },
      });
    } else {
      clearProgress(storageKey);
    }

    toast.success('Practice restarted from question 1');
  };

  if (isLoading || !progressRestored) {
    return (
      <MobilePage>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobilePage>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <MobilePage maxWidth="md">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No questions available for this category</p>
            <Button
              className="mt-4"
              onClick={() =>
                navigate({
                  to: '/chapter/$subject/$chapterId/category',
                  params: { subject: subject as Subject, chapterId },
                })
              }
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </MobilePage>
    );
  }

  const options = [
    { label: 'A', value: 'A', text: currentQuestion?.optionA },
    { label: 'B', value: 'B', text: currentQuestion?.optionB },
    { label: 'C', value: 'C', text: currentQuestion?.optionC },
    { label: 'D', value: 'D', text: currentQuestion?.optionD },
  ];

  const isCorrect = selectedOption === currentQuestion?.correctOption;

  return (
    <MobilePage maxWidth="lg">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              navigate({
                to: '/chapter/$subject/$chapterId/category',
                params: { subject: subject as Subject, chapterId },
              })
            }
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{timer.elapsedSeconds}s</span>
          </div>
        </div>

        {/* Prominent Question Number Display */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-primary">
                  Question {currentIndex + 1}
                  <span className="text-xl text-muted-foreground"> of {totalQuestions}</span>
                </p>
                {year !== undefined && (
                  <p className="text-sm text-muted-foreground mt-1">Year: {year}</p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handleRestart}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Restart
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Question Navigator */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Jump to Question</CardTitle>
          </CardHeader>
          <CardContent>
            <QuestionNavigator
              totalQuestions={totalQuestions}
              currentIndex={currentIndex}
              onNavigate={handleNavigateToQuestion}
              disabled={false}
            />
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg leading-relaxed">{currentQuestion?.questionText}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {options.map((option) => {
              const isSelected = selectedOption === option.value;
              const isCorrectOption = option.value === currentQuestion?.correctOption;
              const showCorrect = showFeedback && isCorrectOption;
              const showIncorrect = showFeedback && isSelected && !isCorrect;

              return (
                <button
                  key={option.value}
                  onClick={() => handleOptionSelect(option.value)}
                  disabled={showFeedback}
                  className={cn(
                    'w-full text-left p-4 rounded-lg border-2 transition-all',
                    !showFeedback && 'hover:border-primary hover:bg-primary/5',
                    isSelected && !showFeedback && 'border-primary bg-primary/10',
                    !isSelected && !showFeedback && 'border-border bg-card',
                    showCorrect && 'border-green-500 bg-green-50 dark:bg-green-950',
                    showIncorrect && 'border-red-500 bg-red-50 dark:bg-red-950',
                    showFeedback && !showCorrect && !showIncorrect && 'opacity-50'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center font-semibold flex-shrink-0',
                        isSelected && !showFeedback && 'bg-primary text-primary-foreground',
                        !isSelected && !showFeedback && 'bg-muted text-muted-foreground',
                        showCorrect && 'bg-green-500 text-white',
                        showIncorrect && 'bg-red-500 text-white'
                      )}
                    >
                      {showCorrect ? <CheckCircle2 className="w-5 h-5" /> : showIncorrect ? <XCircle className="w-5 h-5" /> : option.label}
                    </div>
                    <p className="flex-1 pt-1">{option.text}</p>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Feedback Section */}
        {showFeedback && (
          <Card className={cn(isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-red-500 bg-red-50 dark:bg-red-950')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <span className="text-green-600">Correct!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-red-600" />
                    <span className="text-red-600">Incorrect</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold text-sm mb-1">Correct Answer:</p>
                <p className="text-sm">
                  <span className="font-bold">{currentQuestion?.correctOption}</span> - {options.find((o) => o.value === currentQuestion?.correctOption)?.text}
                </p>
              </div>
              {currentQuestion?.explanation && (
                <div>
                  <p className="font-semibold text-sm mb-1">Explanation:</p>
                  <p className="text-sm">{currentQuestion.explanation}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Button */}
        {!showFeedback ? (
          <Button onClick={handleSubmitAnswer} disabled={!selectedOption} className="w-full" size="lg">
            Submit Answer
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={submitResult.isPending} className="w-full" size="lg">
            {submitResult.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : currentIndex < totalQuestions - 1 ? (
              'Next Question'
            ) : (
              'Submit Test'
            )}
          </Button>
        )}
      </div>
    </MobilePage>
  );
}
