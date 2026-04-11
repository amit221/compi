---
name: breed
model: claude-haiku-4-5-20251001
description: Breed two creatures from your collection (picks via /collection index)
---

Parse the arguments. The command supports four shapes:

- `/breed` (no args) — list mode
- `/breed N` (one number) — partner mode, show partners for creature at /collection index N
- `/breed N M` (two numbers) — preview mode, preview breeding creatures at indexes N and M
- `/breed N M --confirm` — execute mode, execute the breed

Flow:

1. If no positional numbers were given, call `mcp__plugin_compi_compi__breed` with **no arguments**.
2. If exactly one positional number `N` was given, call `mcp__plugin_compi_compi__breed` with `indexA: N`.
3. If two positional numbers `N` and `M` were given:
   - Without `--confirm`: call the tool with `indexA: N`, `indexB: M` (no `confirm`).
   - With `--confirm`: call the tool with `indexA: N`, `indexB: M`, `confirm: true`.

After the tool call, run this Bash command to display the output with colors:

```
cat "$LOCALAPPDATA/Temp/compi_display.txt" && rm -f "$LOCALAPPDATA/Temp/compi_display.txt"
```

Then respond based on which mode was used:

- List mode: "Press Ctrl+O to expand the list above. Run `/breed N` to pick creature #N."
- Partner mode: "Press Ctrl+O to expand the partners above. Run `/breed N M` to preview breeding."
- Preview mode: "Press Ctrl+O to expand the breed preview above. Run `/breed N M --confirm` to proceed."
- Execute mode: "Press Ctrl+O to expand the breed result above."

Do not describe the tool output in your own words.
