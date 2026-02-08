import { useNavigate, useParams } from '@tanstack/react-router';
import { useGetChaptersBySubject } from '../hooks/useQueries';
import MobilePage from '../components/layout/MobilePage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Loader2 } from 'lucide-react';
import { Subject } from '../backend';

export default function ChapterSelectPage() {
  const navigate = useNavigate();
  const { subject } = useParams({ from: '/chapter/$subject' });
  const { data: chapters, isLoading } = useGetChaptersBySubject(subject as Subject);

  const subjectNames: Record<Subject, string> = {
    [Subject.physics]: 'Physics',
    [Subject.chemistry]: 'Chemistry',
    [Subject.biology]: 'Biology',
  };

  return (
    <MobilePage maxWidth="md">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/subject' })}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{subjectNames[subject as Subject]}</h1>
            <p className="text-muted-foreground">Select a chapter to practice</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : chapters && chapters.length > 0 ? (
          <div className="grid gap-4">
            {chapters.map((chapter) => (
              <Card
                key={chapter.id.toString()}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() =>
                  navigate({
                    to: '/chapter/$subject/$chapterId/category',
                    params: { subject: subject as Subject, chapterId: chapter.id.toString() },
                  })
                }
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{chapter.title}</CardTitle>
                      <CardDescription className="line-clamp-1">{chapter.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">Select Chapter</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No chapters available yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Chapters will appear here once they are added by an admin
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MobilePage>
  );
}
