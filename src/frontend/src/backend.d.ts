import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface UserProfile {
    name: string;
}
export interface QuestionAttempt {
    isCorrect: boolean;
    questionId: bigint;
    chosenOption: string;
    timeTaken: bigint;
}
export interface Question {
    id: bigint;
    correctOption: string;
    subject: Subject;
    explanation: string;
    createdAt: bigint;
    chapterId: bigint;
    questionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
}
export interface Chapter {
    id: bigint;
    title: string;
    subject: Subject;
    createdAt: bigint;
    description: string;
}
export interface UserStats {
    averageTimePerQuestion: bigint;
    displayName: string;
    totalQuestionsAnswered: bigint;
    joinedAt: bigint;
    correctAnswers: bigint;
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
    createChapter(subject: Subject, title: string, description: string): Promise<bigint>;
    createQuestion(subject: Subject, chapterId: bigint, questionText: string, optionA: string, optionB: string, optionC: string, optionD: string, correctOption: string, explanation: string): Promise<bigint>;
    deleteChapter(id: bigint): Promise<void>;
    deleteQuestion(id: bigint): Promise<void>;
    getCallerStats(): Promise<UserStats>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChaptersBySubject(subject: Subject): Promise<Array<Chapter>>;
    getLeaderboard(): Promise<Array<UserStats>>;
    getQuestionsForChapter(chapterId: bigint): Promise<Array<Question>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserStats(principal: Principal): Promise<UserStats>;
    isCallerAdmin(): Promise<boolean>;
    listChapters(): Promise<Array<Chapter>>;
    listQuestions(): Promise<Array<Question>>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setAdminPassword(newPassword: string): Promise<void>;
    submitTestResult(subject: Subject, chapterId: bigint, attempts: Array<QuestionAttempt>): Promise<bigint>;
    unlockAdminMode(password: string): Promise<boolean>;
    updateChapter(id: bigint, title: string, description: string): Promise<void>;
    updateQuestion(id: bigint, questionText: string, optionA: string, optionB: string, optionC: string, optionD: string, correctOption: string, explanation: string): Promise<void>;
}
