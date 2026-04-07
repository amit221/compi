# Compi UX Improvements — Design Spec

## Problem

Three UX pain points make the game hard to play:

1. **Skills don't trigger from conversation** — Claude only invokes game actions via explicit slash commands. Saying "what's nearby?" doesn't trigger a scan because MCP tool descriptions are too minimal for intent matching.
2. **Output bypasses colored rendering** — When Claude calls MCP tools directly (not via skills), it paraphrases the result in plain text instead of showing the colored terminal art. The display instruction lives only in skills, so direct MCP calls miss it.
3. **Collection/merge friction** — Collection doesn't show IDs or numbers. Merge requires typing UUID strings, uses confusing target/food terminology, and needs multiple commands to complete.

## Design Goals

1. Claude picks up game intent from natural conversation and calls the right MCP tool
2. Colored terminal output displays correctly regardless of whether the entry point is a skill or direct MCP call
3. Collection and merge use simple numbers, consistent with scan/catch

## Solution

### 1. Intent-Rich MCP Tool Descriptions

Rewrite every MCP tool `description` to include natural-language intent triggers. Claude uses these descriptions to decide when to call a tool, so richer descriptions = better intent matching.

| Tool | Current Description | New Description |
|------|-------------------|-----------------|
| `scan` | "Show nearby creatures that can be caught" | "Show nearby creatures that can be caught. Use when the user asks what's around, what creatures are nearby, wants to look for creatures, or asks to scan." |
| `catch` | "Attempt to catch a nearby creature" | "Attempt to catch a nearby creature by its number from the scan list. Use when the user wants to catch, grab, or capture a specific creature." |
| `collection` | "Browse caught creatures" | "Browse the user's caught creatures and their traits. Use when the user asks about their creatures, wants to see their collection, inventory, or team." |
| `merge` | "Merge two creatures from your collection" | "Merge two creatures — sacrifice one to upgrade the other. Use when the user wants to merge, combine, fuse, feed, or evolve creatures. Accepts numbered positions from the collection list." |
| `energy` | "Show current energy level" | "Show current energy level. Use when the user asks about energy, stamina, how much they can do, or if they can catch." |
| `status` | "View player profile and game stats" | "View player profile and game stats. Use when the user asks about their level, progress, stats, streak, or profile." |
| `settings` | "View or change game settings" | "View or change game settings (notifications). Use when the user asks about settings, preferences, or notification level." |

### 2. Display Instructions in MCP Responses

The `text()` helper in `mcp-server.ts` appends a display instruction block to every MCP tool response. This ensures Claude knows how to render output regardless of entry point.

**Changes to `mcp-server.ts`:**

The `text()` function currently writes ANSI output to a temp file and returns the content as MCP text. It will be updated to append instructions:

```typescript
function text(content: string) {
  if (writeDisplayFile) {
    fs.writeFileSync(displayPath, content);
  }
  // displayPath is resolved at startup: path.join(os.tmpdir(), "compi_display.txt")
  // On Windows this becomes e.g. C:\Users\...\AppData\Local\Temp\compi_display.txt
  // The bash command uses $LOCALAPPDATA/Temp/ which resolves in the shell
  const instructions = [
    "",
    "---",
    "DISPLAY: Run this bash command to show the result with colors:",
    'cat "$LOCALAPPDATA/Temp/compi_display.txt" && rm -f "$LOCALAPPDATA/Temp/compi_display.txt"',
    "Do not summarize, describe, or paraphrase the output above. Just run the bash command and let the user see the colored output directly.",
    "---",
  ].join("\n");

  return {
    content: [{ type: "text" as const, text: content + (writeDisplayFile ? instructions : "") }],
  };
}
```

**Key behavior:**
- Instructions only appended when `COMPI_DISPLAY_FILE=1` (i.e., running as Claude Code plugin)
- When not in display-file mode (e.g., standalone CLI), MCP returns just the content
- The instruction text tells Claude exactly what bash command to run and explicitly says not to paraphrase

**Skill simplification:**

Skills become thin argument parsers. They no longer need their own display logic since the MCP response handles it. Example simplified scan skill:

```markdown
---
name: scan
description: Show nearby creatures that can be caught
---
Call the `mcp__plugin_compi_compi__scan` tool.
Follow the display instructions in the tool response.
```

Each skill still exists (for explicit `/scan`, `/catch` etc.) but the body shrinks to just "call the tool and follow its instructions."

### 3. Numbered Collection & Simplified Merge

#### Collection Output

The renderer adds a visible 1-indexed number to each creature and a usage hint footer:

```
  Your creatures (3)

  [1] Sparkfang  Lv 2
      [creature art + traits]

  [2] Glimtail  Lv 1
      [creature art + traits]

  [3] Voidpup  Lv 1
      [creature art + traits]

  ──────────────────────────────────────────────
  Use /merge <target#> <food#> to merge
```

**Changes to `SimpleTextRenderer.renderCollection()`:**
- Add `[index + 1]` prefix before each creature name
- Add footer divider + merge hint

#### Merge by Number

The MCP `merge` tool switches from UUID strings to 1-indexed collection positions.

**MCP parameter changes:**

```typescript
// Before
targetId: z.string().describe("ID of the creature to keep")
foodId: z.string().describe("ID of the creature to sacrifice")

// After
target: z.number().describe("Collection number of the creature to keep (1-indexed)")
food: z.number().describe("Collection number of the creature to sacrifice (1-indexed)")
```

**MCP handler changes:**
- Load state, resolve `target` and `food` numbers to creature IDs via `state.collection[n - 1].id`
- Validate numbers are in range and not equal
- Pass resolved IDs to existing `engine.mergePreview()` / `engine.mergeExecute()`
- Engine functions remain unchanged (still work with IDs internally)

**Convention:** First number = target (kept, gets upgraded). Second number = food (sacrificed). The preview makes this explicit with clear labeling.

**Merge flow example:**

```
User: /merge 1 3

  Keep Sparkfang [1], sacrifice Voidpup [3]
  Voidpup will be consumed.

  [preview with upgrade chances]

  /merge 1 3 --confirm to proceed

User: /merge 1 3 --confirm

  ✦ MERGE SUCCESS ✦
  Sparkfang — eyes upgraded!
  [result display]
```

## Files Changed

| File | Change |
|------|--------|
| `src/mcp-server.ts` | Update tool descriptions, add display instructions to `text()`, change merge params to numbers with collection lookup |
| `src/renderers/simple-text.ts` | Add numbered prefixes to `renderCollection()`, add merge hint footer |
| `skills/scan/SKILL.md` | Simplify to "call tool, follow display instructions" |
| `skills/catch/SKILL.md` | Simplify to "call tool, follow display instructions" |
| `skills/collection/SKILL.md` | Simplify to "call tool, follow display instructions" |
| `skills/merge/SKILL.md` | Simplify to "call tool with numbers, follow display instructions" |
| `skills/energy/SKILL.md` | Simplify to "call tool, follow display instructions" |
| `skills/status/SKILL.md` | Simplify to "call tool, follow display instructions" |
| `skills/settings/SKILL.md` | Simplify to "call tool, follow display instructions" |

## Testing

- Existing engine tests for merge logic are unaffected (engine still uses IDs)
- MCP server: manual testing of each tool via slash commands and conversational intent
- Verify colored output displays correctly via both skill and direct MCP call paths
- Verify merge by number resolves correctly and rejects out-of-range / duplicate numbers
