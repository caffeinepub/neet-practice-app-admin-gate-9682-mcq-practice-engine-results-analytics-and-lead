import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useHasContributorAccess } from '../hooks/useAuthz';
import { useActor } from '../hooks/useActor';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import {
  useListChapters,
  useGetQuestionsForChapter,
  useCreateQuestion,
  useUpdateQuestion,
  useCreateChapter,
  useUpdateChapter,
  useGetTotalAuthenticatedUsers,
} from '../hooks/useQueries';
import MobilePage from '../components/layout/MobilePage';
import ContributorGateCard from '../components/contributor/ContributorGateCard';
import CanisterConnectionTimeoutCard from '../components/contributor/CanisterConnectionTimeoutCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Edit, HelpCircle, Loader2, AlertCircle, Users, BookPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Subject, Category } from '../backend';

const categoryLabels: Record<Category, string> = {
  [Category.level1]: 'Level 1',
  [Category.neetPYQ]: 'NEET PYQ',
  [Category.jeePYQ]: 'JEE PYQ',
};

const CONNECTION_TIMEOUT_MS = 15000; // 15 seconds

export default function ContributorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  const { data: hasAccess, isLoading: accessLoading } = useHasContributorAccess();
  
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  
  // Timeout state management
  const [connectionTimedOut, setConnectionTimedOut] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Only fetch chapters when user has contributor access
  const { data: chapters, isLoading: chaptersLoading } = useListChapters(hasAccess);
  const { data: questions, isLoading: questionsLoading } = useGetQuestionsForChapter(
    selectedChapterId ? BigInt(selectedChapterId) : null
  );
  const { data: totalUsers, isLoading: totalUsersLoading } = useGetTotalAuthenticatedUsers();

  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const createChapter = useCreateChapter();
  const updateChapter = useUpdateChapter();

  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);

  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<any>(null);

  const [createChapterDialogOpen, setCreateChapterDialogOpen] = useState(false);
  const [createChapterError, setCreateChapterError] = useState<string | null>(null);

  const [questionForm, setQuestionForm] = useState({
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A',
    explanation: '',
    category: Category.level1,
  });

  const [chapterForm, setChapterForm] = useState({
    title: '',
    description: '',
    sequence: '',
  });

  const [newChapterForm, setNewChapterForm] = useState({
    title: '',
    description: '',
    sequence: '',
  });

  const isActorReady = !!actor && !actorFetching;
  const isLoggedIn = !!identity;

  // Timeout effect: start timer when actor is not ready
  useEffect(() => {
    if (!isActorReady && !connectionTimedOut) {
      const timeoutId = setTimeout(() => {
        setConnectionTimedOut(true);
      }, CONNECTION_TIMEOUT_MS);

      return () => clearTimeout(timeoutId);
    }
  }, [isActorReady, connectionTimedOut]);

  // Reset timeout when actor becomes ready
  useEffect(() => {
    if (isActorReady) {
      setConnectionTimedOut(false);
      setIsRetrying(false);
    }
  }, [isActorReady]);

  const handleRetry = async () => {
    setIsRetrying(true);
    setConnectionTimedOut(false);
    
    // Invalidate all queries to trigger a fresh fetch
    await queryClient.invalidateQueries();
    
    // Reset timeout after a brief delay
    setTimeout(() => {
      if (!isActorReady) {
        setIsRetrying(false);
      }
    }, 2000);
  };

  // Show timeout recovery UI if connection takes too long
  if (connectionTimedOut && !isActorReady) {
    return (
      <MobilePage>
        <div className="flex flex-col items-center justify-center py-12">
          <CanisterConnectionTimeoutCard
            onRetry={handleRetry}
            isRetrying={isRetrying}
          />
        </div>
      </MobilePage>
    );
  }

  // Show loading state while actor is initializing
  if (!isActorReady || accessLoading) {
    return (
      <MobilePage>
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">
            {!isActorReady ? 'Connecting to the canister...' : 'Checking contributor access...'}
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
              <h1 className="text-2xl font-bold">Contributor Access Required</h1>
              <p className="text-muted-foreground">Log in to continue</p>
            </div>
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please log in using the login button in the header before accessing contributor mode.
            </AlertDescription>
          </Alert>
        </div>
      </MobilePage>
    );
  }

  // Show contributor gate if not unlocked
  if (!hasAccess) {
    return (
      <MobilePage maxWidth="md">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Contributor Access Required</h1>
              <p className="text-muted-foreground">Enter the password to continue</p>
            </div>
          </div>
          <ContributorGateCard />
        </div>
      </MobilePage>
    );
  }

  const filteredChapters = selectedSubject
    ? chapters?.filter((c) => c.subject === selectedSubject) || []
    : [];

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject || !selectedChapterId) {
      toast.error('Please select a subject and chapter');
      return;
    }
    try {
      await createQuestion.mutateAsync({
        subject: selectedSubject,
        chapterId: BigInt(selectedChapterId),
        ...questionForm,
      });
      toast.success('Question created successfully');
      setQuestionDialogOpen(false);
      resetQuestionForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create question');
    }
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    try {
      await updateQuestion.mutateAsync({
        id: editingQuestion.id,
        ...questionForm,
      });
      toast.success('Question updated successfully');
      setQuestionDialogOpen(false);
      setEditingQuestion(null);
      resetQuestionForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update question');
    }
  };

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) {
      toast.error('Please select a subject first');
      return;
    }
    
    const sequenceNum = parseInt(newChapterForm.sequence, 10);
    if (isNaN(sequenceNum) || sequenceNum < 0) {
      setCreateChapterError('Please enter a valid sequence number (0 or greater)');
      return;
    }

    setCreateChapterError(null);
    try {
      const newChapterId = await createChapter.mutateAsync({
        subject: selectedSubject,
        title: newChapterForm.title,
        description: newChapterForm.description,
        sequence: BigInt(sequenceNum),
      });
      toast.success('Chapter created successfully');
      setCreateChapterDialogOpen(false);
      resetNewChapterForm();
      // Auto-select the newly created chapter
      setSelectedChapterId(newChapterId.toString());
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to create chapter';
      setCreateChapterError(errorMessage);
      // Don't close the dialog on error
    }
  };

  const handleUpdateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChapter) return;

    const sequenceNum = parseInt(chapterForm.sequence, 10);
    if (isNaN(sequenceNum) || sequenceNum < 0) {
      toast.error('Please enter a valid sequence number (0 or greater)');
      return;
    }

    try {
      await updateChapter.mutateAsync({
        id: editingChapter.id,
        title: chapterForm.title,
        description: chapterForm.description,
        sequence: BigInt(sequenceNum),
      });
      toast.success('Chapter updated successfully');
      setChapterDialogOpen(false);
      setEditingChapter(null);
      resetChapterForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update chapter');
    }
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      questionText: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctOption: 'A',
      explanation: '',
      category: Category.level1,
    });
  };

  const resetChapterForm = () => {
    setChapterForm({
      title: '',
      description: '',
      sequence: '',
    });
  };

  const resetNewChapterForm = () => {
    setNewChapterForm({
      title: '',
      description: '',
      sequence: '',
    });
  };

  const openEditDialog = (question: any) => {
    setEditingQuestion(question);
    setQuestionForm({
      questionText: question.questionText,
      optionA: question.optionA,
      optionB: question.optionB,
      optionC: question.optionC,
      optionD: question.optionD,
      correctOption: question.correctOption,
      explanation: question.explanation,
      category: question.category,
    });
    setQuestionDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingQuestion(null);
    resetQuestionForm();
    setQuestionDialogOpen(true);
  };

  const openEditChapterDialog = (chapter: any) => {
    setEditingChapter(chapter);
    setChapterForm({
      title: chapter.title,
      description: chapter.description,
      sequence: chapter.sequence.toString(),
    });
    setChapterDialogOpen(true);
  };

  const openCreateChapterDialog = () => {
    resetNewChapterForm();
    setCreateChapterError(null);
    setCreateChapterDialogOpen(true);
  };

  return (
    <MobilePage maxWidth="xl">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Contributor Panel</h1>
            <p className="text-muted-foreground">Add and edit questions</p>
          </div>
        </div>

        {/* Total Students Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total students logged in</p>
                <p className="text-2xl font-bold">
                  {totalUsersLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin inline" />
                  ) : (
                    totalUsers?.toString() || '0'
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Select Subject & Chapter</CardTitle>
            <CardDescription>Choose where to add or edit questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select
                value={selectedSubject || ''}
                onValueChange={(value) => {
                  setSelectedSubject(value as Subject);
                  setSelectedChapterId(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Subject.physics}>Physics</SelectItem>
                  <SelectItem value={Subject.chemistry}>Chemistry</SelectItem>
                  <SelectItem value={Subject.biology}>Biology</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedSubject && (
              <div className="space-y-2">
                <Label>Chapter</Label>
                <Select
                  value={selectedChapterId || ''}
                  onValueChange={setSelectedChapterId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a chapter" />
                  </SelectTrigger>
                  <SelectContent>
                    {chaptersLoading ? (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        Loading chapters...
                      </div>
                    ) : filteredChapters.length > 0 ? (
                      filteredChapters.map((chapter) => (
                        <SelectItem key={chapter.id.toString()} value={chapter.id.toString()}>
                          {chapter.title}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        No chapters available
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chapters List for Editing and Creating */}
        {selectedSubject && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Chapters in {selectedSubject}</CardTitle>
                  <CardDescription>Create new chapters or edit existing ones</CardDescription>
                </div>
                <Dialog open={createChapterDialogOpen} onOpenChange={setCreateChapterDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={openCreateChapterDialog} size="sm">
                      <BookPlus className="w-4 h-4 mr-2" />
                      Create Chapter
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Create New Chapter</DialogTitle>
                      <DialogDescription>
                        Add a new chapter to {selectedSubject}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateChapter} className="space-y-4">
                      {createChapterError && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{createChapterError}</AlertDescription>
                        </Alert>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="newChapterTitle">Chapter Title *</Label>
                        <Input
                          id="newChapterTitle"
                          value={newChapterForm.title}
                          onChange={(e) => {
                            setNewChapterForm({ ...newChapterForm, title: e.target.value });
                            setCreateChapterError(null);
                          }}
                          required
                          placeholder="e.g., Newton's Laws of Motion"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newChapterDescription">Description *</Label>
                        <Textarea
                          id="newChapterDescription"
                          value={newChapterForm.description}
                          onChange={(e) => {
                            setNewChapterForm({ ...newChapterForm, description: e.target.value });
                            setCreateChapterError(null);
                          }}
                          required
                          rows={3}
                          placeholder="Brief description of the chapter content"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newChapterSequence">Sequence Number *</Label>
                        <Input
                          id="newChapterSequence"
                          type="number"
                          min="0"
                          value={newChapterForm.sequence}
                          onChange={(e) => {
                            setNewChapterForm({ ...newChapterForm, sequence: e.target.value });
                            setCreateChapterError(null);
                          }}
                          required
                          placeholder="e.g., 1, 2, 3..."
                        />
                        <p className="text-xs text-muted-foreground">
                          Chapters are displayed in sequence order (lowest first)
                        </p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCreateChapterDialogOpen(false)}
                          disabled={createChapter.isPending}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createChapter.isPending}>
                          {createChapter.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create Chapter'
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {chaptersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredChapters.length > 0 ? (
                <div className="space-y-2">
                  {filteredChapters.map((chapter) => (
                    <div
                      key={chapter.id.toString()}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{chapter.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">{chapter.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">Sequence: {chapter.sequence.toString()}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditChapterDialog(chapter)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No chapters yet. Create one to get started.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Chapter Edit Dialog */}
        <Dialog open={chapterDialogOpen} onOpenChange={setChapterDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Chapter</DialogTitle>
              <DialogDescription>Update chapter details</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateChapter} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chapterTitle">Chapter Title *</Label>
                <Input
                  id="chapterTitle"
                  value={chapterForm.title}
                  onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chapterDescription">Description *</Label>
                <Textarea
                  id="chapterDescription"
                  value={chapterForm.description}
                  onChange={(e) => setChapterForm({ ...chapterForm, description: e.target.value })}
                  required
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chapterSequence">Sequence Number *</Label>
                <Input
                  id="chapterSequence"
                  type="number"
                  min="0"
                  value={chapterForm.sequence}
                  onChange={(e) => setChapterForm({ ...chapterForm, sequence: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Chapters are displayed in sequence order (lowest first)
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setChapterDialogOpen(false)}
                  disabled={updateChapter.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateChapter.isPending}>
                  {updateChapter.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Chapter'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Questions Section */}
        {selectedChapterId && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Questions</CardTitle>
                  <CardDescription>Manage questions for this chapter</CardDescription>
                </div>
                <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={openCreateDialog} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Question
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingQuestion ? 'Edit Question' : 'Create New Question'}</DialogTitle>
                      <DialogDescription>
                        {editingQuestion ? 'Update the question details' : 'Add a new question to this chapter'}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={editingQuestion ? handleUpdateQuestion : handleCreateQuestion} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="questionText">Question Text *</Label>
                        <Textarea
                          id="questionText"
                          value={questionForm.questionText}
                          onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                          required
                          rows={3}
                          placeholder="Enter the question"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="optionA">Option A *</Label>
                          <Input
                            id="optionA"
                            value={questionForm.optionA}
                            onChange={(e) => setQuestionForm({ ...questionForm, optionA: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="optionB">Option B *</Label>
                          <Input
                            id="optionB"
                            value={questionForm.optionB}
                            onChange={(e) => setQuestionForm({ ...questionForm, optionB: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="optionC">Option C *</Label>
                          <Input
                            id="optionC"
                            value={questionForm.optionC}
                            onChange={(e) => setQuestionForm({ ...questionForm, optionC: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="optionD">Option D *</Label>
                          <Input
                            id="optionD"
                            value={questionForm.optionD}
                            onChange={(e) => setQuestionForm({ ...questionForm, optionD: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="correctOption">Correct Option *</Label>
                        <Select
                          value={questionForm.correctOption}
                          onValueChange={(value) => setQuestionForm({ ...questionForm, correctOption: value })}
                        >
                          <SelectTrigger id="correctOption">
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
                        <Label htmlFor="category">Category *</Label>
                        <Select
                          value={questionForm.category}
                          onValueChange={(value) => setQuestionForm({ ...questionForm, category: value as Category })}
                        >
                          <SelectTrigger id="category">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={Category.level1}>{categoryLabels[Category.level1]}</SelectItem>
                            <SelectItem value={Category.neetPYQ}>{categoryLabels[Category.neetPYQ]}</SelectItem>
                            <SelectItem value={Category.jeePYQ}>{categoryLabels[Category.jeePYQ]}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="explanation">Explanation *</Label>
                        <Textarea
                          id="explanation"
                          value={questionForm.explanation}
                          onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                          required
                          rows={3}
                          placeholder="Explain why the correct answer is correct"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setQuestionDialogOpen(false)}
                          disabled={createQuestion.isPending || updateQuestion.isPending}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createQuestion.isPending || updateQuestion.isPending}>
                          {createQuestion.isPending || updateQuestion.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {editingQuestion ? 'Updating...' : 'Creating...'}
                            </>
                          ) : editingQuestion ? (
                            'Update Question'
                          ) : (
                            'Create Question'
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {questionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : questions && questions.length > 0 ? (
                <div className="space-y-3">
                  {questions.map((question, index) => (
                    <div
                      key={question.id.toString()}
                      className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">Q{index + 1}</span>
                            <Badge variant="outline">{categoryLabels[question.category]}</Badge>
                          </div>
                          <p className="font-medium">{question.questionText}</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <p>
                              <span className={question.correctOption === 'A' ? 'font-bold text-green-600' : ''}>
                                A: {question.optionA}
                              </span>
                            </p>
                            <p>
                              <span className={question.correctOption === 'B' ? 'font-bold text-green-600' : ''}>
                                B: {question.optionB}
                              </span>
                            </p>
                            <p>
                              <span className={question.correctOption === 'C' ? 'font-bold text-green-600' : ''}>
                                C: {question.optionC}
                              </span>
                            </p>
                            <p>
                              <span className={question.correctOption === 'D' ? 'font-bold text-green-600' : ''}>
                                D: {question.optionD}
                              </span>
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(question)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No questions yet. Add one to get started.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MobilePage>
  );
}
