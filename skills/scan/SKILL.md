---
name: scan
model: claude-haiku-4-5-20251001
description: Show nearby creatures that can be caught
---

1. Call the `mcp__plugin_compi_compi__scan` tool to scan for nearby creatures.
2. Then run this Bash command to display the result with colors:
   ```
   _t="$(node -p "require('os').tmpdir()")" && cat "$_t/compi_display.txt" && rm -f "$_t/compi_display.txt"
   ```

After both steps:
- Narrate the scan result in 2-3 sentences with game personality. Comment on how many creatures appeared and name any species you can spot in the response. Suggest catching the most interesting one if relevant.
- End with: "Press Ctrl+O to expand the output above and see them."

Example narrator lines:
- Active batch: "Three signals locked in — a Flurf, a Gloomtail, and something rare flickering at the edge. That Gloomtail looks catchable. Strike now before the batch expires!"
- Empty scan: "Dead air out there — nothing lurking in the static yet. Hang tight, the wilds move on their own schedule."

Keep narrator commentary to 2-3 sentences. Do NOT list or describe individual creatures in detail.
