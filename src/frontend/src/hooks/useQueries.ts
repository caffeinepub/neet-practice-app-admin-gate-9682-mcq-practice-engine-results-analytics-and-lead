import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { UserProfile, Chapter, Question, QuestionAttempt, UserStats, Subject, Category, PracticeProgressKey, PracticeProgress, TestResult, SubjectUserStats } from '../backend';

// User Profile
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching && !!identity,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && !!identity ? query.isFetched : true,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      queryClient.invalidateQueries({ queryKey: ['callerStats'] });
    },
  });
}

// Admin Check
export function useIsCallerAdmin() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: ['isCallerAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !actorFetching && !!identity,
    retry: false,
  });
}

// Chapters
export function useGetChaptersBySubject(subject: Subject | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Chapter[]>({
    queryKey: ['chapters', subject],
    queryFn: async () => {
      if (!actor || !subject) return [];
      return actor.getChaptersBySubject(subject);
    },
    enabled: !!actor && !actorFetching && !!subject,
  });
}

export function useListChapters(hasContributorAccess?: boolean) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Chapter[]>({
    queryKey: ['chapters', 'all'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listChapters();
    },
    enabled: !!actor && !actorFetching && (hasContributorAccess === undefined || hasContributorAccess === true),
  });
}

export function useCreateChapter() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subject, title, description, sequence }: { subject: Subject; title: string; description: string; sequence: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createChapter(subject, title, description, sequence);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
    },
  });
}

export function useUpdateChapter() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, title, description, sequence }: { id: bigint; title: string; description: string; sequence: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateChapter(id, title, description, sequence);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
    },
  });
}

export function useDeleteChapter() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteChapter(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}

// Questions
export function useGetQuestionsForChapter(chapterId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Question[]>({
    queryKey: ['questions', 'chapter', chapterId?.toString()],
    queryFn: async () => {
      if (!actor || chapterId === null) return [];
      return actor.getQuestionsForChapter(chapterId);
    },
    enabled: !!actor && !actorFetching && chapterId !== null,
    retry: 1,
  });
}

export function useGetQuestionsByChapterAndCategory(chapterId: bigint | null, category: Category | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Question[]>({
    queryKey: ['questions', 'chapter', chapterId?.toString(), 'category', category],
    queryFn: async () => {
      if (!actor || chapterId === null || category === null) return [];
      return actor.getQuestionsByChapterAndCategory(chapterId, category);
    },
    enabled: !!actor && !actorFetching && chapterId !== null && category !== null,
  });
}

export function useGetQuestionsByChapterCategoryAndYear(
  chapterId: bigint | null,
  category: Category | null,
  year: bigint | null
) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Question[]>({
    queryKey: ['questions', 'chapter', chapterId?.toString(), 'category', category, 'year', year?.toString()],
    queryFn: async () => {
      if (!actor || chapterId === null || category === null || year === null) return [];
      return actor.getQuestionsByChapterCategoryAndYear(chapterId, category, year);
    },
    enabled: !!actor && !actorFetching && chapterId !== null && category !== null && year !== null,
  });
}

export function useGetQuestionsForYear(year: bigint | null, category: Category) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Question[]>({
    queryKey: ['questions', 'year', year?.toString(), category],
    queryFn: async () => {
      if (!actor || year === null) return [];
      return actor.getQuestionsForYear(year, category);
    },
    enabled: !!actor && !actorFetching && year !== null,
  });
}

export function useCreateQuestion() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subject,
      chapterId,
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      explanation,
      category,
      year,
      questionImage,
      explanationImage,
    }: {
      subject: Subject;
      chapterId: bigint;
      questionText: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctOption: string;
      explanation: string;
      category: Category;
      year?: bigint | null;
      questionImage?: any;
      explanationImage?: any;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createQuestion(
        subject,
        chapterId,
        questionText,
        optionA,
        optionB,
        optionC,
        optionD,
        correctOption,
        explanation,
        category,
        year ?? null,
        questionImage ?? null,
        explanationImage ?? null
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}

export function useUpdateQuestion() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      explanation,
      category,
      year,
      questionImage,
      explanationImage,
    }: {
      id: bigint;
      questionText: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctOption: string;
      explanation: string;
      category: Category;
      year?: bigint | null;
      questionImage?: any;
      explanationImage?: any;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateQuestion(
        id,
        questionText,
        optionA,
        optionB,
        optionC,
        optionD,
        correctOption,
        explanation,
        category,
        year ?? null,
        questionImage ?? null,
        explanationImage ?? null
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}

export function useDeleteQuestion() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteQuestion(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}

export function useDeleteAllQuestions() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteAllQuestions();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
    },
  });
}

