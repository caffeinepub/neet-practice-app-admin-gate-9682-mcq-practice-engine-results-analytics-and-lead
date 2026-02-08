# Specification

## Summary
**Goal:** Restore the student practice navigation/session loading flow and remove per-question deletion controls from contributor mode, while ensuring contributor-created questions are visible to students (including logged-out users).

**Planned changes:**
- Remove all per-question delete UI and related confirmation/wiring from the Contributor Panel (trash/delete controls and single-question delete flow).
- Fix navigation/parameter passing from ChapterCategorySelectPage to PracticePage so subject, chapterId, and category are correctly populated and the “Invalid Practice Session” validation error does not appear during normal use (including handling year selection only when applicable).
- Update backend read-only access so unauthenticated users can load the chapter/question lists used by student practice, and ensure contributor-created questions are returned by the student query endpoints.

**User-visible outcome:** Contributors can create/edit questions without seeing any per-question delete option, and students (even when not logged in) can open a level/category and start practice sessions normally with questions loading correctly for Level 1, NEET PYQ, and JEE PYQ.
