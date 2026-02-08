import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuestionNavigatorProps {
  totalQuestions: number;
  currentIndex: number;
  onNavigate: (index: number) => void;
  disabled?: boolean;
  className?: string;
}

export default function QuestionNavigator({
  totalQuestions,
  currentIndex,
  onNavigate,
  disabled = false,
  className,
}: QuestionNavigatorProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {Array.from({ length: totalQuestions }, (_, i) => (
        <Button
          key={i}
          variant={i === currentIndex ? 'default' : 'outline'}
          size="sm"
          onClick={() => onNavigate(i)}
          disabled={disabled}
          className={cn(
            'w-10 h-10 p-0 font-semibold transition-all',
            i === currentIndex && 'ring-2 ring-primary ring-offset-2'
          )}
        >
          {i + 1}
        </Button>
      ))}
    </div>
  );
}
