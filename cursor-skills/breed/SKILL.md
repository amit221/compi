---
name: breed
description: Breed two creatures from your collection (picks via /collection index)
---

Parse the arguments. The command supports four shapes:

- `/breed` (no args) — list mode
- `/breed N` (one number) — partner mode, show partners for creature at /collection index N
- `/breed N M` (two numbers) — preview mode
- `/breed N M --confirm` — execute mode

Flow:

1. If no positional numbers were given, call the compi `breed` MCP tool with **no arguments**.
2. If exactly one positional number `N` was given, call the tool with `indexA: N`.
3. If two numbers `N` and `M` were given:
   - Without `--confirm`: call with `indexA: N`, `indexB: M`.
   - With `--confirm`: call with `indexA: N`, `indexB: M`, `confirm: true`.

The result is displayed in the visual panel above. Respond based on mode:

- List mode: "List shown above. Run `/breed N` to pick creature #N."
- Partner mode: "Partners shown above. Run `/breed N M` to preview."
- Preview mode: "Preview shown above. Proceed with `/breed N M --confirm`."
- Execute mode: One-line summary of the result.

Do NOT output the raw tool response.
