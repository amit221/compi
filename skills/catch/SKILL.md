---
name: catch
description: Attempt to catch a nearby creature
---

The user wants to catch a creature. Parse the arguments to determine:
- Which creature number (1-indexed) from the scan list
- Optionally which item to use (default: bytetrap)

Usage: `/catch [number]` or `/catch [number] --item=netsnare`

Run this Bash command with the appropriate arguments:
```bash
node "$CLAUDE_PLUGIN_ROOT/dist/cli.js" catch $ARGUMENTS
```

Display the output exactly as returned. If the catch succeeds, congratulate briefly. If it fails, let the user know they can try again.
