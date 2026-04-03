---
name: settings
description: View or change game settings (renderer, notifications)
---

View or change termomon settings.

Usage:
- `/settings` — view current settings
- `/settings renderer [rich|simple|browser|terminal]` — change renderer
- `/settings notifications [minimal|moderate|off]` — change notification level

```bash
node "$CLAUDE_PLUGIN_ROOT/dist/cli.js" settings $ARGUMENTS
```

Display the output exactly as returned.
