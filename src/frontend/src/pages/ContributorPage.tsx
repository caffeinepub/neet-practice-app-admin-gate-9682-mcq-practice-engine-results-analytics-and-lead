import { useState, useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
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
  useCreateQuestionsBulk,
  useDeleteQuestion,
  useIsCallerAdmin,
} from '../hooks/useQueries';
import MobilePage from '../components/layout/MobilePage';
import ContributorGateCard from '../components/contributor/ContributorGateCard';
import CanisterConnectionTimeoutCard from '../components/contributor/CanisterConnectionTimeoutCard';
import PdfImportPreviewList from '../components/contributor/PdfImportPreviewList';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Edit, HelpCircle, Loader2, AlertCircle, Users, BookPlus, FileUp, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Subject, Category, Question } from '../backend';
import { pdfToQuestions, ExtractedQuestion } from '../utils/pdf/pdfToQuestions';

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
  
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  
  // Timeout state management
  const [connectionTimedOut, setConnectionTimedOut] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Contributor access state - will be determined by attempting to fetch data
  const [hasAccess, setHasAccess] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);

  // PDF Import state
  const [pdfImportMode, setPdfImportMode] = useState<'manual' | 'pdf'>('manual');
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestion[]>([]);
  const [isPdfProcessing, setIsPdfProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<bigint | null>(null);

  // Fetch chapters to check contributor access
  const { data: chapters, isLoading: chaptersLoading, error: chaptersError } = useListChapters(true);
  const { data: questions, isLoading: questionsLoading } = useGetQuestionsForChapter(
    selectedChapterId ? BigInt(selectedChapterId) : null
  );
  const { data: totalUsers, isLoading: totalUsersLoading } = useGetTotalAuthenticatedUsers();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsCallerAdmin();

  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const createChapter = useCreateChapter();
  const updateChapter = useUpdateChapter();
  const createQuestionsBulk = useCreateQuestionsBulk();
  const deleteQuestion = useDeleteQuestion();

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

  // Check contributor access based on chapters query result
  useEffect(() => {
    if (isLoggedIn && !chaptersLoading && !accessChecked) {
      if (chaptersError) {
        // If there's an error, user likely doesn't have access
        setHasAccess(false);
      } else if (chapters !== undefined) {
        // If chapters loaded successfully, user has access
        setHasAccess(true);
      }
      setAccessChecked(true);
    }
  }, [isLoggedIn, chaptersLoading, chaptersError, chapters, accessChecked]);

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

  // Show loading state while actor is initializing or checking access
  if (!isActorReady || (isLoggedIn && !accessChecked)) {
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

  const handlePdfFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }

    if (!selectedSubject || !selectedChapterId) {
      toast.error('Please select a subject and chapter first');
      return;
    }

    setIsPdfProcessing(true);
    try {
      const year = questionForm.year.trim() ? BigInt(questionForm.year) : null;
      const questions = await pdfToQuestions(file, questionForm.category, year);
      setExtractedQuestions(questions);
      toast.success(`Extracted ${questions.length} questions from PDF`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to process PDF');
      console.error('PDF processing error:', error);
    } finally {
      setIsPdfProcessing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveExtractedQuestion = (index: number) => {
    setExtractedQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveBulkQuestions = async () => {
    if (!selectedSubject || !selectedChapterId) {
      toast.error('Please select a subject and chapter');
      return;
    }

    if (extractedQuestions.length === 0) {
      toast.error('No questions to save');
      return;
    }

    try {
      // Preserve the exact order from extractedQuestions
      const questionsToCreate: Question[] = extractedQuestions.map((q) => ({
        id: BigInt(0), // Will be assigned by backend
        subject: selectedSubject,
        chapterId: BigInt(selectedChapterId),
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: q.correctOption,
        explanation: q.explanation,
        category: q.category,
        year: q.year ?? undefined,
        createdAt: BigInt(0), // Will be assigned by backend
        questionImage: q.questionImage ?? undefined,
        explanationImage: undefined,
      }));

      await createQuestionsBulk.mutateAsync(questionsToCreate);
      toast.success(`Successfully created ${extractedQuestions.length} questions`);
      setExtractedQuestions([]);
      setPdfImportMode('manual');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save questions');
    }
  };

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

  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return;

    try {
      await deleteQuestion.mutateAsync(questionToDelete);
      toast.success('Question deleted successfully');
      setDeleteDialogOpen(false);
      setQuestionToDelete(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete question');
    }
  };

  const openDeleteDialog = (questionId: bigint) => {
    setQuestionToDelete(questionId);
    setDeleteDialogOpen(true);
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
      year: question.year ? question.year.toString() : '',
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
                <div className="flex items-center justify-between">
                  <Label>Chapter</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={openCreateChapterDialog}
                    className="h-8"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    New Chapter
                  </Button>
                </div>
                <Select
                  value={selectedChapterId || ''}
                  onValueChange={setSelectedChapterId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a chapter" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredChapters.map((chapter) => (
                      <SelectItem key={chapter.id.toString()} value={chapter.id.toString()}>
                        {chapter.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedChapterId && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Questions</CardTitle>
                  <CardDescription>
                    {questionsLoading ? 'Loading...' : `${questions?.length || 0} questions`}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={pdfImportMode} onValueChange={(v) => setPdfImportMode(v as 'manual' | 'pdf')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                  <TabsTrigger value="pdf">PDF Import</TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Add questions one at a time or edit existing ones
                    </p>
                    <Button onClick={openCreateDialog}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Question
                    </Button>
                  </div>

                  {questionsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : questions && questions.length > 0 ? (
                    <div className="space-y-2">
                      {questions.map((question) => (
                        <Card key={question.id.toString()}>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{categoryLabels[question.category]}</Badge>
                                  {question.year && (
                                    <Badge variant="secondary">Year: {question.year.toString()}</Badge>
                                  )}
                                  <Badge>Correct: {question.correctOption}</Badge>
                                </div>
                                <p className="text-sm font-medium whitespace-pre-wrap">
                                  {question.questionText}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(question)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openDeleteDialog(question.id)}
                                    disabled={deleteQuestion.isPending}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No questions yet. Add your first question!
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="pdf" className="space-y-4">
                  {extractedQuestions.length === 0 ? (
                    <div className="space-y-4">
                      <Alert>
                        <HelpCircle className="h-4 w-4" />
                        <AlertDescription>
                          Upload a PDF containing questions with options (A, B, C, D). The system will
                          automatically extract and parse them. All Unicode symbols (λ, π, etc.) and formatting will be preserved.
                        </AlertDescription>
                      </Alert>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Category</Label>
                            <Select
                              value={questionForm.category}
                              onValueChange={(value) =>
                                setQuestionForm({ ...questionForm, category: value as Category })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={Category.level1}>Level 1</SelectItem>
                                <SelectItem value={Category.neetPYQ}>NEET PYQ</SelectItem>
                                <SelectItem value={Category.jeePYQ}>JEE PYQ</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Year (optional)</Label>
                            <Input
                              type="number"
                              placeholder="e.g., 2024"
                              value={questionForm.year}
                              onChange={(e) =>
                                setQuestionForm({ ...questionForm, year: e.target.value })
                              }
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Upload PDF</Label>
                          <div className="flex gap-2">
                            <Input
                              ref={fileInputRef}
                              type="file"
                              accept=".pdf"
                              onChange={handlePdfFileSelect}
                              disabled={isPdfProcessing}
                              className="flex-1"
                            />
                            <Button
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isPdfProcessing}
                            >
                              {isPdfProcessing ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 mr-2" />
                                  Select PDF
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <PdfImportPreviewList
                      questions={extractedQuestions}
                      onRemove={handleRemoveExtractedQuestion}
                      onSave={handleSaveBulkQuestions}
                      isSaving={createQuestionsBulk.isPending}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Question Dialog */}
        <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? 'Edit Question' : 'Add New Question'}</DialogTitle>
              <DialogDescription>
                Fill in the question details below
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={editingQuestion ? handleUpdateQuestion : handleCreateQuestion} className="space-y-4">
              <div className="space-y-2">
                <Label>Question Text</Label>
                <Textarea
                  value={questionForm.questionText}
                  onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                  required
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-3 gap-4">
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
                  <Label>Category</Label>
                  <Select
                    value={questionForm.category}
                    onValueChange={(value) => setQuestionForm({ ...questionForm, category: value as Category })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={Category.level1}>Level 1</SelectItem>
                      <SelectItem value={Category.neetPYQ}>NEET PYQ</SelectItem>
                      <SelectItem value={Category.jeePYQ}>JEE PYQ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Year (optional)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 2024"
                    value={questionForm.year}
                    onChange={(e) => setQuestionForm({ ...questionForm, year: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Explanation</Label>
                <Textarea
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  required
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setQuestionDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createQuestion.isPending || updateQuestion.isPending}>
                  {createQuestion.isPending || updateQuestion.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
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

        {/* Chapter Edit Dialog */}
        <Dialog open={chapterDialogOpen} onOpenChange={setChapterDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Chapter</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateChapter} className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={chapterForm.title}
                  onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={chapterForm.description}
                  onChange={(e) => setChapterForm({ ...chapterForm, description: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Sequence</Label>
                <Input
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
                  {updateChapter.isPending ? 'Updating...' : 'Update Chapter'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Create Chapter Dialog */}
        <Dialog open={createChapterDialogOpen} onOpenChange={setCreateChapterDialogOpen}>
          <DialogContent>
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
                <Label>Title</Label>
                <Input
                  value={newChapterForm.title}
                  onChange={(e) => setNewChapterForm({ ...newChapterForm, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newChapterForm.description}
                  onChange={(e) => setNewChapterForm({ ...newChapterForm, description: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Sequence</Label>
                <Input
                  type="number"
                  value={newChapterForm.sequence}
                  onChange={(e) => setNewChapterForm({ ...newChapterForm, sequence: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateChapterDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createChapter.isPending}>
                  {createChapter.isPending ? 'Creating...' : 'Create Chapter'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the question from the database.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setQuestionToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteQuestion}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteQuestion.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MobilePage>
  );
}
