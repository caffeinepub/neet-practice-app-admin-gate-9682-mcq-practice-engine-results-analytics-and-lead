import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useActor } from '../hooks/useActor';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useHasContributorAccess } from '../hooks/useAuthz';
import {
  useListChapters,
  useGetQuestionsForChapter,
  useCreateQuestion,
  useUpdateQuestion,
  useCreateChapter,
  useUpdateChapter,
  useGetTotalAuthenticatedUsers,
  useIsCallerAdmin,
  useDeleteAllQuestions,
  useDeleteQuestionsForChapterAndCategory,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Plus, Edit, HelpCircle, Loader2, AlertCircle, Users, BookPlus, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Subject, Category } from '../backend';

const categoryLabels: Record<Category, string> = {
  [Category.level1]: 'Level 1',
  [Category.neetPYQ]: 'NEET PYQ',
  [Category.jeePYQ]: 'JEE PYQ',
};

const CONNECTION_TIMEOUT_MS = 15000;

export default function ContributorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category>(Category.level1);

  const [connectionTimedOut, setConnectionTimedOut] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deleteChapterCategoryDialogOpen, setDeleteChapterCategoryDialogOpen] = useState(false);

  const { data: hasAccess, isLoading: accessLoading } = useHasContributorAccess();
  const { data: chapters, isLoading: chaptersLoading } = useListChapters(hasAccess);
  const {
    data: questions,
    isLoading: questionsLoading,
    isError: questionsError,
    error: questionsErrorObj,
  } = useGetQuestionsForChapter(selectedChapterId ? BigInt(selectedChapterId) : null);
  const { data: totalUsers, isLoading: totalUsersLoading } = useGetTotalAuthenticatedUsers();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsCallerAdmin();

  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const createChapter = useCreateChapter();
  const updateChapter = useUpdateChapter();
  const deleteAllQuestions = useDeleteAllQuestions();
  const deleteQuestionsForChapterAndCategory = useDeleteQuestionsForChapterAndCategory();

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
    year: '',
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

  useEffect(() => {
    if (!isActorReady && !connectionTimedOut) {
      const timeoutId = setTimeout(() => {
        setConnectionTimedOut(true);
      }, CONNECTION_TIMEOUT_MS);

      return () => clearTimeout(timeoutId);
    }
  }, [isActorReady, connectionTimedOut]);

  useEffect(() => {
    if (isActorReady) {
      setConnectionTimedOut(false);
      setIsRetrying(false);
    }
  }, [isActorReady]);

  const handleRetry = async () => {
    setIsRetrying(true);
    setConnectionTimedOut(false);

    await queryClient.invalidateQueries();

    setTimeout(() => {
      if (!isActorReady) {
        setIsRetrying(false);
      }
    }, 2000);
  };

  if (connectionTimedOut && !isActorReady) {
    return (
      <MobilePage>
        <div className="flex flex-col items-center justify-center py-12">
          <CanisterConnectionTimeoutCard onRetry={handleRetry} isRetrying={isRetrying} />
        </div>
      </MobilePage>
    );
  }

  if (!isActorReady || (isLoggedIn && accessLoading)) {
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

  const filteredChapters = selectedSubject ? chapters?.filter((c) => c.subject === selectedSubject) || [] : [];

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject || !selectedChapterId) {
      toast.error('Please select a subject and chapter');
      return;
    }

    const yearValue = questionForm.year.trim();
    const year = yearValue ? BigInt(yearValue) : null;

    try {
      await createQuestion.mutateAsync({
        subject: selectedSubject,
        chapterId: BigInt(selectedChapterId),
        questionText: questionForm.questionText,
        optionA: questionForm.optionA,
        optionB: questionForm.optionB,
        optionC: questionForm.optionC,
        optionD: questionForm.optionD,
        correctOption: questionForm.correctOption,
        explanation: questionForm.explanation,
        category: questionForm.category,
        year,
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

    const yearValue = questionForm.year.trim();
    const year = yearValue ? BigInt(yearValue) : null;

    try {
      await updateQuestion.mutateAsync({
        id: editingQuestion.id,
        questionText: questionForm.questionText,
        optionA: questionForm.optionA,
        optionB: questionForm.optionB,
        optionC: questionForm.optionC,
        optionD: questionForm.optionD,
        correctOption: questionForm.correctOption,
        explanation: questionForm.explanation,
        category: questionForm.category,
        year,
      });
      toast.success('Question updated successfully');
      setQuestionDialogOpen(false);
      setEditingQuestion(null);
      resetQuestionForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update question');
    }
  };

  const handleDeleteAllQuestions = async () => {
    try {
      await deleteAllQuestions.mutateAsync();
      toast.success('All questions deleted successfully');
      setDeleteAllDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete all questions');
    }
  };

  const handleDeleteChapterCategoryQuestions = async () => {
    if (!selectedChapterId) return;

    try {
      await deleteQuestionsForChapterAndCategory.mutateAsync({
        chapterId: BigInt(selectedChapterId),
        category: selectedCategory,
      });
      toast.success(`All ${categoryLabels[selectedCategory]} questions deleted for this chapter`);
      setDeleteChapterCategoryDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete questions');
    }
  };

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateChapterError(null);

    if (!selectedSubject) {
      setCreateChapterError('Please select a subject first');
      return;
    }

    if (!newChapterForm.title.trim()) {
      setCreateChapterError('Chapter title is required');
      return;
    }

    if (!newChapterForm.sequence.trim()) {
      setCreateChapterError('Sequence number is required');
      return;
    }

    try {
      await createChapter.mutateAsync({
        subject: selectedSubject,
        title: newChapterForm.title,
        description: newChapterForm.description,
        sequence: BigInt(newChapterForm.sequence),
      });
      toast.success('Chapter created successfully');
      setCreateChapterDialogOpen(false);
      resetNewChapterForm();
    } catch (error: any) {
      setCreateChapterError(error.message || 'Failed to create chapter');
    }
  };

  const handleUpdateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChapter) return;

    try {
      await updateChapter.mutateAsync({
        id: editingChapter.id,
        title: chapterForm.title,
        description: chapterForm.description,
        sequence: BigInt(chapterForm.sequence),
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
      year: '',
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

  const openEditQuestionDialog = (question: any) => {
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
      year: question.year ? question.year.toString() : '',
    });
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

  const openCreateQuestionDialog = () => {
    setEditingQuestion(null);
    resetQuestionForm();
    setQuestionDialogOpen(true);
  };

  const openCreateChapterDialog = () => {
    setCreateChapterError(null);
    resetNewChapterForm();
    setCreateChapterDialogOpen(true);
  };

  return (
    <MobilePage>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Contributor Panel</h1>
              <p className="text-muted-foreground">Manage questions and chapters</p>
            </div>
          </div>
        </div>

        {!totalUsersLoading && totalUsers !== undefined && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <CardTitle>Platform Statistics</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalUsers.toString()}</div>
              <p className="text-sm text-muted-foreground">Total Authenticated Users</p>
            </CardContent>
          </Card>
        )}

        {!isAdminLoading && isAdmin && (
          <Card className="border-destructive/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <CardTitle className="text-destructive">Admin Cleanup Actions</CardTitle>
              </div>
              <CardDescription>Destructive operations - use with caution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button
                  variant="destructive"
                  onClick={() => setDeleteAllDialogOpen(true)}
                  className="w-full"
                  disabled={deleteAllQuestions.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All Questions
                </Button>
                <p className="text-xs text-muted-foreground">
                  Permanently removes all questions from the entire platform
                </p>
              </div>

              {selectedChapterId && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label>Delete Questions by Category</Label>
                    <Select
                      value={selectedCategory}
                      onValueChange={(value) => setSelectedCategory(value as Category)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="destructive"
                      onClick={() => setDeleteChapterCategoryDialogOpen(true)}
                      className="w-full"
                      disabled={deleteQuestionsForChapterAndCategory.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete {categoryLabels[selectedCategory]} Questions for This Chapter
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Removes all {categoryLabels[selectedCategory]} questions for the selected chapter only
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Subject Selection</CardTitle>
            <CardDescription>Choose a subject to manage its chapters and questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={selectedSubject || ''} onValueChange={(value) => setSelectedSubject(value as Subject)}>
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
              <Button onClick={openCreateChapterDialog} className="w-full">
                <BookPlus className="w-4 h-4 mr-2" />
                Create New Chapter
              </Button>
            )}
          </CardContent>
        </Card>

        {selectedSubject && (
          <Card>
            <CardHeader>
              <CardTitle>Chapter Selection</CardTitle>
              <CardDescription>Select a chapter to view and manage its questions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {chaptersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredChapters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No chapters available for this subject
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredChapters.map((chapter) => (
                    <div
                      key={chapter.id.toString()}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedChapterId === chapter.id.toString()
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedChapterId(chapter.id.toString())}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium">{chapter.title}</h3>
                          <p className="text-sm text-muted-foreground">{chapter.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditChapterDialog(chapter);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {selectedChapterId && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Questions</CardTitle>
                  <CardDescription>Manage questions for the selected chapter</CardDescription>
                </div>
                <Button onClick={openCreateQuestionDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {questionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : questionsError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to load questions: {questionsErrorObj?.message || 'Unknown error'}
                  </AlertDescription>
                </Alert>
              ) : !questions || questions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No questions available for this chapter
                </p>
              ) : (
                <div className="space-y-3">
                  {questions.map((question) => (
                    <div key={question.id.toString()} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{categoryLabels[question.category]}</Badge>
                            {question.year && <Badge variant="outline">Year: {question.year.toString()}</Badge>}
                          </div>
                          <p className="text-sm font-medium whitespace-pre-wrap">{question.questionText}</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="font-medium">A:</span> {question.optionA}
                            </div>
                            <div>
                              <span className="font-medium">B:</span> {question.optionB}
                            </div>
                            <div>
                              <span className="font-medium">C:</span> {question.optionC}
                            </div>
                            <div>
                              <span className="font-medium">D:</span> {question.optionD}
                            </div>
                          </div>
                          <div className="text-xs">
                            <span className="font-medium text-green-600">Correct: {question.correctOption}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditQuestionDialog(question)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? 'Edit Question' : 'Create New Question'}</DialogTitle>
            <DialogDescription>
              {editingQuestion ? 'Update the question details below' : 'Fill in the details to create a new question'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editingQuestion ? handleUpdateQuestion : handleCreateQuestion} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="questionText">Question Text</Label>
              <Textarea
                id="questionText"
                value={questionForm.questionText}
                onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                placeholder="Enter the question"
                required
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="optionA">Option A</Label>
                <Input
                  id="optionA"
                  value={questionForm.optionA}
                  onChange={(e) => setQuestionForm({ ...questionForm, optionA: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="optionB">Option B</Label>
                <Input
                  id="optionB"
                  value={questionForm.optionB}
                  onChange={(e) => setQuestionForm({ ...questionForm, optionB: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="optionC">Option C</Label>
                <Input
                  id="optionC"
                  value={questionForm.optionC}
                  onChange={(e) => setQuestionForm({ ...questionForm, optionC: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="optionD">Option D</Label>
                <Input
                  id="optionD"
                  value={questionForm.optionD}
                  onChange={(e) => setQuestionForm({ ...questionForm, optionD: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="correctOption">Correct Option</Label>
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
              <Label htmlFor="explanation">Explanation</Label>
              <Textarea
                id="explanation"
                value={questionForm.explanation}
                onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                placeholder="Explain the correct answer"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={questionForm.category}
                  onValueChange={(value) => setQuestionForm({ ...questionForm, category: value as Category })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">
                  Year <span className="text-muted-foreground">(Optional, for PYQ)</span>
                </Label>
                <Input
                  id="year"
                  type="number"
                  value={questionForm.year}
                  onChange={(e) => setQuestionForm({ ...questionForm, year: e.target.value })}
                  placeholder="e.g., 2024"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setQuestionDialogOpen(false)}>
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

      <Dialog open={chapterDialogOpen} onOpenChange={setChapterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Chapter</DialogTitle>
            <DialogDescription>Update the chapter details below</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateChapter} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="chapterTitle">Title</Label>
              <Input
                id="chapterTitle"
                value={chapterForm.title}
                onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chapterDescription">Description</Label>
              <Textarea
                id="chapterDescription"
                value={chapterForm.description}
                onChange={(e) => setChapterForm({ ...chapterForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chapterSequence">Sequence</Label>
              <Input
                id="chapterSequence"
                type="number"
                value={chapterForm.sequence}
                onChange={(e) => setChapterForm({ ...chapterForm, sequence: e.target.value })}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setChapterDialogOpen(false)}>
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

      <Dialog open={createChapterDialogOpen} onOpenChange={setCreateChapterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Chapter</DialogTitle>
            <DialogDescription>Add a new chapter for {selectedSubject}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateChapter} className="space-y-4">
            {createChapterError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{createChapterError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="newChapterTitle">Title</Label>
              <Input
                id="newChapterTitle"
                value={newChapterForm.title}
                onChange={(e) => setNewChapterForm({ ...newChapterForm, title: e.target.value })}
                placeholder="e.g., Thermodynamics"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newChapterDescription">Description</Label>
              <Textarea
                id="newChapterDescription"
                value={newChapterForm.description}
                onChange={(e) => setNewChapterForm({ ...newChapterForm, description: e.target.value })}
                placeholder="Brief description of the chapter"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newChapterSequence">Sequence</Label>
              <Input
                id="newChapterSequence"
                type="number"
                value={newChapterForm.sequence}
                onChange={(e) => setNewChapterForm({ ...newChapterForm, sequence: e.target.value })}
                placeholder="e.g., 1"
                required
              />
              <p className="text-xs text-muted-foreground">
                Order in which this chapter appears in the list
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateChapterDialogOpen(false)}>
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

      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Questions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all questions from the entire platform. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllQuestions}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAllQuestions.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete All'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteChapterCategoryDialogOpen} onOpenChange={setDeleteChapterCategoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {categoryLabels[selectedCategory]} Questions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {categoryLabels[selectedCategory]} questions for the selected chapter.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChapterCategoryQuestions}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteQuestionsForChapterAndCategory.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Questions'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobilePage>
  );
}
