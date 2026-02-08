# Specification

## Summary
**Goal:** Make practice sessions easier to navigate and resume, and organize NEET/JEE PYQs year-wise while seeding NEET-aligned chapters and year-tagged PYQ content.

**Planned changes:**
- Add a visible question-number navigator (list/grid 1..N) on the Practice page that lets students jump to any question and highlights the current question, with consistent behavior when answer feedback is shown.
- Persist and restore the last viewed question per (subject, chapter, category): use localStorage for anonymous users and backend-stored practice progress for authenticated users; clear stored progress after a completed/submitted test so the next attempt starts at question 1.
- Add a year field to PYQ questions (NEET PYQ and JEE PYQ) with backward-compatible handling for existing data, and add frontend year selection before starting PYQ practice when multiple years are available.
- Seed NEET-syllabus-based chapters for Physics, Chemistry, and Biology with deterministic ordering, and seed NEET/JEE PYQ question banks with year-tagged questions covering 2025 down to 2000; ensure seeding is idempotent and all seeded questions render correctly.

**User-visible outcome:** Students can click question numbers to jump around during practice, return later to the exact question they left off for the same selection, choose a PYQ year (when available) before practicing, and see populated NEET chapters and year-wise PYQ sets instead of empty lists.
