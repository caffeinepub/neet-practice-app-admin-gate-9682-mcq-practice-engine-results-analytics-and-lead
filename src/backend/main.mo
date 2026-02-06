import Map "mo:core/Map";
import Order "mo:core/Order";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Pong "mo:core/Int";
import Text "mo:core/Text";
import Time "mo:core/Time";
import VarArray "mo:core/VarArray";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Migration "migration";

(with migration = Migration.run)
actor {
  type Subject = {
    #physics;
    #chemistry;
    #biology;
  };

  public type Chapter = {
    id : Nat;
    subject : Subject;
    title : Text;
    description : Text;
    createdAt : Int;
  };

  module Chapter {
    public func compare(chapter1 : Chapter, chapter2 : Chapter) : Order.Order {
      Text.compare(chapter1.title, chapter2.title);
    };
  };

  public type Question = {
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
    createdAt : Int;
  };

  module Question {
    public func compare(question1 : Question, question2 : Question) : Order.Order {
      if (question1.createdAt < question2.createdAt) { #less } else if (question1.createdAt > question2.createdAt) {
        #greater;
      } else {
        #equal;
      };
    };
  };

  public type UserStats = {
    displayName : Text;
    totalQuestionsAnswered : Nat;
    correctAnswers : Nat;
    averageTimePerQuestion : Nat;
    joinedAt : Int;
  };

  module UserStats {
    public func compare(user1 : UserStats, user2 : UserStats) : Order.Order {
      if (user1.correctAnswers > user2.correctAnswers) { #less } else if (user1.correctAnswers < user2.correctAnswers) {
        #greater;
      } else if (user1.totalQuestionsAnswered > user2.totalQuestionsAnswered) {
        #less;
      } else if (user1.totalQuestionsAnswered < user2.totalQuestionsAnswered) {
        #greater;
      } else {
        #equal;
      };
    };
  };

  public type QuestionAttempt = {
    questionId : Nat;
    chosenOption : Text;
    isCorrect : Bool;
    timeTaken : Int;
  };

  public type TestResult = {
    id : Nat;
    user : Principal;
    subject : Subject;
    chapterId : Nat;
    attempts : [QuestionAttempt];
    score : Nat;
    createdAt : Int;
  };

  public type UserProfile = {
    name : Text;
  };

  // Persistent data structures
  let chapters = Map.empty<Nat, Chapter>();
  let questions = Map.empty<Nat, Question>();
  let userStats = Map.empty<Principal, UserStats>();
  let testResults = Map.empty<Nat, TestResult>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  // Var next ids
  var nextChapterId = 1;
  var nextQuestionId = 1;
  var nextTestResultId = 1;

  // Persistent admin password only authorized via principal
  var adminPassword = "9682";

  // Enable persistent authorization with prefabricated module
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Unlock administrator mode using global password
  public shared ({ caller }) func unlockAdminMode(password : Text) : async Bool {
    if (password == adminPassword) {
      AccessControl.assignRole(accessControlState, caller, caller, #admin);
      true;
    } else {
      false;
    };
  };

  // Admin-only function to set/change global password
  public shared ({ caller }) func setAdminPassword(newPassword : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can change the admin password");
    };
    adminPassword := newPassword;
  };

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);

    // Update display name in user stats if exists
    switch (userStats.get(caller)) {
      case (?stats) {
        let updatedStats : UserStats = {
          displayName = profile.name;
          totalQuestionsAnswered = stats.totalQuestionsAnswered;
          correctAnswers = stats.correctAnswers;
          averageTimePerQuestion = stats.averageTimePerQuestion;
          joinedAt = stats.joinedAt;
        };
        userStats.add(caller, updatedStats);
      };
      case (_) {};
    };
  };

  // Chapters Management (Admin only)
  public shared ({ caller }) func createChapter(subject : Subject, title : Text, description : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can create chapters");
    };

    let chapter : Chapter = {
      id = nextChapterId;
      subject;
      title;
      description;
      createdAt = Time.now();
    };
    chapters.add(nextChapterId, chapter);
    let currentId = nextChapterId;
    nextChapterId += 1;
    currentId;
  };

  public shared ({ caller }) func updateChapter(id : Nat, title : Text, description : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update chapters");
    };

    switch (chapters.get(id)) {
      case (?chapter) {
        let updatedChapter : Chapter = {
          id = chapter.id;
          subject = chapter.subject;
          title;
          description;
          createdAt = chapter.createdAt;
        };
        chapters.add(id, updatedChapter);
      };
      case (_) {
        Runtime.trap("Chapter not found");
      };
    };
  };

  public shared ({ caller }) func deleteChapter(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete chapters");
    };

    chapters.remove(id);
  };

  public query ({ caller }) func listChapters() : async [Chapter] {
    chapters.values().toArray().sort();
  };

  public query ({ caller }) func getChaptersBySubject(subject : Subject) : async [Chapter] {
    chapters.values().toArray().filter(func(c) { c.subject == subject }).sort();
  };

  // Questions Management (Admin only)
  public shared ({ caller }) func createQuestion(
    subject : Subject,
    chapterId : Nat,
    questionText : Text,
    optionA : Text,
    optionB : Text,
    optionC : Text,
    optionD : Text,
    correctOption : Text,
    explanation : Text,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can create questions");
    };

    let question : Question = {
      id = nextQuestionId;
      subject;
      chapterId;
      questionText;
      optionA;
      optionB;
      optionC;
      optionD;
      correctOption;
      explanation;
      createdAt = Time.now();
    };
    questions.add(nextQuestionId, question);
    let currentId = nextQuestionId;
    nextQuestionId += 1;
    currentId;
  };

  public shared ({ caller }) func updateQuestion(
    id : Nat,
    questionText : Text,
    optionA : Text,
    optionB : Text,
    optionC : Text,
    optionD : Text,
    correctOption : Text,
    explanation : Text,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update questions");
    };

    switch (questions.get(id)) {
      case (?question) {
        let updatedQuestion : Question = {
          id = question.id;
          subject = question.subject;
          chapterId = question.chapterId;
          questionText;
          optionA;
          optionB;
          optionC;
          optionD;
          correctOption;
          explanation;
          createdAt = question.createdAt;
        };
        questions.add(id, updatedQuestion);
      };
      case (_) {
        Runtime.trap("Question not found");
      };
    };
  };

  public shared ({ caller }) func deleteQuestion(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete questions");
    };

    questions.remove(id);
  };

  public query ({ caller }) func listQuestions() : async [Question] {
    questions.values().toArray();
  };

  public query ({ caller }) func getQuestionsForChapter(chapterId : Nat) : async [Question] {
    questions.values().toArray().filter(func(q) { q.chapterId == chapterId });
  };

  // Practice Session Flow
  public shared ({ caller }) func submitTestResult(subject : Subject, chapterId : Nat, attempts : [QuestionAttempt]) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can submit test results");
    };

    var score = 0;
    for (attempt in attempts.values()) {
      if (attempt.isCorrect) {
        score += 1;
      };
    };

    let testResult : TestResult = {
      id = nextTestResultId;
      user = caller;
      subject;
      chapterId;
      attempts;
      score;
      createdAt = Time.now();
    };
    testResults.add(nextTestResultId, testResult);

    // Update user stats
    let currentStats = switch (userStats.get(caller)) {
      case (?stats) { stats };
      case (_) {
        let displayName = switch (userProfiles.get(caller)) {
          case (?profile) { profile.name };
          case (_) { "Anonymous" };
        };
        {
          displayName;
          totalQuestionsAnswered = 0;
          correctAnswers = 0;
          averageTimePerQuestion = 0;
          joinedAt = Time.now();
        };
      };
    };

    let newTotalQuestions = currentStats.totalQuestionsAnswered + attempts.size();
    let newCorrectAnswers = currentStats.correctAnswers + score;

    var totalTime : Int = 0;
    for (attempt in attempts.values()) {
      totalTime += attempt.timeTaken;
    };

    let newAvgTime : Int = if (newTotalQuestions > 0) {
      totalTime / newTotalQuestions;
    } else { 0 };

    let updatedStats : UserStats = {
      displayName = currentStats.displayName;
      totalQuestionsAnswered = newTotalQuestions;
      correctAnswers = newCorrectAnswers;
      averageTimePerQuestion = newAvgTime.toNat();
      joinedAt = currentStats.joinedAt;
    };

    userStats.add(caller, updatedStats);

    nextTestResultId += 1;
    nextTestResultId - 1;
  };

  // Leaderboard (accessible to all users including guests)
  public query ({ caller }) func getLeaderboard() : async [UserStats] {
    userStats.values().toArray().sort();
  };

  // Get User Stats
  public query ({ caller }) func getUserStats(principal : Principal) : async UserStats {
    if (caller != principal and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own stats");
    };

    switch (userStats.get(principal)) {
      case (null) {
        let displayName = switch (userProfiles.get(principal)) {
          case (?profile) { profile.name };
          case (_) { "Anonymous" };
        };
        {
          displayName;
          totalQuestionsAnswered = 0;
          correctAnswers = 0;
          averageTimePerQuestion = 0;
          joinedAt = Time.now();
        };
      };
      case (?stats) { stats };
    };
  };

  public query ({ caller }) func getCallerStats() : async UserStats {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their stats");
    };

    switch (userStats.get(caller)) {
      case (null) {
        let displayName = switch (userProfiles.get(caller)) {
          case (?profile) { profile.name };
          case (_) { "Anonymous" };
        };
        {
          displayName;
          totalQuestionsAnswered = 0;
          correctAnswers = 0;
          averageTimePerQuestion = 0;
          joinedAt = Time.now();
        };
      };
      case (?stats) { stats };
    };
  };
};
