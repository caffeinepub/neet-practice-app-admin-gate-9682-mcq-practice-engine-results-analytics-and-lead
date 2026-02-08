import { useState } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useGetQuestionsByChapterAndCategory } from '../hooks/useQueries';
import MobilePage from '../components/layout/MobilePage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Target, Award, Trophy, Loader2 } from 'lucide-react';
import { Subject, Category } from '../backend';
import YearSelectDialog from '../components/practice/YearSelectDialog';

export default function ChapterCategorySelectPage() {
  const navigate = useNavigate();
  const { subject, chapterId } = useParams({ from: '/chapter/$subject/$chapterId/category' });
  const chapterIdBigInt = BigInt(chapterId);

  const { data: level1Questions, isLoading: level1Loading } = useGetQuestionsByChapterAndCategory(
    chapterIdBigInt,
    Category.level1
  );
  const { data: neetPYQQuestions, isLoading: neetLoading } = useGetQuestionsByChapterAndCategory(
    chapterIdBigInt,
    Category.neetPYQ
  );
  const { data: jeePYQQuestions, isLoading: jeeLoading } = useGetQuestionsByChapterAndCategory(
    chapterIdBigInt,
    Category.jeePYQ
  );

  const [yearDialogOpen, setYearDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const isLoading = level1Loading || neetLoading || jeeLoading;

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
      questions: level1Questions,
    },
    {
      id: Category.neetPYQ,
      title: 'NEET PYQ',
      description: 'Previous year questions from NEET exams',
      icon: Award,
      color: 'bg-green-500',
      questions: neetPYQQuestions,
    },
    {
      id: Category.jeePYQ,
      title: 'JEE PYQ',
      description: 'Previous year questions from JEE exams',
      icon: Trophy,
      color: 'bg-amber-500',
      questions: jeePYQQuestions,
    },
  ];

  const getCategoryQuestionCount = (category: Category) => {
    const categoryData = categories.find((c) => c.id === category);
    return categoryData?.questions?.length || 0;
  };

  const getAvailableYearsForCategory = (category: Category): number[] => {
    const categoryData = categories.find((c) => c.id === category);
    if (!categoryData?.questions) return [];

    const years = categoryData.questions
      .filter((q) => q.year != null)
      .map((q) => Number(q.year))
      .filter((year) => !isNaN(year) && year >= 2000 && year <= 2025);

    return Array.from(new Set(years)).sort((a, b) => b - a);
  };

  const handleCategorySelect = (category: Category) => {
    const count = getCategoryQuestionCount(category);
    if (count === 0) {
      return;
    }

    if (category === Category.neetPYQ || category === Category.jeePYQ) {
      const years = getAvailableYearsForCategory(category);

      if (years.length === 0) {
        navigate({
          to: '/practice/$subject/$chapterId/$category',
          params: { subject: subject as Subject, chapterId, category },
        });
      } else if (years.length === 1) {
        navigate({
          to: '/practice/$subject/$chapterId/$category',
          params: { subject: subject as Subject, chapterId, category },
          search: { year: years[0] },
        });
      } else {
        setSelectedCategory(category);
        setAvailableYears(years);
        setYearDialogOpen(true);
      }
    } else {
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
            const count = getCategoryQuestionCount(category.id);
            const isDisabled = count === 0;

            return (
              <Card
                key={category.id}
                className={`transition-all ${
                  isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg hover:scale-[1.02]'
                }`}
                onClick={() => !isDisabled && handleCategorySelect(category.id)}
              >
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${category.color}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle>{category.title}</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {count} {count === 1 ? 'question' : 'questions'} available
                    </span>
                    {!isDisabled && (
                      <Button variant="ghost" size="sm">
                        Start Practice →
                      </Button>
                    )}
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
        categoryTitle={selectedCategory ? categoryLabels[selectedCategory] : ''}
        onYearSelect={handleYearSelect}
      />
    </MobilePage>
  );
}

const categoryLabels: Record<Category, string> = {
  [Category.level1]: 'Level 1',
  [Category.neetPYQ]: 'NEET PYQ',
  [Category.jeePYQ]: 'JEE PYQ',
};
