import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Storage "blob-storage/Storage";
import AccessControl "authorization/access-control";

module {
  type OldSubject = {
    #physics;
    #chemistry;
    #biology;
  };

  type OldChapter = {
    id : Nat;
    subject : OldSubject;
    title : Text;
    description : Text;
    sequence : Nat;
    createdAt : Int;
  };

  type OldCategory = {
    #level1;
    #neetPYQ;
    #jeePYQ;
  };

  type OldQuestion = {
    id : Nat;
    subject : OldSubject;
    chapterId : Nat;
    questionText : Text;
    optionA : Text;
    optionB : Text;
    optionC : Text;
    optionD : Text;
    correctOption : Text;
    explanation : Text;
    category : OldCategory;
    createdAt : Int;
    year : ?Nat;
  };

  type OldUserStats = {
    displayName : Text;
    totalQuestionsAnswered : Nat;
    correctAnswers : Nat;
    averageTimePerQuestion : Nat;
    joinedAt : Int;
  };

  type OldSubjectUserStats = {
    user : Principal;
    displayName : Text;
    subject : OldSubject;
    totalQuestionsAnswered : Nat;
    correctAnswers : Nat;
    accuracy : Float;
    averageTimePerQuestion : Nat;
    joinedAt : Int;
  };

  type OldQuestionAttempt = {
    questionId : Nat;
    chosenOption : Text;
    isCorrect : Bool;
    timeTaken : Int;
  };

  type OldTestResult = {
    id : Nat;
    user : Principal;
    subject : OldSubject;
    chapterId : Nat;
    attempts : [OldQuestionAttempt];
    score : Nat;
    createdAt : Int;
  };

  type OldUserProfile = {
    name : Text;
  };

  type OldPracticeProgressKey = {
    subject : OldSubject;
    chapterId : Nat;
    category : OldCategory;
    year : ?Nat;
  };

  type OldPracticeProgress = {
    lastQuestionIndex : Nat;
    discoveredQuestionIds : [Nat];
  };

  type OldActor = {
    chapters : Map.Map<Nat, OldChapter>;
    questions : Map.Map<Nat, OldQuestion>;
    userStats : Map.Map<Principal, OldUserStats>;
    testResults : Map.Map<Nat, OldTestResult>;
    contributorAccess : Map.Map<Principal, Bool>;
    userProfiles : Map.Map<Principal, OldUserProfile>;
    practiceProgress : Map.Map<Principal, Map.Map<Text, OldPracticeProgress>>;
    nextChapterId : Nat;
    nextQuestionId : Nat;
    nextTestResultId : Nat;
    contributorPassword : Text;
    totalAuthenticatedUsers : Nat;
    accessControlState : AccessControl.AccessControlState;
  };

  type NewQuestion = {
    id : Nat;
    subject : OldSubject;
    chapterId : Nat;
    questionText : Text;
    optionA : Text;
    optionB : Text;
    optionC : Text;
    optionD : Text;
    correctOption : Text;
    explanation : Text;
    category : OldCategory;
    createdAt : Int;
    year : ?Nat;
    questionImage : ?Storage.ExternalBlob;
    explanationImage : ?Storage.ExternalBlob;
  };

  type NewActor = {
    chapters : Map.Map<Nat, OldChapter>;
    questions : Map.Map<Nat, NewQuestion>;
    userStats : Map.Map<Principal, OldUserStats>;
    testResults : Map.Map<Nat, OldTestResult>;
    contributorAccess : Map.Map<Principal, Bool>;
    userProfiles : Map.Map<Principal, OldUserProfile>;
    practiceProgress : Map.Map<Principal, Map.Map<Text, OldPracticeProgress>>;
    nextChapterId : Nat;
    nextQuestionId : Nat;
    nextTestResultId : Nat;
    contributorPassword : Text;
    totalAuthenticatedUsers : Nat;
    accessControlState : AccessControl.AccessControlState;
  };

  public func run(old : OldActor) : NewActor {
    let newQuestions = old.questions.map<Nat, OldQuestion, NewQuestion>(
      func(_id, oldQuestion) {
        { oldQuestion with questionImage = null; explanationImage = null };
      }
    );
    { old with questions = newQuestions };
  };
};
