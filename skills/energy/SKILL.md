---
name: energy
model: claude-haiku-4-5-20251001
description: Show current energy level
---

1. Call the `mcp__plugin_compi_compi__energy` tool to check energy.
2. Then run this Bash command to display it with colors:
   ```
   _t="$(node -p "require('os').tmpdir()")" && cat "$_t/compi_display.txt" && rm -f "$_t/compi_display.txt"
   ```

After both steps, respond with ONLY:
"Press Ctrl+O to expand the output above."
