---
name: catch
description: Attempt to catch a nearby creature
---

Parse the argument for which creature number (1-indexed) from the scan list.

Usage: `/catch [number]`

Call the compi `catch` MCP tool with the parsed `index` (number).

The result is displayed in the visual panel above. Respond with ONLY a brief one-line summary of what happened (caught, escaped, or fled).

Do NOT output the raw tool response.
