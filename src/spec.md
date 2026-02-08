# Specification

## Summary
**Goal:** Remove PDF import from Contributor mode, ensure questions persist across upgrades, and fix “Something went wrong” errors in Student/Practice caused by missing/mismatched question IDs.

**Planned changes:**
- Remove all PDF upload/import UI and related flows from Contributor mode, restoring manual question create/edit/delete only.
- Fix backend bulk-create so returned question IDs always match the IDs stored and retrievable via normal queries.
- Update Student/Practice flow to handle empty question sets, invalid saved progress indices, and missing questions gracefully with an in-page English message and safe back navigation (no global error screen).
- Preserve existing chapters/questions and ID counters across backend upgrades by ensuring actor state is retained and migrated when needed.
- Ensure Student views list and practice only persisted questions from backend queries (no PDF-extraction/preview data paths).

**User-visible outcome:** Contributors can only add/edit questions manually (no PDF import). Students can open and practice questions without hitting a global error screen; if no questions exist or progress is invalid, they see a clear message and can navigate back. Existing questions remain available after future updates, and only admin-added/persisted questions appear in Student mode.
