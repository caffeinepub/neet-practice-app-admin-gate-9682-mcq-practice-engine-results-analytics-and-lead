import Map "mo:core/Map";
import Order "mo:core/Order";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
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

  module Subject {
    public func toText(subject : Subject) : Text {
      switch (subject) {
        case (#physics) { "physics" };
        case (#chemistry) { "chemistry" };
        case (#biology) { "biology" };
      };
    };
  };

  public type Chapter = {
    id : Nat;
    subject : Subject;
    title : Text;
    description : Text;
    sequence : Nat;
    createdAt : Int;
  };

  module Chapter {
    public func compare(chapter1 : Chapter, chapter2 : Chapter) : Order.Order {
      if (chapter1.subject != chapter2.subject) {
        let getSubjectOrder : Subject -> Nat = func(s : Subject) {
          switch (s) {
            case (#physics) { 0 };
            case (#chemistry) { 1 };
            case (#biology) { 2 };
          };
        };
        Nat.compare(getSubjectOrder(chapter1.subject), getSubjectOrder(chapter2.subject));
      } else {
        Nat.compare(chapter1.sequence, chapter2.sequence);
      };
    };
  };

  public type Category = {
    #level1;
    #neetPYQ;
    #jeePYQ;
  };

  module Category {
    public func toText(category : Category) : Text {
      switch (category) {
        case (#level1) { "Level 1" };
        case (#neetPYQ) { "NEET PYQ" };
        case (#jeePYQ) { "JEE PYQ" };
      };
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
    category : Category;
    createdAt : Int;
    year : ?Nat;
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

  public type PracticeProgressKey = {
    subject : Subject;
    chapterId : Nat;
    category : Category;
    year : ?Nat;
  };

  module PracticeProgressKey {
    public func toText(key : PracticeProgressKey) : Text {
      let yearText = switch (key.year) {
        case (?y) { "Year-" # y.toText() };
        case (null) { "Book" };
      };
      Subject.toText(key.subject) # "-" # key.chapterId.toText() # "-" # Category.toText(key.category) # "-" # yearText;
    };
  };

  public type PracticeProgress = {
    lastQuestionIndex : Nat;
    discoveredQuestionIds : [Nat];
  };

  // Persistent data structures
  let chapters = Map.empty<Nat, Chapter>();
  let questions = Map.empty<Nat, Question>();
  let userStats = Map.empty<Principal, UserStats>();
  let testResults = Map.empty<Nat, TestResult>();
  let contributorAccess = Map.empty<Principal, Bool>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let practiceProgress = Map.empty<Principal, Map.Map<Text, PracticeProgress>>();

  // Var next ids
  var nextChapterId = 1;
  var nextQuestionId = 1;
  var nextTestResultId = 1;

  // Persistent admin password
  var contributorPassword = "9682";

  // Persistent count of unique authenticated users
  var totalAuthenticatedUsers = 0;

  // Enable persistent authorization with prefabricated module
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // ========= RESOURCE GUARDS ========= //
  public query ({ caller }) func hasContributorAccess() : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can check contributor access");
    };

    switch (contributorAccess.get(caller)) {
      case (?hasAccess) { hasAccess };
      case (null) { false };
    };
  };

  public query ({ caller }) func getTotalAuthenticatedUsers() : async Nat {
    if (not (isContributor(caller))) {
      Runtime.trap("Unauthorized: Only contributors can view authenticated user stats");
    };
    totalAuthenticatedUsers;
  };

  // ========= USER PROFILE ========= //
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

    if (not (userProfiles.containsKey(caller))) {
      totalAuthenticatedUsers += 1;
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

  // ========= CHAPTERS ========= //
  public shared ({ caller }) func createChapter(
    subject : Subject,
    title : Text,
    description : Text,
    sequence : Nat,
  ) : async Nat {
    if (not isContributor(caller) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only contributors can create chapters");
    };

    let chapter : Chapter = {
      id = nextChapterId;
      subject;
      title;
      description;
      sequence;
      createdAt = Time.now();
    };
    chapters.add(nextChapterId, chapter);
    let currentId = nextChapterId;
    nextChapterId += 1;
    currentId;
  };

  // Allow contributors to update chapter metadata (but not create/delete)
  public shared ({ caller }) func updateChapter(id : Nat, title : Text, description : Text, sequence : Nat) : async () {
    if (not (isContributor(caller))) {
      Runtime.trap("Unauthorized: Only contributors can update chapters");
    };

    switch (chapters.get(id)) {
      case (?chapter) {
        let updatedChapter : Chapter = {
          id = chapter.id;
          subject = chapter.subject;
          title;
          description;
          sequence;
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

  public query func listChapters() : async [Chapter] {
    chapters.values().toArray().sort();
  };

  public query func getChaptersBySubject(subject : Subject) : async [Chapter] {
    chapters.values().toArray().filter(func(c) { c.subject == subject }).sort();
  };

  // ========= QUESTIONS ========= //
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
    category : Category,
    year : ?Nat,
  ) : async Nat {
    if (not isContributor(caller)) {
      Runtime.trap("Unauthorized: Only contributors can create questions");
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
      category;
      createdAt = Time.now();
      year;
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
    category : Category,
    year : ?Nat,
  ) : async () {
    if (not isContributor(caller)) {
      Runtime.trap("Unauthorized: Only contributors can update questions");
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
          category;
          createdAt = question.createdAt;
          year;
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

  public query func listQuestions() : async [Question] {
    questions.values().toArray();
  };

  public query func getQuestionsForChapter(chapterId : Nat) : async [Question] {
    questions.values().toArray().filter(func(q) { q.chapterId == chapterId });
  };

  public query func getQuestionsForYear(year : Nat, category : Category) : async [Question] {
    questions.values().toArray().filter(
      func(q) {
        switch (q.year) {
          case (?qYear) { qYear == year and q.category == category };
          case (null) { false };
        };
      }
    );
  };

  // ========= PRACTICE PROGRESS ========= //
  public shared ({ caller }) func savePracticeProgress(key : PracticeProgressKey, progress : PracticeProgress) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save practice progress");
    };

    let keyText = PracticeProgressKey.toText(key);
    let currentProgress = switch (practiceProgress.get(caller)) {
      case (?progressMap) { progressMap };
      case (null) { Map.empty<Text, PracticeProgress>() };
    };

    currentProgress.add(keyText, progress);
    practiceProgress.add(caller, currentProgress);
  };

  public query ({ caller }) func getPracticeProgress(key : PracticeProgressKey) : async ?PracticeProgress {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view practice progress");
    };

    let keyText = PracticeProgressKey.toText(key);
    switch (practiceProgress.get(caller)) {
      case (?progressMap) { progressMap.get(keyText) };
      case (null) { null };
    };
  };

  public shared ({ caller }) func getOrCreatePracticeProgress(
    key : PracticeProgressKey,
    totalQuestions : Nat,
  ) : async ?PracticeProgress {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get practice progress");
    };

    let keyText = PracticeProgressKey.toText(key);

    switch (practiceProgress.get(caller)) {
      case (?progressMap) {
        switch (progressMap.get(keyText)) {
          case (?progress) { ?progress };
          case (null) {
            let newProgress : PracticeProgress = {
              lastQuestionIndex = 1;
              discoveredQuestionIds = [];
            };
            progressMap.add(keyText, newProgress);
            ?newProgress;
          };
        };
      };
      case (null) {
        let newMap = Map.empty<Text, PracticeProgress>();
        let newProgress : PracticeProgress = {
          lastQuestionIndex = 1;
          discoveredQuestionIds = [];
        };
        newMap.add(keyText, newProgress);
        practiceProgress.add(caller, newMap);
        ?newProgress;
      };
    };
  };

  // ========= TEST RESULTS ========= //
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

  // ========= LEADERBOARD ========= //
  public query func getLeaderboard() : async [UserStats] {
    userStats.values().toArray().sort();
  };

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

  func isContributor(caller : Principal) : Bool {
    switch (contributorAccess.get(caller)) {
      case (?hasAccess) { hasAccess };
      case (null) { false };
    };
  };
};
