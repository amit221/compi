---
name: breed
description: Breed two creatures from your collection
---

Parse the arguments for parent creature IDs.

Usage: `/breed [parentAId] [parentBId]`

If `--confirm` is NOT in the arguments:
1. Call the compi `breed` MCP tool with `parentAId` and `parentBId` (no `confirm`) to get the preview.
2. The result is displayed in the visual panel above.
3. Respond with: "Preview shown above. Proceed with /breed [parentAId] [parentBId] --confirm"

If `--confirm` IS in the arguments:
1. Call the compi `breed` MCP tool with `parentAId`, `parentBId`, and `confirm: true`.
2. The result is displayed in the visual panel above. Give a brief one-line summary.

Do NOT output the raw tool response.
