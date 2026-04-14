---
name: archive
model: claude-haiku-4-5-20251001
description: View archive or archive a creature
---

Parse the arguments for an optional creature ID.

Usage: `/archive [creatureId]`

1. Run this Bash command (renders colors directly):
   - With ID: `node scripts/cli.js archive <creatureId>`
   - Without ID: `node scripts/cli.js archive`

After the Bash output:
- If archiving: "Press Ctrl+O to expand the archive result above."
- If viewing: "Press Ctrl+O to expand the archive above."
