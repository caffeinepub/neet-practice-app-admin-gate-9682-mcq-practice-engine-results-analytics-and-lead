import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { UserProfile, Chapter, Question, QuestionAttempt, UserStats, Subject, Category, PracticeProgressKey, PracticeProgress } from '../backend';

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
  });
}

export function useListQuestions(hasContributorAccess?: boolean) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Question[]>({
    queryKey: ['questions', 'all'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listQuestions();
    },
    enabled: !!actor && !actorFetching && (hasContributorAccess === undefined || hasContributorAccess === true),
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
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createQuestion(subject, chapterId, questionText, optionA, optionB, optionC, optionD, correctOption, explanation, category, year ?? null);
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
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateQuestion(id, questionText, optionA, optionB, optionC, optionD, correctOption, explanation, category, year ?? null);
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

// Practice Progress - helper to create cache key with optional year
function createProgressCacheKey(key: PracticeProgressKey) {
  return ['practiceProgress', key.subject, key.chapterId.toString(), key.category, key.year?.toString() ?? 'no-year'];
}

export function useGetOrCreatePracticeProgress(key: PracticeProgressKey, totalQuestions: bigint) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<PracticeProgress | null>({
    queryKey: createProgressCacheKey(key),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getOrCreatePracticeProgress(key, totalQuestions);
    },
    enabled: !!actor && !actorFetching && !!identity,
    retry: false,
  });
}

export function useGetPracticeProgress(key: PracticeProgressKey) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<PracticeProgress | null>({
    queryKey: createProgressCacheKey(key),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getPracticeProgress(key);
    },
    enabled: !!actor && !actorFetching && !!identity,
    retry: false,
  });
}

export function useSavePracticeProgress() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, progress }: { key: PracticeProgressKey; progress: PracticeProgress }) => {
      if (!actor) throw new Error('Actor not available');
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
    },
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
