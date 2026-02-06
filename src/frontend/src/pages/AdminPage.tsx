import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useIsCallerAdmin } from '../hooks/useAuthz';
import { useActor } from '../hooks/useActor';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import {
  useListChapters,
  useListQuestions,
  useCreateChapter,
  useCreateQuestion,
  useDeleteChapter,
  useDeleteQuestion,
} from '../hooks/useQueries';
import MobilePage from '../components/layout/MobilePage';
import AdminGateCard from '../components/admin/AdminGateCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Plus, Trash2, BookOpen, HelpCircle, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Subject } from '../backend';

export default function AdminPage() {
  const navigate = useNavigate();
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  const { data: isAdmin, isLoading: adminLoading, isFetched: adminFetched } = useIsCallerAdmin();
  const { data: chapters, isLoading: chaptersLoading } = useListChapters();
  const { data: questions, isLoading: questionsLoading } = useListQuestions();

  const createChapter = useCreateChapter();
  const createQuestion = useCreateQuestion();
  const deleteChapter = useDeleteChapter();
  const deleteQuestion = useDeleteQuestion();

  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);

  const [chapterForm, setChapterForm] = useState({
    subject: Subject.physics,
    title: '',
    description: '',
  });

  const [questionForm, setQuestionForm] = useState({
    subject: Subject.physics,
    chapterId: '',
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A',
    explanation: '',
  });

  const isActorReady = !!actor && !actorFetching;
  const isLoggedIn = !!identity;

  // Show loading state while actor is initializing
  if (!isActorReady || adminLoading) {
    return (
      <MobilePage>
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">
            {!isActorReady ? 'Connecting to the canister...' : 'Checking admin status...'}
          </p>
        </div>
      </MobilePage>
    );
  }

  // Show login prompt for anonymous users
  if (!isLoggedIn) {
    return (
      <MobilePage maxWidth="md">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Admin Access Required</h1>
              <p className="text-muted-foreground">Log in to continue</p>
            </div>
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please log in using the login button in the header before accessing admin mode.
            </AlertDescription>
          </Alert>
        </div>
      </MobilePage>
    );
  }

  // Show admin gate if not admin
  if (!isAdmin) {
    return (
      <MobilePage maxWidth="md">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Admin Access Required</h1>
              <p className="text-muted-foreground">Enter the password to continue</p>
            </div>
          </div>
          <AdminGateCard />
        </div>
      </MobilePage>
    );
  }

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createChapter.mutateAsync(chapterForm);
      toast.success('Chapter created successfully');
      setChapterDialogOpen(false);
      setChapterForm({ subject: Subject.physics, title: '', description: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to create chapter');
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createQuestion.mutateAsync({
        ...questionForm,
        chapterId: BigInt(questionForm.chapterId),
      });
      toast.success('Question created successfully');
      setQuestionDialogOpen(false);
      setQuestionForm({
        subject: Subject.physics,
        chapterId: '',
        questionText: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctOption: 'A',
        explanation: '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to create question');
    }
  };

  const handleDeleteChapter = async (id: bigint) => {
    if (!confirm('Are you sure you want to delete this chapter?')) return;
    try {
      await deleteChapter.mutateAsync(id);
      toast.success('Chapter deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete chapter');
    }
  };

  const handleDeleteQuestion = async (id: bigint) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await deleteQuestion.mutateAsync(id);
      toast.success('Question deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete question');
    }
  };

  return (
    <MobilePage maxWidth="xl">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Manage chapters and questions</p>
          </div>
        </div>

        <Tabs defaultValue="chapters" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chapters">Chapters</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
          </TabsList>

          <TabsContent value="chapters" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Chapters ({chapters?.length || 0})</h2>
              <Dialog open={chapterDialogOpen} onOpenChange={setChapterDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Chapter
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Chapter</DialogTitle>
                    <DialogDescription>Add a new chapter for students to practice</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateChapter} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Select
                        value={chapterForm.subject}
                        onValueChange={(value) => setChapterForm({ ...chapterForm, subject: value as Subject })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={Subject.physics}>Physics</SelectItem>
                          <SelectItem value={Subject.chemistry}>Chemistry</SelectItem>
                          <SelectItem value={Subject.biology}>Biology</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={chapterForm.title}
                        onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                        placeholder="e.g., Newton's Laws of Motion"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={chapterForm.description}
                        onChange={(e) => setChapterForm({ ...chapterForm, description: e.target.value })}
                        placeholder="Brief description of the chapter"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={createChapter.isPending}>
                      {createChapter.isPending ? 'Creating...' : 'Create Chapter'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {chaptersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : chapters && chapters.length > 0 ? (
              <div className="grid gap-4">
                {chapters.map((chapter) => (
                  <Card key={chapter.id.toString()}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{chapter.title}</CardTitle>
                          <CardDescription>{chapter.description}</CardDescription>
                          <p className="text-xs text-muted-foreground mt-2 capitalize">{chapter.subject}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteChapter(chapter.id)}
                          disabled={deleteChapter.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No chapters yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="questions" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Questions ({questions?.length || 0})</h2>
              <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Question
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Question</DialogTitle>
                    <DialogDescription>Add a new MCQ question</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateQuestion} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Subject</Label>
                        <Select
                          value={questionForm.subject}
                          onValueChange={(value) => setQuestionForm({ ...questionForm, subject: value as Subject })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={Subject.physics}>Physics</SelectItem>
                            <SelectItem value={Subject.chemistry}>Chemistry</SelectItem>
                            <SelectItem value={Subject.biology}>Biology</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Chapter</Label>
                        <Select
                          value={questionForm.chapterId}
                          onValueChange={(value) => setQuestionForm({ ...questionForm, chapterId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select chapter" />
                          </SelectTrigger>
                          <SelectContent>
                            {chapters
                              ?.filter((c) => c.subject === questionForm.subject)
                              .map((chapter) => (
                                <SelectItem key={chapter.id.toString()} value={chapter.id.toString()}>
                                  {chapter.title}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Question</Label>
                      <Textarea
                        value={questionForm.questionText}
                        onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                        placeholder="Enter the question"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Option A</Label>
                      <Input
                        value={questionForm.optionA}
                        onChange={(e) => setQuestionForm({ ...questionForm, optionA: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Option B</Label>
                      <Input
                        value={questionForm.optionB}
                        onChange={(e) => setQuestionForm({ ...questionForm, optionB: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Option C</Label>
                      <Input
                        value={questionForm.optionC}
                        onChange={(e) => setQuestionForm({ ...questionForm, optionC: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Option D</Label>
                      <Input
                        value={questionForm.optionD}
                        onChange={(e) => setQuestionForm({ ...questionForm, optionD: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Correct Option</Label>
                      <Select
                        value={questionForm.correctOption}
                        onValueChange={(value) => setQuestionForm({ ...questionForm, correctOption: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                          <SelectItem value="D">D</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Explanation</Label>
                      <Textarea
                        value={questionForm.explanation}
                        onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                        placeholder="Explain why this is the correct answer"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={createQuestion.isPending}>
                      {createQuestion.isPending ? 'Creating...' : 'Create Question'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {questionsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : questions && questions.length > 0 ? (
              <div className="grid gap-4">
                {questions.map((question) => (
                  <Card key={question.id.toString()}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base mb-2">{question.questionText}</CardTitle>
                          <div className="space-y-1 text-sm">
                            <p className={question.correctOption === 'A' ? 'text-success font-medium' : ''}>
                              A: {question.optionA}
                            </p>
                            <p className={question.correctOption === 'B' ? 'text-success font-medium' : ''}>
                              B: {question.optionB}
                            </p>
                            <p className={question.correctOption === 'C' ? 'text-success font-medium' : ''}>
                              C: {question.optionC}
                            </p>
                            <p className={question.correctOption === 'D' ? 'text-success font-medium' : ''}>
                              D: {question.optionD}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Chapter ID: {question.chapterId.toString()} • {question.subject}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteQuestion(question.id)}
                          disabled={deleteQuestion.isPending}
                          className="shrink-0"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No questions yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MobilePage>
  );
}
