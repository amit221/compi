---
name: collection
model: claude-haiku-4-5-20251001
description: Browse your caught creatures and their traits
---

1. Run this Bash command to view your collection (renders colors directly):
   ```
   node scripts/cli.js collection
   ```

Show the complete tool output to the user. Do not summarize.

After the Bash output:
- Narrate the collection state in 2-3 sentences with game personality. Reference any standout creature names or trait tiers you can see in the response. Suggest a next action if relevant (e.g., breed a strong pair, make room if nearly full, or catch a new species).
- End with: "Press Ctrl+O to expand the output above and see your collection."

Example narrator lines:
- Strong roster: "A solid crew — Zrix is carrying the team with those Uncommon traits. Great breeding potential there."
- Nearly full: "You're at 14/15 slots — one more catch and you'll need to make a hard choice. Worth archiving a duplicate before you scan again."
- Empty: "No creatures yet! Head out with /scan and catch your first companion."

Keep narrator commentary to 2-3 sentences. Do NOT list or describe individual creatures in detail.
