# Specification

## Summary
**Goal:** Make PDF-imported questions faithfully preserve symbols/formatting and include PDF figures, and add an admin-only delete option in question management.

**Planned changes:**
- Improve PDF-to-question extraction to preserve Unicode symbols (e.g., λ, π), line breaks, and spacing without normalizing away characters or collapsing whitespace; ensure import preview and saved question content match exactly.
- Add handling to include figures/diagrams from PDFs in imported question content so figures appear in the import preview and continue to render after saving wherever the question is shown.
- Show a clear error message when a PDF contains no extractable text (scanned/image-only) and cannot be imported as text.
- Add an admin-only delete action in the question management UI wired to the existing `deleteQuestion` backend function, including a confirmation prompt and automatic list refresh after deletion.

**User-visible outcome:** Importing questions from PDFs preserves special symbols and formatting and includes any figures/diagrams in both preview and saved questions; admins can delete questions from the management UI with confirmation and see the list update immediately, while non-admins cannot delete.
