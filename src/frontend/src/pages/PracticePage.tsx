import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useActor } from '../hooks/useActor';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import {
  useGetQuestionsByChapterAndCategory,
  useGetQuestionsByChapterCategoryAndYear,
  useSubmitTestResult,
  useGetOrCreatePracticeProgress,
  useSavePracticeProgress,
} from '../hooks/useQueries';
import { usePracticeTimer } from '../hooks/usePracticeTimer';
import MobilePage from '../components/layout/MobilePage';
import QuestionNavigator from '../components/practice/QuestionNavigator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, AlertCircle, Home } from 'lucide-react';
import { toast } from 'sonner';
import { Subject, Category, type QuestionAttempt, type Question, type PracticeProgressKey } from '../backend';
import { loadPracticeProgress, savePracticeProgress as saveLocalProgress, StoredAnswer, clearProgress } from '../utils/practiceProgressStorage';

interface QuestionAnswer {
  questionId: bigint;
  selectedOption: string | null;
  timeTaken: bigint;
}

export default function PracticePage() {
  const navigate = useNavigate();
  const params = useParams({ from: '/practice/$subject/$chapterId/$category' });
  const search = useSearch({ from: '/practice/$subject/$chapterId/$category' });
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  // Read required params from route params and cast to proper types
  const subject = params.subject as Subject;
  const chapterId = params.chapterId;
  const category = params.category as Category;
  
  // Read optional year from search params
  const { year: yearNumber } = search;

  // Parse and validate chapterId
  let chapterIdBigInt: bigint | null = null;
  let chapterIdError = false;
  if (chapterId) {
    try {
      chapterIdBigInt = BigInt(chapterId);
    } catch (e) {
      chapterIdError = true;
    }
  }

  // Parse and validate year if provided
  let yearBigInt: bigint | undefined = undefined;
  let yearError = false;
  if (yearNumber !== undefined) {
    try {
      yearBigInt = BigInt(yearNumber);
    } catch (e) {
      yearError = true;
    }
  }

  // Check if required params are missing or invalid
  const hasInvalidParams = !subject || !chapterId || !category || chapterIdError || yearError;

  const isPYQ = category === Category.neetPYQ || category === Category.jeePYQ;
  const isYearFiltered = isPYQ && yearBigInt !== undefined;

  // Only fetch questions if params are valid
  const { data: chapterCategoryQuestions, isLoading: chapterCategoryLoading } = useGetQuestionsByChapterAndCategory(
    !hasInvalidParams && !isYearFiltered ? chapterIdBigInt : null,
    !hasInvalidParams && !isYearFiltered ? category : null
  );

  const { data: chapterCategoryYearQuestions, isLoading: chapterCategoryYearLoading } =
    useGetQuestionsByChapterCategoryAndYear(
      !hasInvalidParams && isYearFiltered ? chapterIdBigInt : null,
      !hasInvalidParams && isYearFiltered ? category : null,
      !hasInvalidParams && isYearFiltered ? yearBigInt! : null
    );

  const isLoading = isYearFiltered ? chapterCategoryYearLoading : chapterCategoryLoading;
  const questions = isYearFiltered ? chapterCategoryYearQuestions : chapterCategoryQuestions;

  // Create progress key only if params are valid
  const progressKey: PracticeProgressKey | null = !hasInvalidParams && chapterIdBigInt !== null && subject && category
    ? {
        subject: subject,
        chapterId: chapterIdBigInt,
        category: category,
        year: yearBigInt,
      }
    : null;

  const { data: serverProgress, isLoading: progressLoading } = useGetOrCreatePracticeProgress(
    progressKey,
    BigInt(questions?.length || 0)
  );
  const savePracticeProgressMutation = useSavePracticeProgress();
  const submitTestResult = useSubmitTestResult();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, QuestionAnswer>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { elapsedMicroseconds, isRunning, start, stop, reset } = usePracticeTimer();

  const isAuthenticated = !!identity;

  // All hooks must be called before any conditional returns
  useEffect(() => {
    if (hasInvalidParams) return; // Skip effect if params are invalid
    
    if (!isLoading && questions && questions.length > 0 && !progressLoading && subject && chapterId && category) {
      let startIndex = 0;
      let loadedAnswers = new Map<number, QuestionAnswer>();
      let needsProgressReset = false;

      if (isAuthenticated && serverProgress) {
        const serverIndex = Number(serverProgress.lastQuestionIndex) - 1;

        if (serverIndex < 0 || serverIndex >= questions.length) {
          console.warn('Invalid server progress detected, resetting to Question 1');
          needsProgressReset = true;
          startIndex = 0;
        } else {
          startIndex = serverIndex;
        }
      } else {
        const yearStr = yearNumber !== undefined ? yearNumber.toString() : undefined;
        const localProgress = loadPracticeProgress(subject, chapterId, category, yearStr);
        if (localProgress) {
          const localIndex = localProgress.lastQuestionIndex;

          if (localIndex < 0 || localIndex >= questions.length) {
            console.warn('Invalid local progress detected, resetting to Question 1');
            clearProgress(subject, chapterId, category, yearStr);
            startIndex = 0;
          } else {
            startIndex = localIndex;

            if (localProgress.answers) {
              Object.entries(localProgress.answers).forEach(([qIdStr, answer]) => {
                const typedAnswer = answer as StoredAnswer;
                const qId = BigInt(qIdStr);
                const qIndex = questions.findIndex((q) => q.id === qId);
                if (qIndex !== -1 && typedAnswer.selectedOption) {
                  loadedAnswers.set(qIndex, {
                    questionId: qId,
                    selectedOption: typedAnswer.selectedOption,
                    timeTaken: BigInt(typedAnswer.timeTaken || 0),
                  });
                }
              });
            }
          }
        }
      }

      setCurrentQuestionIndex(startIndex);
      setAnswers(loadedAnswers);
      start();

      if (needsProgressReset && isAuthenticated && actor && progressKey) {
        const resetProgress = {
          lastQuestionIndex: BigInt(1),
          discoveredQuestionIds: questions.slice(0, 1).map((q) => q.id),
        };
        savePracticeProgressMutation
          .mutateAsync({
            key: progressKey,
            progress: resetProgress,
          })
          .catch((error) => {
            console.error('Failed to persist progress reset:', error);
          });
      }
    }
  }, [hasInvalidParams, isLoading, questions?.length, progressLoading, serverProgress, isAuthenticated, subject, chapterId, category, yearNumber]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  // Now we can do conditional returns after all hooks are called
  if (hasInvalidParams) {
    return (
      <MobilePage maxWidth="md">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/subject' })}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Invalid Practice Session</h1>
              <p className="text-sm text-muted-foreground">The practice session parameters are missing or invalid</p>
            </div>
          </div>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {!subject && 'Subject is required. '}
              {!chapterId && 'Chapter ID is required. '}
              {!category && 'Category is required. '}
              {chapterIdError && 'Chapter ID is invalid. '}
              {yearError && 'Year is invalid. '}
              Please go back and select a valid practice session.
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate({ to: -1 } as any)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button onClick={() => navigate({ to: '/' })}>
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </div>
      </MobilePage>
    );
  }

  if (isLoading || progressLoading) {
    return (
      <MobilePage>
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading questions...</p>
        </div>
      </MobilePage>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <MobilePage maxWidth="md">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                navigate({
                  to: '/chapter/$subject/$chapterId/category',
                  params: { subject: subject!, chapterId: chapterId! },
                })
              }
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">No Questions Available</h1>
              <p className="text-sm text-muted-foreground">This selection has no questions yet</p>
            </div>
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No questions are available for this chapter and category combination. Please go back and select a
              different option.
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                navigate({
                  to: '/chapter/$subject/$chapterId/category',
                  params: { subject: subject!, chapterId: chapterId! },
                })
              }
            >
              Go Back
            </Button>
            <Button onClick={() => navigate({ to: '/subject' })}>Choose Another Subject</Button>
          </div>
        </div>
      </MobilePage>
    );
  }

  const safeCurrentIndex = Math.max(0, Math.min(currentQuestionIndex, questions.length - 1));
  const currentQuestion = questions[safeCurrentIndex];

  if (!currentQuestion) {
    return (
      <MobilePage maxWidth="md">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/subject' })}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Something Went Wrong</h1>
              <p className="text-sm text-muted-foreground">Unable to load the current question</p>
            </div>
          </div>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The question you're trying to view could not be found. This might be due to outdated progress data.
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                if (subject && chapterId && category) {
                  const yearStr = yearNumber !== undefined ? yearNumber.toString() : undefined;
                  clearProgress(subject, chapterId, category, yearStr);

                  setCurrentQuestionIndex(0);
                  setAnswers(new Map());
                  reset();
                  start();

                  if (isAuthenticated && actor && progressKey) {
                    try {
                      await savePracticeProgressMutation.mutateAsync({
                        key: progressKey,
                        progress: {
                          lastQuestionIndex: BigInt(1),
                          discoveredQuestionIds: questions.slice(0, 1).map((q) => q.id),
                        },
                      });
                    } catch (error) {
                      console.error('Failed to persist progress reset:', error);
                    }
                  }

                  toast.success('Progress reset. Starting from the beginning.');
                }
              }}
            >
              Restart Practice
            </Button>
            <Button
              onClick={() =>
                navigate({
                  to: '/chapter/$subject/$chapterId/category',
                  params: { subject: subject!, chapterId: chapterId! },
                })
              }
            >
              Go Back
            </Button>
          </div>
        </div>
      </MobilePage>
    );
  }

  const currentAnswer = answers.get(safeCurrentIndex);
  const progress = ((safeCurrentIndex + 1) / questions.length) * 100;
  const answeredCount = answers.size;

  const handleOptionSelect = (option: string) => {
    const elapsed = elapsedMicroseconds;
    const newAnswer: QuestionAnswer = {
      questionId: currentQuestion.id,
      selectedOption: option,
      timeTaken: elapsed,
    };

    const newAnswers = new Map(answers);
    newAnswers.set(safeCurrentIndex, newAnswer);
    setAnswers(newAnswers);

    if (!isAuthenticated && subject && chapterId && category) {
      const answersObj: Record<string, StoredAnswer> = {};
      newAnswers.forEach((ans) => {
        answersObj[ans.questionId.toString()] = {
          selectedOption: ans.selectedOption || '',
          timeTaken: Number(ans.timeTaken),
        };
      });
      const yearStr = yearNumber !== undefined ? yearNumber.toString() : undefined;
      saveLocalProgress(subject, chapterId, category, safeCurrentIndex, answersObj, yearStr);
    }
  };

  const handleNext = async () => {
    if (safeCurrentIndex < questions.length - 1) {
      const nextIndex = safeCurrentIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      reset();
      start();

      if (isAuthenticated && actor && progressKey) {
        try {
          await savePracticeProgressMutation.mutateAsync({
            key: progressKey,
            progress: {
              lastQuestionIndex: BigInt(nextIndex + 1),
              discoveredQuestionIds: questions.slice(0, nextIndex + 1).map((q) => q.id),
            },
          });
        } catch (error) {
          console.error('Failed to save progress:', error);
        }
      } else if (subject && chapterId && category) {
        const answersObj: Record<string, StoredAnswer> = {};
        answers.forEach((ans) => {
          answersObj[ans.questionId.toString()] = {
            selectedOption: ans.selectedOption || '',
            timeTaken: Number(ans.timeTaken),
          };
        });
        const yearStr = yearNumber !== undefined ? yearNumber.toString() : undefined;
        saveLocalProgress(subject, chapterId, category, nextIndex, answersObj, yearStr);
      }
    }
  };

  const handlePrevious = () => {
    if (safeCurrentIndex > 0) {
      setCurrentQuestionIndex(safeCurrentIndex - 1);
      reset();
      start();
    }
  };

  const handleQuestionNavigate = (index: number) => {
    setCurrentQuestionIndex(index);
    reset();
    start();
  };

  const handleSubmit = async () => {
    if (answers.size === 0) {
      toast.error('Please answer at least one question before submitting');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Please log in to submit your test');
      return;
    }

    if (!chapterIdBigInt || !subject) {
      toast.error('Invalid session parameters');
      return;
    }

    setIsSubmitting(true);
    stop();

    try {
      const attempts: QuestionAttempt[] = Array.from(answers.values()).map((answer) => {
        const question = questions.find((q) => q.id === answer.questionId);
        if (!question) {
          throw new Error(`Question with ID ${answer.questionId} not found`);
        }
        return {
          questionId: answer.questionId,
          chosenOption: answer.selectedOption || '',
          isCorrect: answer.selectedOption === question.correctOption,
          timeTaken: answer.timeTaken,
        };
      });

      const resultId = await submitTestResult.mutateAsync({
        subject: subject,
        chapterId: chapterIdBigInt,
        attempts,
      });

      toast.success('Test submitted successfully!');
      navigate({ to: '/results/$resultId', params: { resultId: resultId.toString() } });
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit test');
      setIsSubmitting(false);
      start();
    }
  };

  return (
    <MobilePage maxWidth="xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              navigate({
                to: '/chapter/$subject/$chapterId/category',
                params: { subject: subject, chapterId },
              })
            }
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {answeredCount}/{questions.length} answered
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>

        <QuestionNavigator
          totalQuestions={questions.length}
          currentIndex={safeCurrentIndex}
          answeredQuestions={new Set(Array.from(answers.keys()))}
          onNavigate={handleQuestionNavigate}
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Question {safeCurrentIndex + 1} of {questions.length}
              </CardTitle>
              {currentQuestion.year && (
                <Badge variant="outline">Year: {currentQuestion.year.toString()}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-lg whitespace-pre-wrap">{currentQuestion.questionText}</p>

            {currentQuestion.questionImage && (
              <div className="flex justify-center">
                <img
                  src={currentQuestion.questionImage.getDirectURL()}
                  alt="Question diagram"
                  className="max-w-full h-auto rounded-lg border"
                />
              </div>
            )}

            <div className="space-y-3">
              {['A', 'B', 'C', 'D'].map((option) => {
                const optionKey = `option${option}` as keyof Question;
                const optionText = currentQuestion[optionKey] as string;
                const isSelected = currentAnswer?.selectedOption === option;

                return (
                  <button
                    key={option}
                    onClick={() => handleOptionSelect(option)}
                    className={`w-full p-4 text-left border-2 rounded-lg transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {option}
                      </div>
                      <span className="flex-1 pt-1">{optionText}</span>
                      {isSelected && <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-1" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" onClick={handlePrevious} disabled={safeCurrentIndex === 0}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {safeCurrentIndex === questions.length - 1 ? (
            <Button onClick={handleSubmit} disabled={isSubmitting || !isAuthenticated} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Test'
              )}
            </Button>
          ) : (
            <Button onClick={handleNext} className="flex-1">
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>

        {!isAuthenticated && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You're practicing as a guest. Log in to save your progress and submit your test results.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </MobilePage>
  );
}
