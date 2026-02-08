import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface QuestionNavigatorProps {
  totalQuestions: number;
  currentIndex: number;
  onNavigate: (index: number) => void;
  disabled?: boolean;
  className?: string;
  answeredQuestions?: Set<number>; // Track which questions have been answered
}

export default function QuestionNavigator({
  totalQuestions,
  currentIndex,
  onNavigate,
  disabled = false,
  className,
  answeredQuestions,
}: QuestionNavigatorProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {Array.from({ length: totalQuestions }, (_, i) => {
        const isAnswered = answeredQuestions?.has(i);
        const isCurrent = i === currentIndex;
        
        return (
          <Button
            key={i}
            variant={isCurrent ? 'default' : 'outline'}
            size="sm"
            onClick={() => onNavigate(i)}
            disabled={disabled}
            className={cn(
              'w-10 h-10 p-0 font-semibold transition-all relative',
              isCurrent && 'ring-2 ring-primary ring-offset-2',
              isAnswered && !isCurrent && 'border-green-500 bg-green-50 dark:bg-green-950'
            )}
          >
            {i + 1}
            {isAnswered && !isCurrent && (
              <CheckCircle2 className="w-3 h-3 text-green-600 absolute -top-1 -right-1" />
            )}
          </Button>
        );
      })}
    </div>
  );
}
