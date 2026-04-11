---
name: breedable
model: claude-haiku-4-5-20251001
description: List creatures in your collection that have a valid breeding partner
---

This command takes no arguments. It lists all creatures in the user's collection that have at least one same-species partner to breed with.

1. Call `mcp__plugin_compi_compi__breed` with no arguments.
2. Run this Bash command to display the output with colors:

```
cat "$LOCALAPPDATA/Temp/compi_display.txt" && rm -f "$LOCALAPPDATA/Temp/compi_display.txt"
```

3. Respond: "Press Ctrl+O to expand the list above. Run `/breed N` to see partners for creature #N, or `/breed N M` to preview breeding."

Do not describe the tool output in your own words.
