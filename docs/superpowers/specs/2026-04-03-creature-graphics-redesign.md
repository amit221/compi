# Creature Graphics Redesign — Design Spec

## Overview

Redesign all creature art and roster from abstract digital beings to **real animals with a digital twist**, rendered as **Tamagotchi-style braille pixel art** using the Unicode Braille Patterns block (U+2800–U+28FF).

---

## Theme Change

**Before:** Abstract/digital beings — glitch entities, pixel spirits, ASCII lifeforms.

**After:** Real creatures/animals with a digital twist. Commons are small critters (mice, bugs, frogs). Rarity scales with both size and digitization — legendaries are large and heavily corrupted.

**Evolution model:** Natural form → digitized/enhanced form. A mouse becomes a circuit mouse, a hawk becomes a network relay hawk.

---

## Art Style

### Rendering: Unicode Braille Characters

Each creature sprite is defined as a **14x14 pixel grid** (`.` = off, `x` = on) and pre-rendered to braille strings using the `drawille` npm package. Each braille character encodes a 2×4 pixel matrix, so a 14×14 grid produces ~3–4 lines of compact art.

**Key properties:**
- Monochrome (no ANSI colors) — matches the design spec's "no colors" rule
- Hollow outlines with empty body interior — matches classic Tamagotchi LCD aesthetic
- Eyes, mouth, and features are individual pixels inside the outline
- Each creature has a distinct silhouette
- Compact output — fits well in Claude Code slash command responses

**Why braille over other approaches:**
- Half-block characters (▀▄█) at small sizes produce unreadable compressed blobs
- Raw ASCII dots lack the visual density needed to read as creatures
- Braille hits the sweet spot: thin lines, high resolution per character, compact

### Art Storage

Both `simple` and `rich` art fields contain the same pre-rendered braille strings. The distinction between renderers is behavioral (animations in rich), not art-style.

```typescript
art: {
  simple: ["⠰⡱⢀⠤⠤⡀⢎⠆", "  ⡇⠂⣐⢸  ", "  ⢈⠖⠲⡁  "],
  rich: ["⠰⡱⢀⠤⠤⡀⢎⠆", "  ⡇⠂⣐⢸  ", "  ⢈⠖⠲⡁  "],
}
```

### Evolution Visual Differentiation

Evolved forms add visual elements suggesting digitization:
- Circuit-trace legs/appendages
- Signal wave patterns (⠪⠂ / ⠐⠕)
- Antenna extensions
- Extra body segments (for worm-like creatures)
- Grid/mesh overlays

This typically adds 1 extra line of art to the evolved form.

---

## Creature Roster

31 total creatures: 16 base forms + 15 evolved forms (legendary has no evolution).

### Common (8 base + 8 evolved)

| Base | Evolved | Concept | Catch Rate | Fragments |
|------|---------|---------|------------|-----------|
| Mousebyte | Circuitmouse | Mouse → copper-trace legs | 0.80 | 5 |
| Buglet | Malworm | Caterpillar → replicating worm | 0.80 | 5 |
| Sparkit | Voltarc | Firefly → lightning wings | 0.75 | 5 |
| Frogling | Datafrog | Frog → data-packet skin | 0.85 | 5 |
| Batbit | Echoshade | Bat → sonar grid wings | 0.75 | 5 |
| Snailshell | Cacheslug | Snail → loading-bar shell | 0.85 | 5 |
| Antwork | Botswarm | Ant → networked drone colony | 0.80 | 5 |
| Rabbitick | Lagomorph | Rabbit → antenna ears | 0.80 | 5 |

### Uncommon (4 base + 4 evolved)

| Base | Evolved | Concept | Catch Rate | Fragments |
|------|---------|---------|------------|-----------|
| Foxfire | Proxyfox | Fox → circuit-trace fur | 0.55 | 7 |
| Owlscan | Firewowl | Owl → scanner eyes + antenna | 0.50 | 7 |
| Wolfping | Packethowl | Wolf → signal-wave howl | 0.50 | 7 |
| Crablock | Shellwall | Crab → firewall shell | 0.55 | 7 |

### Rare (2 base + 2 evolved)

| Base | Evolved | Concept | Catch Rate | Fragments | Catalyst |
|------|---------|---------|------------|-----------|----------|
| Hawktrace | Raptornet | Hawk → mesh-network wings | 0.35 | 10 | Shard |
| Cobrascript | Pythoncore | Cobra → flowing-code body | 0.30 | 10 | Shard |

### Epic (1 base + 1 evolved)

| Base | Evolved | Concept | Catch Rate | Fragments | Catalyst |
|------|---------|---------|------------|-----------|----------|
| Stagram | Kernelstag | Stag → antenna antlers | 0.15 | 15 | Prism |

Spawn condition: minTotalTicks 200.

### Legendary (1, no evolution)

| Creature | Concept | Catch Rate |
|----------|---------|------------|
| Leviathrex | Sea dragon of corrupted data streams | 0.05 |

Spawn condition: minTotalTicks 500, night only.

---

## Spawn Conditions

Time-of-day restrictions add variety to which creatures appear:

| Creature | Time of Day |
|----------|-------------|
| Batbit | Night, Evening |
| Owlscan | Night, Evening |
| Wolfping | Night, Morning |
| Crablock | Afternoon, Evening |
| Hawktrace | Morning, Afternoon |
| Cobrascript | Night, Evening |
| Leviathrex | Night only |

All other creatures spawn at any time.

---

## Technical Notes

- Art generation used `drawille` npm package during development to convert pixel grids to braille strings
- The `drawille` package is a dev-time tool only — the final art is stored as pre-rendered strings, no runtime dependency
- Existing game state may contain old creature IDs from the previous roster; the nearby list is cleared on roster change
- All 63 existing tests were updated to reference new creature IDs
