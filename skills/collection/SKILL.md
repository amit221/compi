---
name: collection
model: claude-haiku-4-5-20251001
description: Browse your caught creatures and their traits
---

1. Call the `mcp__plugin_compi_compi__collection` tool to browse caught creatures.
2. Then run this Bash command to display the result with colors:
   ```
   _t="$(node -p "require('os').tmpdir()")" && cat "$_t/compi_display.txt" && rm -f "$_t/compi_display.txt"
   ```

After both steps:
- Narrate the collection state in 2-3 sentences with game personality. Reference any standout creature names or trait tiers you can see in the response. Suggest a next action if relevant (e.g., upgrade a strong trait, make room if nearly full, or send someone on a quest).
- End with: "Press Ctrl+O to expand the output above and see your collection."

Example narrator lines:
- Strong roster: "A solid crew — Zrix is carrying the team with those Uncommon traits. That's quest material right there."
- Nearly full: "You're at 14/15 slots — one more catch and you'll need to make a hard choice. Worth archiving a duplicate before you scan again."
- Empty: "No creatures yet! Head out with /scan and catch your first companion."

Keep narrator commentary to 2-3 sentences. Do NOT list or describe individual creatures in detail.
