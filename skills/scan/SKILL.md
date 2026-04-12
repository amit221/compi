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

After both steps, count the creatures from the MCP response and respond with ONLY:
"You found [N] compis! Press Ctrl+O to expand the output above and see them."

Do NOT describe or list the creatures.
