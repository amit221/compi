---
name: breed
model: claude-haiku-4-5-20251001
description: Breed two creatures from your collection (picks via /collection index)
---

Parse the arguments. The command supports three shapes:

- `/breed` (no args) — show the breed table (all breedable creatures grouped by species)
- `/breed N M` (two numbers) — preview mode, preview breeding creatures at indexes N and M
- `/breed N M --confirm` — execute mode, execute the breed

Single-number `/breed N` is no longer supported; users pick two numbers directly from the table.

Flow:

1. If no positional numbers were given, call `mcp__plugin_compi_compi__breed` with **no arguments**.
2. If two positional numbers `N` and `M` were given:
   - Without `--confirm`: call the tool with `indexA: N`, `indexB: M`.
   - With `--confirm`: call the tool with `indexA: N`, `indexB: M`, `confirm: true`.
3. If only one positional number was given, call the tool with `indexA: N` (the tool will return a helpful error).

After the tool call, run this Bash command to display the output with colors:

```
cat "$LOCALAPPDATA/Temp/compi_display.txt" && rm -f "$LOCALAPPDATA/Temp/compi_display.txt"
```

Then respond based on which mode was used:

- List mode (no args): "Press Ctrl+O to expand the table above. Pick two creatures of the same species and run `/breed N M`."
- Preview mode: "Press Ctrl+O to expand the breed preview above. Run `/breed N M --confirm` to proceed."
- Execute mode: "Press Ctrl+O to expand the breed result above."
- Error mode: Report the error message as-is.

Do not describe the tool output in your own words.
