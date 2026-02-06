import { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useGetQuestionsForChapter, useSubmitTestResult } from '../hooks/useQueries';
import { usePracticeTimer } from '../hooks/usePracticeTimer';
import MobilePage from '../components/layout/MobilePage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Subject, QuestionAttempt } from '../backend';
import { cn } from '@/lib/utils';

export default function PracticePage() {
  const navigate = useNavigate();
  const { subject, chapterId } = useParams({ from: '/practice/$subject/$chapterId' });
  const { data: questions, isLoading } = useGetQuestionsForChapter(BigInt(chapterId));
  const submitResult = useSubmitTestResult();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<QuestionAttempt[]>([]);
  const timer = usePracticeTimer();

  const currentQuestion = questions?.[currentIndex];
  const totalQuestions = questions?.length || 0;
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

  useEffect(() => {
    if (questions && questions.length > 0) {
      timer.start();
    }
  }, [questions]);

  useEffect(() => {
    if (currentQuestion) {
      setSelectedOption(null);
      timer.reset();
      timer.start();
    }
  }, [currentIndex]);

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
  };

  const handleNext = () => {
    if (!currentQuestion || !selectedOption) {
      toast.error('Please select an option');
      return;
    }

    timer.stop();

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
      navigate({ to: '/results/$resultId', params: { resultId: resultId.toString() } });
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit test');
    }
  };

  if (isLoading) {
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
            <p className="text-muted-foreground">No questions available for this chapter</p>
            <Button className="mt-4" onClick={() => navigate({ to: '/subject' })}>
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

  return (
    <MobilePage maxWidth="lg">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/subject' })}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{timer.elapsedSeconds}s</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg leading-relaxed">{currentQuestion?.questionText}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleOptionSelect(option.value)}
                className={cn(
                  'w-full text-left p-4 rounded-lg border-2 transition-all',
                  'hover:border-primary hover:bg-primary/5',
                  selectedOption === option.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center font-semibold flex-shrink-0',
                      selectedOption === option.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {option.label}
                  </div>
                  <p className="flex-1 pt-1">{option.text}</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Button
          onClick={handleNext}
          disabled={!selectedOption || submitResult.isPending}
          className="w-full"
          size="lg"
        >
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
      </div>
    </MobilePage>
  );
}
