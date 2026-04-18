---
name: play
description: "Play Compi — draw cards and catch or breed creatures"
---

# /play

You are running the Compi game. Use the `play` MCP tool to interact.

## How it works

1. Call `play` with no arguments to draw cards
2. Show the output verbatim to the player using `node scripts/cli.js play`
3. The player replies with a letter (a, b, c) to pick a card or (s) to skip
4. Call `play` with their choice: `play(choice: "a")`
5. Show the result verbatim
6. Repeat — the result includes the next set of cards

## Rules

- ALWAYS show game output by running the bash command: `node scripts/cli.js play [choice]`
- NEVER summarize, paraphrase, or reformat the game output
- NEVER add emoji
- Keep your commentary to 1 sentence max between turns
- If the player says a letter or "skip", pass it as the choice
- If the player wants to stop, just stop — no special command needed
- If the player asks to see their creatures, use `/collection` instead

## Hybrid Species Creation

When a breed result shows **"★ NEW HYBRID BORN! ★"**, a brand new species was just created! You MUST:

1. Invent a creative name for the hybrid species (blend of both parent species names/themes)
2. Design original ASCII art for it (4 lines, similar style to existing species — see examples below)
3. Write a short description (1 sentence)
4. Call the `register_hybrid` tool with:
   - `speciesId`: the hybrid ID shown in the result (e.g. `hybrid_jinx_compi`)
   - `name`: your creative name
   - `description`: your 1-sentence description
   - `art`: array of 4 strings — the ASCII art template using `EE` (eyes), `MM` (mouth), `BB` (body), `TT` (tail) as placeholders

Then re-render the baby using `node scripts/cli.js collection` so the player sees the new art.

### ASCII Art Template Examples

Each species has 4 lines of art. Use `EE`, `MM`, `BB`, `TT` as placeholders for traits:

```
Compi:    ["  EE", " (MM)", " ╱BB╲", "  TT"]
Flikk:    ["  \\ _ /", " ( EE )", " ( MMM )", "  ~BB~", "  TT"]
Jinx:     ["    ~", "  /EE )", " ( MMM /", "  \\BB )", "   TT"]
Monu:     [" ┌─────┐", " │EE│", " │ MM │", " │BB│", " └TT┘"]
Glich:    [" ▐░░░▌", " ▐EE▌", " ▐ MMM ▌", " ▐BB▌", "  TT"]
```

Be creative! Design something that feels like a fusion of the two parent species.
