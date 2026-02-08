import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Principal "mo:core/Principal";
import Blob "mo:core/Blob";
import AccessControl "authorization/access-control";
import Storage "blob-storage/Storage";

module {
  type Subject = {
    #physics;
    #chemistry;
    #biology;
  };

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
    questionImage : ?Storage.ExternalBlob;
    explanationImage : ?Storage.ExternalBlob;
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

  type PracticeProgress = {
    lastQuestionIndex : Nat;
    discoveredQuestionIds : [Nat];
  };

  type Actor = {
    questions : Map.Map<Nat, Question>;
    chapters : Map.Map<Nat, Chapter>;
    userStats : Map.Map<Principal.Principal, UserStats>;
    accessControlState : AccessControl.AccessControlState;
    testResults : Map.Map<Nat, TestResult>;
    contributorAccess : Map.Map<Principal.Principal, Bool>;
    nextChapterId : Nat;
    nextQuestionId : Nat;
    nextTestResultId : Nat;
    contributorPassword : Text;
    totalAuthenticatedUsers : Nat;
    practiceProgress : Map.Map<Principal.Principal, Map.Map<Text, PracticeProgress>>;
    userProfiles : Map.Map<Principal.Principal, { name : Text }>;
  };

  public func run(old : Actor) : Actor {
    old;
  };
};
