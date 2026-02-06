import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Int "mo:core/Int";

module {
  // Define all persistent types in the actor that are not var.
  type Chapter = {
    id : Nat;
    subject : {
      #physics;
      #chemistry;
      #biology;
    };
    title : Text;
    description : Text;
    createdAt : Int;
  };

  type Question = {
    id : Nat;
    subject : {
      #physics;
      #chemistry;
      #biology;
    };
    chapterId : Nat;
    questionText : Text;
    optionA : Text;
    optionB : Text;
    optionC : Text;
    optionD : Text;
    correctOption : Text;
    explanation : Text;
    createdAt : Int;
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
    subject : { #physics; #chemistry; #biology };
    chapterId : Nat;
    attempts : [QuestionAttempt];
    score : Nat;
    createdAt : Int;
  };

  type UserProfile = {
    name : Text;
  };

  type OldActor = {
    chapters : Map.Map<Nat, Chapter>;
    questions : Map.Map<Nat, Question>;
    userStats : Map.Map<Principal.Principal, UserStats>;
    testResults : Map.Map<Nat, TestResult>;
    userProfiles : Map.Map<Principal.Principal, UserProfile>;
    nextChapterId : Nat;
    nextQuestionId : Nat;
    nextTestResultId : Nat;
    adminPassword : Text;
  };

  type NewActor = OldActor;

  // Perform migration if existing canister holds old default password.
  public func run(old : OldActor) : NewActor {
    let newPassword = if (old.adminPassword == "admin123") {
      "9682";
    } else {
      old.adminPassword;
    };
    { old with adminPassword = newPassword };
  };
};
