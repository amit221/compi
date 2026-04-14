---
name: upgrade
model: claude-haiku-4-5-20251001
description: Upgrade a creature's trait slot using gold
---

Parse the arguments for which creature to upgrade and which slot.

Usage: `/upgrade <index> <slot>`

- `index`: The creature's collection index (from /collection)
- `slot`: One of `eyes`, `mouth`, `body`, or `tail`

1. Run this Bash command to upgrade (renders colors directly):
   ```
   node scripts/cli.js upgrade <index> <slot>
   ```

After the Bash output:
- Narrate the upgrade in 1-2 sentences with game personality (e.g. comment on the new rank, whether it crossed a tier boundary, or hype the creature's improvement).
- End with: "Press Ctrl+O to expand the output above and see the result."

If the command returns an error (e.g., not enough gold, max rank reached), report the error message as-is.

Keep narrator commentary to 1-2 sentences. Do NOT describe the upgrade result in detail.
