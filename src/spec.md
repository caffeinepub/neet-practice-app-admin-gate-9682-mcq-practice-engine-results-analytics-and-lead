# Specification

## Summary
**Goal:** Keep students’ selected answers saved while navigating between practice questions, and add end-of-session review plus overall and subject-wise student rankings.

**Planned changes:**
- Persist each question’s selected answer across next/previous navigation and jump-to-question navigation, and include all saved attempts in the session summary.
- Add a results/review flow that loads a submitted test result by `resultId` from the backend and renders score breakdown and per-question review (chosen vs correct) based on stored attempts.
- Add leaderboards for Overall and per-subject (physics, chemistry, biology), including backend queries and a UI switcher to view rankings by scope.

**User-visible outcome:** Students can move through questions without losing prior selections, review a completed session with accurate saved answers and scoring, and view both overall and subject-wise rankings of all students.
