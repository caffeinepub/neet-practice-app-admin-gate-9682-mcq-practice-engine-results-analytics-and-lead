import { useState } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useGetQuestionsForChapter } from '../hooks/useQueries';
import MobilePage from '../components/layout/MobilePage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Target, Award, Trophy, Loader2 } from 'lucide-react';
import { Subject, Category } from '../backend';
import YearSelectDialog from '../components/practice/YearSelectDialog';

export default function ChapterCategorySelectPage() {
  const navigate = useNavigate();
  const { subject, chapterId } = useParams({ from: '/chapter/$subject/$chapterId/category' });
  const { data: questions, isLoading } = useGetQuestionsForChapter(BigInt(chapterId));
  const [yearDialogOpen, setYearDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const subjectNames: Record<Subject, string> = {
    [Subject.physics]: 'Physics',
    [Subject.chemistry]: 'Chemistry',
    [Subject.biology]: 'Biology',
  };

  const categories = [
    {
      id: Category.level1,
      title: 'Level 1',
      description: 'Foundation questions to build your basics',
      icon: Target,
      color: 'bg-blue-500',
    },
    {
      id: Category.neetPYQ,
      title: 'NEET PYQ',
      description: 'Previous year questions from NEET exams',
      icon: Award,
      color: 'bg-green-500',
    },
    {
      id: Category.jeePYQ,
      title: 'JEE PYQ',
      description: 'Previous year questions from JEE exams',
      icon: Trophy,
      color: 'bg-amber-500',
    },
  ];

  const getCategoryQuestionCount = (category: Category) => {
    if (!questions) return 0;
    return questions.filter((q) => q.category === category).length;
  };

  const getAvailableYearsForCategory = (category: Category): number[] => {
    if (!questions) return [];
    const years = questions
      .filter((q) => q.category === category && q.year !== undefined)
      .map((q) => Number(q.year))
      .filter((year) => !isNaN(year) && year >= 2000 && year <= 2025);
    
    // Return unique years in descending order
    return Array.from(new Set(years)).sort((a, b) => b - a);
  };

  const handleCategorySelect = (category: Category) => {
    const count = getCategoryQuestionCount(category);
    if (count === 0) {
      return; // Button will be disabled
    }

    // Check if this is a PYQ category
    if (category === Category.neetPYQ || category === Category.jeePYQ) {
      const years = getAvailableYearsForCategory(category);
      
      if (years.length === 0) {
        // No years available, navigate without year
        navigate({
          to: '/practice/$subject/$chapterId/$category',
          params: { subject: subject as Subject, chapterId, category },
        });
      } else if (years.length === 1) {
        // Only one year, auto-select it
        navigate({
          to: '/practice/$subject/$chapterId/$category',
          params: { subject: subject as Subject, chapterId, category },
          search: { year: years[0] },
        });
      } else {
        // Multiple years, show selection dialog
        setSelectedCategory(category);
        setAvailableYears(years);
        setYearDialogOpen(true);
      }
    } else {
      // Non-PYQ category, navigate directly
      navigate({
        to: '/practice/$subject/$chapterId/$category',
        params: { subject: subject as Subject, chapterId, category },
      });
    }
  };

  const handleYearSelect = (year: number) => {
    if (selectedCategory) {
      navigate({
        to: '/practice/$subject/$chapterId/$category',
        params: { subject: subject as Subject, chapterId, category: selectedCategory },
        search: { year },
      });
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

  return (
    <MobilePage maxWidth="md">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              navigate({
                to: '/chapter/$subject',
                params: { subject: subject as Subject },
              })
            }
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Select Category</h1>
            <p className="text-sm text-muted-foreground">{subjectNames[subject as Subject]}</p>
          </div>
        </div>

        <div className="grid gap-4">
          {categories.map((category) => {
            const Icon = category.icon;
            const questionCount = getCategoryQuestionCount(category.id);
            const isDisabled = questionCount === 0;

            return (
              <Card
                key={category.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => !isDisabled && handleCategorySelect(category.id)}
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className={`${category.color} p-3 rounded-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl">{category.title}</CardTitle>
                      <CardDescription className="mt-1">{category.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {questionCount} {questionCount === 1 ? 'question' : 'questions'} available
                    </span>
                    <Button size="sm" disabled={isDisabled}>
                      {isDisabled ? 'No Questions' : 'Start Practice'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <YearSelectDialog
        open={yearDialogOpen}
        onOpenChange={setYearDialogOpen}
        availableYears={availableYears}
        onYearSelect={handleYearSelect}
        categoryTitle={selectedCategory ? categories.find((c) => c.id === selectedCategory)?.title || '' : ''}
      />
    </MobilePage>
  );
}
