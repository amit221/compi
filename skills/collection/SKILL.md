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

After both steps, respond with ONLY:
"Press Ctrl+O to expand the output above and see your collection."

Do NOT describe the collection.
