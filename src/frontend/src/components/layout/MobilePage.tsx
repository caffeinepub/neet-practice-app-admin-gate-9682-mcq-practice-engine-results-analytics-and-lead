import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobilePageProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export default function MobilePage({ children, className, maxWidth = 'lg' }: MobilePageProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full',
  };

  return (
    <div className={cn('container mx-auto px-4 py-6 md:py-8', maxWidthClasses[maxWidth], className)}>
      {children}
    </div>
  );
}
