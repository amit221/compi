---
name: archive
model: claude-haiku-4-5-20251001
description: View archive or archive a creature
---

Parse the arguments for an optional creature ID.

Usage: `/archive [creatureId]`

If a creature ID is provided:
1. Call `mcp__plugin_compi_compi__archive` with `id` set to the creature ID.
2. Then run this Bash command to display it with colors:
   ```
   cat "$LOCALAPPDATA/Temp/compi_display.txt" && rm -f "$LOCALAPPDATA/Temp/compi_display.txt"
   ```
3. Respond with: "Press Ctrl+O to expand the archive result above."

If no creature ID is provided:
1. Call `mcp__plugin_compi_compi__archive` with no arguments to view the full archive.
2. Run the same Bash cat+rm command.
3. Respond with: "Press Ctrl+O to expand the archive above."
