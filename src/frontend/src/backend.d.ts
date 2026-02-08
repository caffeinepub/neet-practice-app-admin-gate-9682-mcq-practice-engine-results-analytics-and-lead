import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Chapter {
    id: bigint;
    title: string;
    subject: Subject;
    createdAt: bigint;
    description: string;
    sequence: bigint;
}
export interface PracticeProgressKey {
    subject: Subject;
    year?: bigint;
    chapterId: bigint;
    category: Category;
}
export interface QuestionAttempt {
    isCorrect: boolean;
    questionId: bigint;
    chosenOption: string;
    timeTaken: bigint;
}
export interface PracticeProgress {
    lastQuestionIndex: bigint;
    discoveredQuestionIds: Array<bigint>;
}
export interface Question {
    id: bigint;
    correctOption: string;
    subject: Subject;
    explanation: string;
    createdAt: bigint;
    year?: bigint;
    chapterId: bigint;
    questionText: string;
    category: Category;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
}
export interface UserStats {
    averageTimePerQuestion: bigint;
    displayName: string;
    totalQuestionsAnswered: bigint;
    joinedAt: bigint;
    correctAnswers: bigint;
}
export interface UserProfile {
    name: string;
}
export enum Category {
    level1 = "level1",
    neetPYQ = "neetPYQ",
    jeePYQ = "jeePYQ"
}
export enum Subject {
    biology = "biology",
    chemistry = "chemistry",
    physics = "physics"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createChapter(subject: Subject, title: string, description: string, sequence: bigint): Promise<bigint>;
    createQuestion(subject: Subject, chapterId: bigint, questionText: string, optionA: string, optionB: string, optionC: string, optionD: string, correctOption: string, explanation: string, category: Category, year: bigint | null): Promise<bigint>;
    deleteChapter(id: bigint): Promise<void>;
    deleteQuestion(id: bigint): Promise<void>;
    getCallerStats(): Promise<UserStats>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChaptersBySubject(subject: Subject): Promise<Array<Chapter>>;
    getLeaderboard(): Promise<Array<UserStats>>;
    getOrCreatePracticeProgress(key: PracticeProgressKey, totalQuestions: bigint): Promise<PracticeProgress | null>;
    getPracticeProgress(key: PracticeProgressKey): Promise<PracticeProgress | null>;
    getQuestionsForChapter(chapterId: bigint): Promise<Array<Question>>;
    getQuestionsForYear(year: bigint, category: Category): Promise<Array<Question>>;
    getTotalAuthenticatedUsers(): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserStats(principal: Principal): Promise<UserStats>;
    hasContributorAccess(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    listChapters(): Promise<Array<Chapter>>;
    listQuestions(): Promise<Array<Question>>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    savePracticeProgress(key: PracticeProgressKey, progress: PracticeProgress): Promise<void>;
    submitTestResult(subject: Subject, chapterId: bigint, attempts: Array<QuestionAttempt>): Promise<bigint>;
    updateChapter(id: bigint, title: string, description: string, sequence: bigint): Promise<void>;
    updateQuestion(id: bigint, questionText: string, optionA: string, optionB: string, optionC: string, optionD: string, correctOption: string, explanation: string, category: Category, year: bigint | null): Promise<void>;
}
