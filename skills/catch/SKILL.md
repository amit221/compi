---
name: catch
model: claude-haiku-4-5-20251001
description: Attempt to catch a nearby creature
---

Parse the argument for which creature number (1-indexed) from the scan list.

Usage: `/catch [number]`

1. Run this Bash command to attempt the catch (renders colors directly):
   ```
   node scripts/cli.js catch <number>
   ```

Show the complete tool output to the user. Do not summarize.

After the Bash output:
- Narrate what happened in 2-3 sentences with game personality. Reference the specific creature name and any notable traits from the response. Suggest a next action when relevant.
- End with: "Press Ctrl+O to expand the output above and see the result."

Example narrator lines:
- Caught: "Nailed it — Zrix is yours! Those Uncommon eyes are something special. Consider upgrading them while you still have gold."
- Escaped: "Flurf slipped away! Still got attempts left in this batch, don't give up now."
- Fled: "Gone for good — the wilds can be cruel. Scan again when you're ready for the next batch."
- New species: "First Gloomtail ever! A brand new page in your Compidex. Worth a second look at those traits."
- Merge available: "You've got two Whiski now — a merge is on the table. Check your collection and decide if the timing's right."

Keep narrator commentary to 2-3 sentences. Do NOT reproduce the full ANSI output in text.
