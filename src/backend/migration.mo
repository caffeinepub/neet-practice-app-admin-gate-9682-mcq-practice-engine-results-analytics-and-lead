import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Order "mo:core/Order";

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
    user : Principal;
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
    category : {
      #level1;
      #neetPYQ;
      #jeePYQ;
    };
  };

  type PracticeProgress = {
    lastQuestionId : Nat;
    discoveredQuestionIds : [Nat];
  };

  type OldQuestion = {
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
    category : {
      #level1;
      #neetPYQ;
      #jeePYQ;
    };
    createdAt : Int;
  };

  type OldActor = {
    chapters : Map.Map<Nat, Chapter>;
    questions : Map.Map<Nat, OldQuestion>;
    userStats : Map.Map<Principal, UserStats>;
    testResults : Map.Map<Nat, TestResult>;
    contributorAccess : Map.Map<Principal, Bool>;
    userProfiles : Map.Map<Principal, UserProfile>;
    practiceProgress : Map.Map<Principal, Map.Map<Text, PracticeProgress>>;
    nextChapterId : Nat;
    nextQuestionId : Nat;
    nextTestResultId : Nat;
    contributorPassword : Text;
    totalAuthenticatedUsers : Nat;
  };

  type NewQuestion = {
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
    category : {
      #level1;
      #neetPYQ;
      #jeePYQ;
    };
    createdAt : Int;
    year : ?Nat;
  };

  type NewPracticeProgressKey = {
    subject : Subject;
    chapterId : Nat;
    category : {
      #level1;
      #neetPYQ;
      #jeePYQ;
    };
    year : ?Nat;
  };

  type NewPracticeProgress = {
    lastQuestionIndex : Nat;
    discoveredQuestionIds : [Nat];
  };

  type NewActor = {
    chapters : Map.Map<Nat, Chapter>;
    questions : Map.Map<Nat, NewQuestion>;
    userStats : Map.Map<Principal, UserStats>;
    testResults : Map.Map<Nat, TestResult>;
    contributorAccess : Map.Map<Principal, Bool>;
    userProfiles : Map.Map<Principal, UserProfile>;
    practiceProgress : Map.Map<Principal, Map.Map<Text, NewPracticeProgress>>;
    nextChapterId : Nat;
    nextQuestionId : Nat;
    nextTestResultId : Nat;
    contributorPassword : Text;
    totalAuthenticatedUsers : Nat;
  };

  public func run(old : OldActor) : NewActor {
    let newQuestions = old.questions.map<Nat, OldQuestion, NewQuestion>(
      func(_id, oldQ) { { oldQ with year = null } }
    );

    let newPracticeProgress = old.practiceProgress.map<Principal, Map.Map<Text, PracticeProgress>, Map.Map<Text, NewPracticeProgress>>(
      func(_p, oldProgress) {
        oldProgress.map<Text, PracticeProgress, NewPracticeProgress>(
          func(_k, oldPP) {
            { oldPP with lastQuestionIndex = oldPP.lastQuestionId };
          }
        );
      }
    );

    {
      old with
      questions = newQuestions;
      practiceProgress = newPracticeProgress;
    };
  };
};
