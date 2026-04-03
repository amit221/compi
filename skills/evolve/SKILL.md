---
name: evolve
description: Evolve a creature that has enough fragments
---

The user wants to evolve a creature. Parse the argument for the creature ID.

Usage: `/evolve [creature-name]`

The creature name should be lowercased (e.g., "glitchlet", not "Glitchlet").

```bash
node "$CLAUDE_PLUGIN_ROOT/dist/cli.js" evolve $ARGUMENTS
```

Display the output exactly as returned — it includes the evolved creature's art.
