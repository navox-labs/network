---
name: Revert means undo last change only
description: When user says "revert", they mean undo the most recent change — not reset to last commit
type: feedback
---

When the user asks to "revert", they mean undo only the last change made, not `git checkout` the entire file back to the last commit.

**Why:** A `git checkout` wiped out all in-progress Feature 1 work on AskCoachDialog.tsx, requiring a full file rewrite to restore.

**How to apply:** Use the Edit tool to reverse the specific change, or keep a copy of the prior state before editing. Only use `git checkout`/`git restore` if the user explicitly asks to reset to the committed version.
