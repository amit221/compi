---
name: catch
model: claude-haiku-4-5-20251001
description: Attempt to catch a nearby creature
---

Parse the argument for which creature number (1-indexed) from the scan list.

Usage: `/catch [number]`

1. Call the `mcp__plugin_compi_compi__catch` tool with the parsed `index` (number).
2. Then run this Bash command to display the result with colors:
   ```
   _t="$(node -p "require('os').tmpdir()")" && cat "$_t/compi_display.txt" && rm -f "$_t/compi_display.txt"
   ```

After both steps, respond with ONLY:
"Press Ctrl+O to expand the output above and see the result."

Do NOT describe the catch result.
