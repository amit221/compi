---
name: merge
description: Merge two creatures from your collection
---

Parse the arguments for target and food creature IDs.

Usage: `/merge [targetId] [foodId]`

If `--confirm` is NOT in the arguments:
1. Call the compi `merge` MCP tool with `targetId` and `foodId` (no `confirm`) to get the preview.
2. Output the tool's text response AS-IS in a code block.
3. Respond with: "Proceed with /merge [targetId] [foodId] --confirm"

If `--confirm` IS in the arguments:
1. Call the compi `merge` MCP tool with `targetId`, `foodId`, and `confirm: true`.
2. Output the tool's text response AS-IS in a code block.
