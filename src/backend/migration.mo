import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Time "mo:core/Time";

module {
  type Subject = { #physics; #chemistry; #biology };
  type Chapter = {
    id : Nat;
    subject : Subject;
    title : Text;
    description : Text;
    sequence : Nat;
    createdAt : Int;
  };

  type Category = {
    #level1;
    #neetPYQ;
    #jeePYQ;
  };

  type Question = {
    id : Nat;
    subject : Subject;
    chapterId : Nat;
    questionText : Text;
    optionA : Text;
    optionB : Text;
    optionC : Text;
    optionD : Text;
    correctOption : Text;
    explanation : Text;
    category : Category;
    createdAt : Int;
    year : ?Nat;
  };

  type UserStats = {
    displayName : Text;
    totalQuestionsAnswered : Nat;
    correctAnswers : Nat;
    averageTimePerQuestion : Nat;
    joinedAt : Int;
  };

  type QuestionAttempt = {
    questionId : Nat;
    chosenOption : Text;
    isCorrect : Bool;
    timeTaken : Int;
  };

  type TestResult = {
    id : Nat;
    user : Principal.Principal;
    subject : Subject;
    chapterId : Nat;
    attempts : [QuestionAttempt];
    score : Nat;
    createdAt : Int;
  };

  type UserProfile = {
    name : Text;
  };

  type PracticeProgressKey = {
    subject : Subject;
    chapterId : Nat;
    category : Category;
    year : ?Nat;
  };

  type PracticeProgress = {
    lastQuestionIndex : Nat;
    discoveredQuestionIds : [Nat];
  };

  type OldActor = {
    chapters : Map.Map<Nat, Chapter>;
    questions : Map.Map<Nat, Question>;
    userStats : Map.Map<Principal.Principal, UserStats>;
    testResults : Map.Map<Nat, TestResult>;
    contributorAccess : Map.Map<Principal.Principal, Bool>;
    userProfiles : Map.Map<Principal.Principal, UserProfile>;
    practiceProgress : Map.Map<Principal.Principal, Map.Map<Text, PracticeProgress>>;
    nextChapterId : Nat;
    nextQuestionId : Nat;
    nextTestResultId : Nat;
    contributorPassword : Text;
    totalAuthenticatedUsers : Nat;
  };

  type NewActor = {
    chapters : Map.Map<Nat, Chapter>;
    questions : Map.Map<Nat, Question>;
    userStats : Map.Map<Principal.Principal, UserStats>;
    testResults : Map.Map<Nat, TestResult>;
    contributorAccess : Map.Map<Principal.Principal, Bool>;
    userProfiles : Map.Map<Principal.Principal, UserProfile>;
    practiceProgress : Map.Map<Principal.Principal, Map.Map<Text, PracticeProgress>>;
    nextChapterId : Nat;
    nextQuestionId : Nat;
    nextTestResultId : Nat;
    contributorPassword : Text;
    totalAuthenticatedUsers : Nat;
  };

  public func run(old : OldActor) : NewActor { old };
};
