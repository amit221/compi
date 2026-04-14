---
name: quest
model: claude-haiku-4-5-20251001
description: Send creatures on a quest or check quest progress
---

Parse the arguments. The command supports two shapes:

- `/quest start <creatureId1> [creatureId2] [creatureId3]` — send 1-3 creatures on a quest
- `/quest check` — check if the active quest is complete and collect rewards

Flow:

1. Run the appropriate Bash command (renders colors directly):
   - Start: `node scripts/cli.js quest start <id1> [id2] [id3]`
   - Check: `node scripts/cli.js quest check`

Then respond based on which mode was used:

- Start mode:
  - Narrate the quest departure in 1-2 sentences (e.g. "Your crew heads out into the unknown — come back with gold!").
  - End with: "Press Ctrl+O to expand the output above. Your creatures are on their quest!"
- Check mode (complete):
  - Narrate the return in 1-2 sentences (e.g. celebrate the gold and XP earned).
  - End with: "Press Ctrl+O to expand the output above and see your rewards."
- Check mode (in progress): Report the in-progress message as-is.
- Error mode: Report the error message as-is.

Keep narrator commentary to 1-2 sentences. Do not describe the full tool output in your own words.
