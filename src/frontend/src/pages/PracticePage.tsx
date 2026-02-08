import { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useActor } from '../hooks/useActor';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import {
  useGetQuestionsForChapter,
  useGetQuestionsForYear,
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
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Subject, Category, QuestionAttempt, Question, PracticeProgressKey } from '../backend';
import { loadPracticeProgress, savePracticeProgress as saveLocalProgress, StoredAnswer } from '../utils/practiceProgressStorage';

interface PracticeSearchParams {
  subject: Subject;
  chapterId: string;
  category: Category;
  year?: string;
}

interface QuestionAnswer {
  questionId: bigint;
  selectedOption: string | null;
  timeTaken: bigint;
}

export default function PracticePage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as PracticeSearchParams;
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  const { subject, chapterId, category, year } = search;
  const chapterIdBigInt = chapterId ? BigInt(chapterId) : null;
  const yearBigInt = year ? BigInt(year) : undefined;

  const isPYQ = category === 'neetPYQ' || category === 'jeePYQ';
  const isYearFiltered = isPYQ && yearBigInt !== undefined;

  const { data: chapterQuestions, isLoading: chapterQuestionsLoading } = useGetQuestionsForChapter(
    !isYearFiltered ? chapterIdBigInt : null
  );
  const { data: yearQuestions, isLoading: yearQuestionsLoading } = useGetQuestionsForYear(
    isYearFiltered ? yearBigInt! : null,
    isYearFiltered ? category : ('level1' as Category)
  );

  const isLoading = isYearFiltered ? yearQuestionsLoading : chapterQuestionsLoading;
  const allQuestions = isYearFiltered ? yearQuestions : chapterQuestions;

  const questions = allQuestions?.filter((q) => q.category === category) || [];

  const progressKey: PracticeProgressKey = {
    subject,
    chapterId: chapterIdBigInt!,
    category,
    year: yearBigInt,
  };

  const { data: serverProgress, isLoading: progressLoading } = useGetOrCreatePracticeProgress(
    progressKey,
    BigInt(questions.length)
  );
  const savePracticeProgressMutation = useSavePracticeProgress();
  const submitTestResult = useSubmitTestResult();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, QuestionAnswer>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { elapsedMicroseconds, isRunning, start, stop, reset } = usePracticeTimer();

  const isAuthenticated = !!identity;

  useEffect(() => {
    if (!isLoading && questions.length > 0 && !progressLoading) {
      let startIndex = 0;
      let loadedAnswers = new Map<number, QuestionAnswer>();

      if (isAuthenticated && serverProgress) {
        startIndex = Number(serverProgress.lastQuestionIndex) - 1;
        if (startIndex < 0) startIndex = 0;
        if (startIndex >= questions.length) startIndex = questions.length - 1;
      } else {
        const localProgress = loadPracticeProgress(subject, chapterId, category, year);
        if (localProgress) {
          startIndex = localProgress.lastQuestionIndex;
          if (startIndex < 0) startIndex = 0;
          if (startIndex >= questions.length) startIndex = questions.length - 1;

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

      setCurrentQuestionIndex(startIndex);
      setAnswers(loadedAnswers);
      start();
    }
  }, [isLoading, questions.length, progressLoading, serverProgress, isAuthenticated, subject, chapterId, category, year]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

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
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/subject' })}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No questions available for this selection.</AlertDescription>
          </Alert>
        </div>
      </MobilePage>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers.get(currentQuestionIndex);
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const answeredCount = answers.size;

  const handleOptionSelect = (option: string) => {
    const elapsed = elapsedMicroseconds;
    const newAnswer: QuestionAnswer = {
      questionId: currentQuestion.id,
      selectedOption: option,
      timeTaken: elapsed,
    };

    const newAnswers = new Map(answers);
    newAnswers.set(currentQuestionIndex, newAnswer);
    setAnswers(newAnswers);

    if (!isAuthenticated) {
      const answersObj: Record<string, StoredAnswer> = {};
      newAnswers.forEach((ans) => {
        answersObj[ans.questionId.toString()] = {
          selectedOption: ans.selectedOption || '',
          timeTaken: Number(ans.timeTaken),
        };
      });
      saveLocalProgress(subject, chapterId, category, currentQuestionIndex, answersObj, year);
    }
  };

  const handleNext = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      reset();
      start();

      if (isAuthenticated && actor) {
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
      } else {
        const answersObj: Record<string, StoredAnswer> = {};
        answers.forEach((ans) => {
          answersObj[ans.questionId.toString()] = {
            selectedOption: ans.selectedOption || '',
            timeTaken: Number(ans.timeTaken),
          };
        });
        saveLocalProgress(subject, chapterId, category, nextIndex, answersObj, year);
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
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

    setIsSubmitting(true);
    stop();

    try {
      const attempts: QuestionAttempt[] = Array.from(answers.values()).map((answer) => {
        const question = questions.find((q) => q.id === answer.questionId);
        return {
          questionId: answer.questionId,
          chosenOption: answer.selectedOption || '',
          isCorrect: answer.selectedOption === question?.correctOption,
          timeTaken: answer.timeTaken,
        };
      });

      const resultId = await submitTestResult.mutateAsync({
        subject,
        chapterId: chapterIdBigInt!,
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
                params: { subject, chapterId },
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
          currentIndex={currentQuestionIndex}
          answeredQuestions={new Set(Array.from(answers.keys()))}
          onNavigate={handleQuestionNavigate}
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription>
                Question {currentQuestionIndex + 1} of {questions.length}
              </CardDescription>
              <Badge>{category}</Badge>
            </div>
            <CardTitle className="text-lg whitespace-pre-wrap break-words">{currentQuestion.questionText}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {['A', 'B', 'C', 'D'].map((option) => {
              const optionText = currentQuestion[`option${option}` as keyof Question] as string;
              const isSelected = currentAnswer?.selectedOption === option;

              return (
                <button
                  key={option}
                  onClick={() => handleOptionSelect(option)}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 hover:bg-accent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'
                      }`}
                    >
                      {isSelected && <CheckCircle className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <span className="font-medium">{option}.</span>{' '}
                      <span className="whitespace-pre-wrap break-words">{optionText}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {currentQuestionIndex === questions.length - 1 ? (
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
              You are practicing anonymously. Log in to save your progress and submit your test results.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </MobilePage>
  );
}
