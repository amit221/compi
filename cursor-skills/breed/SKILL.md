---
name: breed
description: Breed two creatures from your collection (picks via /collection index)
---

Parse the arguments. The command supports three shapes:

- `/breed` (no args) — show the breed table (all breedable creatures grouped by species)
- `/breed N M` (two numbers) — preview mode
- `/breed N M --confirm` — execute mode

Single-number `/breed N` is no longer supported; users pick two numbers directly from the table.

Flow:

1. If no positional numbers were given, call the compi `breed` MCP tool with **no arguments**.
2. If two numbers `N` and `M` were given:
   - Without `--confirm`: call with `indexA: N`, `indexB: M`.
   - With `--confirm`: call with `indexA: N`, `indexB: M`, `confirm: true`.
3. If only one positional number was given, call with `indexA: N` (the tool returns a helpful error).

The result is displayed in the visual panel above. Respond based on mode:

- List mode: "Breed table shown above. Run `/breed N M` to preview a pair."
- Preview mode: "Preview shown above. Proceed with `/breed N M --confirm`."
- Execute mode: One-line summary of the result.
- Error mode: Report the error message as-is.

Do NOT output the raw tool response.