export function useDeleteQuestionsForChapterAndCategory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chapterId, category }: { chapterId: bigint; category: Category }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteQuestionsForChapterAndCategory(chapterId, category);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
    },
  });
}

/**
 * Practice Progress - helper to create cache key with optional year
 * 
 * REGRESSION TEST: To verify the null-safety fix works:
 * 1. Navigate to /practice with missing or invalid chapterId (e.g., /practice?category=level1)
 * 2. Verify no global "Something Went Wrong" error appears
 * 3. Verify an in-page error message is shown with recovery actions
 * 4. Navigate with valid params (e.g., /practice?subject=physics&chapterId=1&category=level1)
 * 5. Verify practice session loads normally and progress tracking works
 */
function createProgressCacheKey(key: PracticeProgressKey | null): (string | number | null)[] {
  if (!key) {
    return ['practiceProgress', 'invalid'];
  }
  
  // Safely handle potentially null/undefined values
  const chapterIdStr = key.chapterId != null ? key.chapterId.toString() : 'null';
  const yearStr = key.year != null ? key.year.toString() : 'no-year';
  
  return ['practiceProgress', key.subject, chapterIdStr, key.category, yearStr];
}

export function useGetOrCreatePracticeProgress(key: PracticeProgressKey | null, totalQuestions: bigint) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  // Validate that key has all required fields before enabling query
  const isValidKey = key != null && key.chapterId != null && key.subject != null && key.category != null;

  return useQuery<PracticeProgress | null>({
    queryKey: createProgressCacheKey(key),
    queryFn: async () => {
      if (!actor || !key || key.chapterId == null) throw new Error('Actor or valid key not available');
      return actor.getOrCreatePracticeProgress(key, totalQuestions);
    },
    enabled: !!actor && !actorFetching && !!identity && isValidKey,
    retry: false,
  });
}

export function useGetPracticeProgress(key: PracticeProgressKey | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  // Validate that key has all required fields before enabling query
  const isValidKey = key != null && key.chapterId != null && key.subject != null && key.category != null;

  return useQuery<PracticeProgress | null>({
    queryKey: createProgressCacheKey(key),
    queryFn: async () => {
      if (!actor || !key || key.chapterId == null) throw new Error('Actor or valid key not available');
      return actor.getPracticeProgress(key);
    },
    enabled: !!actor && !actorFetching && !!identity && isValidKey,
    retry: false,
  });
}

export function useSavePracticeProgress() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, progress }: { key: PracticeProgressKey; progress: PracticeProgress }) => {
      if (!actor) throw new Error('Actor not available');
      if (key.chapterId == null) throw new Error('Invalid practice progress key: chapterId is required');
      return actor.savePracticeProgress(key, progress);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: createProgressCacheKey(variables.key),
      });
    },
  });
}

// Test Results
export function useSubmitTestResult() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subject, chapterId, attempts }: { subject: Subject; chapterId: bigint; attempts: QuestionAttempt[] }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.submitTestResult(subject, chapterId, attempts);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callerStats'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['subjectLeaderboard'] });
    },
  });
}

// Get Session Review by Test Result ID
export function useGetSessionReview(testResultId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<[TestResult, Question[]]>({
    queryKey: ['sessionReview', testResultId?.toString()],
    queryFn: async () => {
      if (!actor || testResultId === null) throw new Error('Actor or result ID not available');
      return actor.getSessionReviewByTestResultId(testResultId);
    },
    enabled: !!actor && !actorFetching && !!identity && testResultId !== null,
    retry: false,
  });
}

// Leaderboard
export function useGetLeaderboard() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserStats[]>({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLeaderboard();
    },
    enabled: !!actor && !actorFetching,
  });
}

// Subject Leaderboard
export function useGetSubjectLeaderboard(subject: Subject | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<SubjectUserStats[]>({
    queryKey: ['subjectLeaderboard', subject],
    queryFn: async () => {
      if (!actor || !subject) return [];
      return actor.getSubjectLeaderboard(subject);
    },
    enabled: !!actor && !actorFetching && !!subject,
  });
}

// User Stats
export function useGetCallerStats() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<UserStats>({
    queryKey: ['callerStats'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerStats();
    },
    enabled: !!actor && !actorFetching && !!identity,
  });
}

// Total Authenticated Users
export function useGetTotalAuthenticatedUsers() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['totalAuthenticatedUsers'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getTotalAuthenticatedUsers();
    },
    enabled: !!actor && !actorFetching,
  });
}
