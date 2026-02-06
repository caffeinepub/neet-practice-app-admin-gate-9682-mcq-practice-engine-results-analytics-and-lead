# Specification

## Summary
**Goal:** Make the Admin unlock flow work reliably so entering password "9682" enables Admin Mode, including for already-deployed canisters that still have the old default password.

**Planned changes:**
- Update the backend admin password handling so `unlockAdminMode("9682")` succeeds for the logged-in caller and incorrect passwords fail without granting admin.
- Add a conditional backend migration on upgrade: if the stored stable admin password is exactly "admin123", change it to "9682"; otherwise preserve any customized password.
- Update the frontend Admin Gate flow to immediately reflect successful unlock in the same session (render admin panel and show Admin navigation link) and show an English invalid-password error on failure.

**User-visible outcome:** Users can enter "9682" to unlock Admin Mode and see the admin panel and Admin navigation appear immediately without refreshing; incorrect passwords show an English error and do not unlock.
