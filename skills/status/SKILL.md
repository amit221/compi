---
name: status
model: claude-haiku-4-5-20251001
description: View your player profile and game stats
---

1. Call the `mcp__plugin_compi_compi__status` tool to view player stats.
2. Then run this Bash command to display it with colors:
   ```
   _t="$(node -p "require('os').tmpdir()")" && cat "$_t/compi_display.txt" && rm -f "$_t/compi_display.txt"
   ```

After both steps:
- Narrate the player's current standing in 2-3 sentences with game personality. Reference their specific level, streak, or gold from the response. Suggest a next action when relevant (e.g., spend gold on an upgrade, go on a quest, or catch more creatures).
- End with: "Press Ctrl+O to expand the output above."

Example narrator lines:
- Active player: "Level 8, a 5-day streak, and 47 gold burning a hole in your pocket — you're in prime shape. That gold could push a trait into Uncommon territory right now."
- Just starting: "Level 2 with a fresh haul of 3 creatures — the adventure is just beginning. Time to send them on their first quest and get that gold rolling."
- Quest active: "Your crew is out on a quest and the clock is ticking. Scan for new catches while you wait — no point leaving energy on the table."

Keep narrator commentary to 2-3 sentences. Do NOT reproduce all stats in plain text.
