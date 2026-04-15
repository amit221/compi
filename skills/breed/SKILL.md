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

Show the complete tool output to the user. Do not summarize.

Flow:

1. Run the appropriate Bash command (renders colors directly):
   - No args: `node scripts/cli.js breed`
   - Preview: `node scripts/cli.js breed <N> <M>`
   - Execute: `node scripts/cli.js breed <N> <M> --confirm`

Then respond based on which mode was used:

- List mode (no args): "Press Ctrl+O to expand the table above. Pick two creatures of the same species and run `/breed N M`."
- Preview mode: "Press Ctrl+O to expand the breed preview above. Run `/breed N M --confirm` to proceed."
- Execute mode (--confirm):
  - Narrate the birth in 2-3 sentences with personality. Reference the child's name and any notable inherited traits or tier upgrades from the response. Suggest a next action if relevant.
  - End with: "Press Ctrl+O to expand the breed result above."
  - **When the result contains `★ HYBRID SPECIES BORN`**, you MUST immediately (do not ask the player first):
    1. Generate a creative name for the hybrid species (blend of both parents' themes, e.g. "Emberlotl" for a compi × pyrax)
    2. Generate 3-4 lines of ASCII art that combines visual elements from both parent species
    3. Write one line of flavor text describing the hybrid's nature and personality
    4. Call the `register_hybrid` tool with `speciesId` (from the result), `name`, `art` (newline-separated string), and `description`
    5. After `register_hybrid` succeeds, narrate the hybrid's registration as part of your breed commentary
- Error mode: Report the error message as-is.

Keep narrator commentary to 2-3 sentences. Do not describe the full tool output in your own words.
