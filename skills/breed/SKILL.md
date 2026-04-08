---
name: breed
model: claude-haiku-4-5-20251001
description: Breed two creatures from your collection
---

Parse the arguments for two parent creature IDs.

Usage: `/breed [parentAId] [parentBId]`

1. Call `mcp__plugin_compi_compi__breed` with `parentAId` and `parentBId` (no `confirm`) to get the preview.
2. Then run this Bash command to display it with colors:
   ```
   cat "$LOCALAPPDATA/Temp/compi_display.txt" && rm -f "$LOCALAPPDATA/Temp/compi_display.txt"
   ```
3. Respond with: "Press Ctrl+O to expand the breed preview above. Proceed with /breed [parentAId] [parentBId] --confirm"

If `--confirm` is in the arguments:
1. Call `mcp__plugin_compi_compi__breed` with `parentAId`, `parentBId`, and `confirm: true`.
2. Run the same Bash cat+rm command.
3. Respond with: "Press Ctrl+O to expand the breed result above."
