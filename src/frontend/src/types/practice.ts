import type { Subject, Question } from '../backend';

export interface PracticeSession {
  subject: Subject;
  chapterId: bigint;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Map<number, string>; // questionIndex -> selected option
  timings: Map<number, bigint>; // questionIndex -> time in microseconds
}

export interface QuestionAttemptLocal {
  questionId: bigint;
  chosenOption: string;
  isCorrect: boolean;
  timeTaken: bigint;
}

// Per-question answer state for persistence
export interface PerQuestionAnswer {
  selectedOption: string;
  timeTaken: bigint;
  isCorrect: boolean;
}
