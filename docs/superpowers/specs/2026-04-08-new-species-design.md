# New Species + Renderer Fix Design

## Overview

Add 5 new species to Compi and fix the renderer to support per-species art templates.

---

## Renderer Fix

**Problem:** `renderCreatureLines` in `src/renderers/simple-text.ts` hardcodes a single body shape for all species. The `art` field in species JSON is ignored.

**Fix:** Update `renderCreatureLines` to:
1. Look up the creature's species config to get its `art` template array
2. Replace placeholders (`EE`, `MM`, `BB`, `TT`) with actual trait `art` fragments
3. Fall back to current hardcoded shape if species not found
4. Support species with fewer than 4 slots (e.g. Whiski has 3 — no body)

The species config loader (`src/config/species.ts`) already exists — just need to pass species info into the render function.

---

## Species Summary

| Species | Vibe | Spawn Weight | Eyes | Mouth | Body | Tail | Total |
|---------|------|-------------|------|-------|------|------|-------|
| Flikk | Jittery & restless | 11 | 16 | 13 | 17 | 14 | 60 |
| Monu | Calm & ancient | 9 | 12 | 11 | 18 | 12 | 53 |
| Jinx | Playful & mischievous | 11 | 15 | 17 | 13 | 15 | 60 |
| Glich | Glitchy & unstable | 8 | 18 | 14 | 19 | 17 | 68 |
| Whiski | Quiet & elusive | 5 | 17 | 17 | — | 16 | 50 |

---

## Silhouettes (rendered with example traits)

**Flikk:**
```
  \ _ /
 ( ⚡.⚡ )
 ( ^^^ )
  ~░░~
   \/
```

**Monu:**
```
 ┌─────┐
 │◐.◐│
 │ ∘ │
 │▓▓│
 └/\┘
```

**Jinx:**
```
    ~
  /·.° )
 ( ◡ /
  \≈≈ )
   ∿∿~
```

**Glich:**
```
 ▐░░░▌
 ▐◈.◈▌
 ▐ △ ▌
 ▐▒▒▌
  ↯↯
```

**Whiski:**
```
 /\_/\
( •.• )
 > ^ <
  ~~¬
```

---

## Species 1: Flikk

A twitchy, buzzing creature that seems to vibrate in place. Always mid-movement.

**Art template:** `["  \\ _ /", " ( EE )", " ( MM )", "  ~BB~", "   \\/"]`
**Spawn weight:** 11

### Eyes (16 traits)

| id | name | art | rate |
|----|------|-----|------|
| flk_eye_01 | Blink | •.• | 0.12 |
| flk_eye_02 | Twitch | ·,· | 0.11 |
| flk_eye_03 | Peek | °.° | 0.10 |
| flk_eye_04 | Dart | >.< | 0.09 |
| flk_eye_05 | Flick | •,° | 0.08 |
| flk_eye_06 | Rattle | °,° | 0.07 |
| flk_eye_07 | Wobble | ◦.◦ | 0.065 |
| flk_eye_08 | Skip | ·.° | 0.06 |
| flk_eye_09 | Zap | ⚡.⚡ | 0.055 |
| flk_eye_10 | Snap | ◇.◇ | 0.05 |
| flk_eye_11 | Buzz | ◦,◦ | 0.045 |
| flk_eye_12 | Jolt | ⬡.⬡ | 0.04 |
| flk_eye_13 | Spark | ✦.✦ | 0.03 |
| flk_eye_14 | Surge | ◈.◈ | 0.02 |
| flk_eye_15 | Bolt | ★.★ | 0.01 |
| flk_eye_16 | Overload | ✧.✧ | 0.005 |

### Mouth (13 traits)

| id | name | art | rate |
|----|------|-----|------|
| flk_mth_01 | Chatter | ^^^ | 0.14 |
| flk_mth_02 | Buzz | ~~~ | 0.13 |
| flk_mth_03 | Pip | .^. | 0.12 |
| flk_mth_04 | Click | _^_ | 0.10 |
| flk_mth_05 | Rattle | ^~^ | 0.09 |
| flk_mth_06 | Crackle | ⌇^⌇ | 0.08 |
| flk_mth_07 | Hum | ∿∿∿ | 0.07 |
| flk_mth_08 | Whirr | ~^~ | 0.06 |
| flk_mth_09 | Snap | ⌇~⌇ | 0.04 |
| flk_mth_10 | Jolt | ↯^↯ | 0.03 |
| flk_mth_11 | Screech | ⚡^⚡ | 0.02 |
| flk_mth_12 | Shriek | ✧^✧ | 0.01 |
| flk_mth_13 | Shatter | ✦^✦ | 0.005 |

### Body (17 traits)

| id | name | art | rate |
|----|------|-----|------|
| flk_bod_01 | Shiver | ░░ | 0.11 |
| flk_bod_02 | Fuzz | ·· | 0.10 |
| flk_bod_03 | Haze | ∙∙ | 0.09 |
| flk_bod_04 | Flicker | :: | 0.08 |
| flk_bod_05 | Jitter | ⌇⌇ | 0.07 |
| flk_bod_06 | Quiver | ~~ | 0.065 |
| flk_bod_07 | Pulse | ∿∿ | 0.06 |
| flk_bod_08 | Crackle | ≈≈ | 0.055 |
| flk_bod_09 | Charge | ▒▒ | 0.05 |
| flk_bod_10 | Rattle | ⌇∿ | 0.045 |
| flk_bod_11 | Spark | ++ | 0.04 |
| flk_bod_12 | Bolt | ↯↯ | 0.03 |
| flk_bod_13 | Storm | ▓▓ | 0.025 |
| flk_bod_14 | Surge | ◈◈ | 0.02 |
| flk_bod_15 | Overcharge | ⚡⚡ | 0.015 |
| flk_bod_16 | Meltdown | ✦✦ | 0.007 |
| flk_bod_17 | Supercell | ★★ | 0.003 |

### Tail (14 traits)

| id | name | art | rate |
|----|------|-----|------|
| flk_tal_01 | Whip | ~/~ | 0.13 |
| flk_tal_02 | Snap | ~\~ | 0.12 |
| flk_tal_03 | Flick | ⌇/ | 0.11 |
| flk_tal_04 | Twitch | /⌇ | 0.10 |
| flk_tal_05 | Wiggle | ~⌇~ | 0.09 |
| flk_tal_06 | Lash | ⌇~⌇ | 0.08 |
| flk_tal_07 | Crack | /~\ | 0.07 |
| flk_tal_08 | Spark | ~⚡ | 0.06 |
| flk_tal_09 | Arc | ⌇⚡ | 0.04 |
| flk_tal_10 | Bolt | ↯~↯ | 0.03 |
| flk_tal_11 | Fork | ⚡⌇⚡ | 0.025 |
| flk_tal_12 | Lightning | ✧⌇✧ | 0.02 |
| flk_tal_13 | Tempest | ⚡↯⚡ | 0.01 |
| flk_tal_14 | Cataclysm | ✧↯✧ | 0.005 |

---

## Species 2: Monu

A slow, heavy presence. Feels like it's been sitting in the same spot for centuries. Monolithic.

**Art template:** `[" ┌─────┐", " │EE│", " │ MM │", " │BB│", " └TT┘"]`
**Spawn weight:** 9

### Eyes (12 traits)

| id | name | art | rate |
|----|------|-----|------|
| mnu_eye_01 | Pebble | ·.· | 0.15 |
| mnu_eye_02 | Settled | °.° | 0.13 |
| mnu_eye_03 | Worn | -.– | 0.12 |
| mnu_eye_04 | Still | ○.○ | 0.10 |
| mnu_eye_05 | Lichen | ◦.◦ | 0.09 |
| mnu_eye_06 | Moss | ◐.◐ | 0.08 |
| mnu_eye_07 | Deep | ◑.◑ | 0.07 |
| mnu_eye_08 | Root | ◎.◎ | 0.06 |
| mnu_eye_09 | Fossil | ◉.◉ | 0.05 |
| mnu_eye_10 | Bedrock | ●.● | 0.03 |
| mnu_eye_11 | Monolith | ⊙.⊙ | 0.015 |
| mnu_eye_12 | Eternal | ◈.◈ | 0.005 |

### Mouth (11 traits)

| id | name | art | rate |
|----|------|-----|------|
| mnu_mth_01 | Flat | _ | 0.16 |
| mnu_mth_02 | Hum | ~ | 0.14 |
| mnu_mth_03 | Settle | . | 0.12 |
| mnu_mth_04 | Rumble | ≈ | 0.11 |
| mnu_mth_05 | Drone | ∘ | 0.10 |
| mnu_mth_06 | Erode | ∿ | 0.09 |
| mnu_mth_07 | Groan | ⌒ | 0.07 |
| mnu_mth_08 | Quake | ω | 0.06 |
| mnu_mth_09 | Tremor | △ | 0.05 |
| mnu_mth_10 | Chasm | ◇ | 0.03 |
| mnu_mth_11 | Epoch | ✦ | 0.01 |

### Body (18 traits)

| id | name | art | rate |
|----|------|-----|------|
| mnu_bod_01 | Dust | ·· | 0.10 |
| mnu_bod_02 | Silt | ∙∙ | 0.09 |
| mnu_bod_03 | Clay | :: | 0.08 |
| mnu_bod_04 | Grit | ░░ | 0.08 |
| mnu_bod_05 | Sand | -- | 0.07 |
| mnu_bod_06 | Shale | ⌇⌇ | 0.065 |
| mnu_bod_07 | Stone | ▒▒ | 0.06 |
| mnu_bod_08 | Slate | ≈≈ | 0.055 |
| mnu_bod_09 | Basalt | ++ | 0.05 |
| mnu_bod_10 | Granite | ∿∿ | 0.045 |
| mnu_bod_11 | Ore | ## | 0.04 |
| mnu_bod_12 | Iron | ▓▓ | 0.035 |
| mnu_bod_13 | Marble | ◈◈ | 0.03 |
| mnu_bod_14 | Obsidian | ◆◆ | 0.025 |
| mnu_bod_15 | Amber | ⬡⬡ | 0.02 |
| mnu_bod_16 | Fossil | ⊙⊙ | 0.01 |
| mnu_bod_17 | Relic | ✦✦ | 0.005 |
| mnu_bod_18 | Core | ★★ | 0.003 |

### Tail (12 traits)

| id | name | art | rate |
|----|------|-----|------|
| mnu_tal_01 | Drag | ~~ | 0.15 |
| mnu_tal_02 | Scrape | _/ | 0.13 |
| mnu_tal_03 | Slide | ~/ | 0.12 |
| mnu_tal_04 | Trail | /\ | 0.10 |
| mnu_tal_05 | Grind | ⌇~ | 0.09 |
| mnu_tal_06 | Root | ~⌇ | 0.08 |
| mnu_tal_07 | Crack | /⌇\ | 0.07 |
| mnu_tal_08 | Tremor | ⌇⌇ | 0.05 |
| mnu_tal_09 | Quake | ≋≋ | 0.04 |
| mnu_tal_10 | Fossil | ☄~ | 0.03 |
| mnu_tal_11 | Ancient | ☄☄ | 0.02 |
| mnu_tal_12 | Tectonic | ✧✧ | 0.005 |

---

## Species 3: Jinx

A cheeky little trickster. Asymmetric on purpose — nothing lines up right because it thinks that's funny.

**Art template:** `["    ~", "  /EE )", " ( MM /", "  \\BB )", "   TT~"]`
**Spawn weight:** 11

### Eyes (15 traits)

| id | name | art | rate |
|----|------|-----|------|
| jnx_eye_01 | Peek | ·.· | 0.13 |
| jnx_eye_02 | Squint | °.° | 0.11 |
| jnx_eye_03 | Wink | ·.° | 0.10 |
| jnx_eye_04 | Smirk | °.· | 0.09 |
| jnx_eye_05 | Shifty | >.> | 0.08 |
| jnx_eye_06 | Cross | °.◦ | 0.07 |
| jnx_eye_07 | Sly | ◦.° | 0.065 |
| jnx_eye_08 | Sneak | ◦.◦ | 0.06 |
| jnx_eye_09 | Trick | ◐.◑ | 0.05 |
| jnx_eye_10 | Scheme | ◑.◐ | 0.04 |
| jnx_eye_11 | Prank | ◎.◎ | 0.03 |
| jnx_eye_12 | Hustle | ◈.◇ | 0.025 |
| jnx_eye_13 | Con | ◇.◈ | 0.02 |
| jnx_eye_14 | Heist | ★.☆ | 0.01 |
| jnx_eye_15 | Chaos | ☆.★ | 0.005 |

### Mouth (17 traits)

| id | name | art | rate |
|----|------|-----|------|
| jnx_mth_01 | Grin | ^^^ | 0.11 |
| jnx_mth_02 | Giggle | ~~~ | 0.10 |
| jnx_mth_03 | Snicker | ^~^ | 0.09 |
| jnx_mth_04 | Tease | .^. | 0.08 |
| jnx_mth_05 | Smirk | ~^~ | 0.07 |
| jnx_mth_06 | Hehe | ^.^ | 0.065 |
| jnx_mth_07 | Cackle | ⌇^⌇ | 0.06 |
| jnx_mth_08 | Taunt | ~⌇~ | 0.055 |
| jnx_mth_09 | Chortle | ∿^∿ | 0.05 |
| jnx_mth_10 | Jeer | ⌇~⌇ | 0.04 |
| jnx_mth_11 | Mock | ≈^≈ | 0.035 |
| jnx_mth_12 | Howl | ↯^↯ | 0.03 |
| jnx_mth_13 | Crazed | ∿~∿ | 0.025 |
| jnx_mth_14 | Mayhem | ✧^✧ | 0.02 |
| jnx_mth_15 | Havoc | ⚡^⚡ | 0.01 |
| jnx_mth_16 | Bedlam | ✦^✦ | 0.007 |
| jnx_mth_17 | Anarchy | ★^★ | 0.003 |

### Body (13 traits)

| id | name | art | rate |
|----|------|-----|------|
| jnx_bod_01 | Scruffy | ░░ | 0.14 |
| jnx_bod_02 | Messy | ·· | 0.13 |
| jnx_bod_03 | Tangle | ∙∙ | 0.11 |
| jnx_bod_04 | Rumple | :: | 0.10 |
| jnx_bod_05 | Jumble | ~~ | 0.09 |
| jnx_bod_06 | Wobble | ⌇⌇ | 0.08 |
| jnx_bod_07 | Tumble | ▒▒ | 0.07 |
| jnx_bod_08 | Scramble | ≈≈ | 0.06 |
| jnx_bod_09 | Muddle | ∿∿ | 0.04 |
| jnx_bod_10 | Ruckus | ▓▓ | 0.03 |
| jnx_bod_11 | Havoc | ◆◆ | 0.02 |
| jnx_bod_12 | Pandemonium | ◈◈ | 0.01 |
| jnx_bod_13 | Riot | ★★ | 0.005 |

### Tail (15 traits)

| id | name | art | rate |
|----|------|-----|------|
| jnx_tal_01 | Swish | ~/ | 0.13 |
| jnx_tal_02 | Flap | /~ | 0.11 |
| jnx_tal_03 | Wag | ~~ | 0.10 |
| jnx_tal_04 | Trip | /⌇ | 0.09 |
| jnx_tal_05 | Stumble | ⌇/ | 0.08 |
| jnx_tal_06 | Tangle | ~⌇~ | 0.07 |
| jnx_tal_07 | Knot | ⌇~⌇ | 0.06 |
| jnx_tal_08 | Whirl | /~\ | 0.05 |
| jnx_tal_09 | Snarl | ⌇⌇ | 0.04 |
| jnx_tal_10 | Twist | ↯~↯ | 0.03 |
| jnx_tal_11 | Chaos | ⚡⌇⚡ | 0.025 |
| jnx_tal_12 | Mayhem | ✧⌇✧ | 0.02 |
| jnx_tal_13 | Havoc | ⚡↯⚡ | 0.01 |
| jnx_tal_14 | Bedlam | ✧↯✧ | 0.007 |
| jnx_tal_15 | Anarchy | ☄↯☄ | 0.003 |

---

## Species 4: Glich

Looks like a rendering error that became sentient. Parts flicker, repeat, or seem corrupted.

**Art template:** `[" ▐░░░▌", " ▐EE▌", " ▐ MM ▌", " ▐BB▌", "  TT"]`
**Spawn weight:** 8

### Eyes (18 traits)

| id | name | art | rate |
|----|------|-----|------|
| glc_eye_01 | Static | ·.· | 0.10 |
| glc_eye_02 | Flicker | °.° | 0.09 |
| glc_eye_03 | Scan | -.– | 0.08 |
| glc_eye_04 | Pixel | •.• | 0.08 |
| glc_eye_05 | Skip | ·,· | 0.07 |
| glc_eye_06 | Tear | °,° | 0.065 |
| glc_eye_07 | Glitch | ◦.◦ | 0.06 |
| glc_eye_08 | Corrupt | >.< | 0.055 |
| glc_eye_09 | Fragment | ◐.◐ | 0.05 |
| glc_eye_10 | Distort | ◑.◑ | 0.045 |
| glc_eye_11 | Scramble | ◎.◎ | 0.04 |
| glc_eye_12 | Breach | ◇.◇ | 0.03 |
| glc_eye_13 | Corrupt | ◈.◈ | 0.025 |
| glc_eye_14 | Fracture | ⬡.⬡ | 0.02 |
| glc_eye_15 | Rift | ◉.◉ | 0.015 |
| glc_eye_16 | Void | ⊙.⊙ | 0.01 |
| glc_eye_17 | Null | ★.★ | 0.005 |
| glc_eye_18 | Fatal | ✧.✧ | 0.003 |

### Mouth (14 traits)

| id | name | art | rate |
|----|------|-----|------|
| glc_mth_01 | Noise | ~~~ | 0.13 |
| glc_mth_02 | Static | --- | 0.12 |
| glc_mth_03 | Buzz | ^^^ | 0.11 |
| glc_mth_04 | Skip | _._ | 0.10 |
| glc_mth_05 | Stutter | ^.^ | 0.09 |
| glc_mth_06 | Crackle | ⌇.⌇ | 0.08 |
| glc_mth_07 | Tear | ~⌇~ | 0.07 |
| glc_mth_08 | Corrupt | ⌇~⌇ | 0.05 |
| glc_mth_09 | Distort | ∿.∿ | 0.04 |
| glc_mth_10 | Break | ↯.↯ | 0.03 |
| glc_mth_11 | Crash | ⚡.⚡ | 0.02 |
| glc_mth_12 | Fault | △ | 0.015 |
| glc_mth_13 | Kernel | ✧.✧ | 0.01 |
| glc_mth_14 | Panic | ✦.✦ | 0.005 |

### Body (19 traits)

| id | name | art | rate |
|----|------|-----|------|
| glc_bod_01 | Snow | ░░ | 0.10 |
| glc_bod_02 | Noise | ·· | 0.09 |
| glc_bod_03 | Fuzz | ∙∙ | 0.08 |
| glc_bod_04 | Scan | :: | 0.07 |
| glc_bod_05 | Line | -- | 0.065 |
| glc_bod_06 | Tear | ⌇⌇ | 0.06 |
| glc_bod_07 | Grain | ~~ | 0.055 |
| glc_bod_08 | Static | ▒▒ | 0.05 |
| glc_bod_09 | Corrupt | ≈≈ | 0.045 |
| glc_bod_10 | Artifact | ∿∿ | 0.04 |
| glc_bod_11 | Glitch | ++ | 0.035 |
| glc_bod_12 | Damage | ## | 0.03 |
| glc_bod_13 | Crash | ▓▓ | 0.025 |
| glc_bod_14 | Fragment | ↯↯ | 0.02 |
| glc_bod_15 | Breach | ◈◈ | 0.018 |
| glc_bod_16 | Fracture | ◆◆ | 0.015 |
| glc_bod_17 | Rift | ⬡⬡ | 0.007 |
| glc_bod_18 | Void | ★★ | 0.005 |
| glc_bod_19 | Fatal | ✧✧ | 0.003 |

### Tail (17 traits)

| id | name | art | rate |
|----|------|-----|------|
| glc_tal_01 | Flicker | ~/ | 0.11 |
| glc_tal_02 | Skip | /~ | 0.10 |
| glc_tal_03 | Stutter | ~~ | 0.09 |
| glc_tal_04 | Tear | ⌇/ | 0.08 |
| glc_tal_05 | Jitter | /⌇ | 0.07 |
| glc_tal_06 | Noise | ~⌇~ | 0.065 |
| glc_tal_07 | Static | ⌇~⌇ | 0.06 |
| glc_tal_08 | Corrupt | /~\ | 0.05 |
| glc_tal_09 | Glitch | ⌇⌇ | 0.04 |
| glc_tal_10 | Artifact | ↯~ | 0.035 |
| glc_tal_11 | Crash | ↯↯ | 0.03 |
| glc_tal_12 | Damage | ↯~↯ | 0.025 |
| glc_tal_13 | Fragment | ⚡⌇ | 0.02 |
| glc_tal_14 | Breach | ⚡⌇⚡ | 0.015 |
| glc_tal_15 | Fracture | ✧⌇✧ | 0.01 |
| glc_tal_16 | Rift | ⚡↯⚡ | 0.005 |
| glc_tal_17 | Fatal | ☄↯☄ | 0.003 |

---

## Species 5: Whiski

A rare, elusive cat. Quiet and always just out of reach. Fewer slots (3 — no body) means easier upgrades through breeding, balanced by being the hardest species to find.

**Art template:** `[" /\\_/\\", "( EE )", " > MM <", "  TT"]`
**Spawn weight:** 5

### Eyes (17 traits)

| id | name | art | rate |
|----|------|-----|------|
| wsk_eye_01 | Peer | ·.· | 0.11 |
| wsk_eye_02 | Watch | °.° | 0.10 |
| wsk_eye_03 | Gaze | •.• | 0.09 |
| wsk_eye_04 | Glance | -.– | 0.08 |
| wsk_eye_05 | Stare | ○.○ | 0.07 |
| wsk_eye_06 | Lurk | ◦.◦ | 0.065 |
| wsk_eye_07 | Prowl | >.> | 0.06 |
| wsk_eye_08 | Slit | ◐.◐ | 0.055 |
| wsk_eye_09 | Shadow | ◑.◑ | 0.05 |
| wsk_eye_10 | Night | ◎.◎ | 0.045 |
| wsk_eye_11 | Dusk | ●.● | 0.04 |
| wsk_eye_12 | Glint | ◇.◇ | 0.03 |
| wsk_eye_13 | Flash | ◈.◈ | 0.025 |
| wsk_eye_14 | Moon | ◉.◉ | 0.02 |
| wsk_eye_15 | Eclipse | ⊙.⊙ | 0.01 |
| wsk_eye_16 | Phantom | ★.★ | 0.007 |
| wsk_eye_17 | Ghost | ✧.✧ | 0.003 |

### Mouth (17 traits)

| id | name | art | rate |
|----|------|-----|------|
| wsk_mth_01 | Purr | ~~~ | 0.11 |
| wsk_mth_02 | Mew | ^ | 0.10 |
| wsk_mth_03 | Hush | _ | 0.09 |
| wsk_mth_04 | Nuzzle | ~ | 0.08 |
| wsk_mth_05 | Chirp | ^.^ | 0.07 |
| wsk_mth_06 | Trill | ~^~ | 0.065 |
| wsk_mth_07 | Murmur | .^. | 0.06 |
| wsk_mth_08 | Whisper | ⌇~⌇ | 0.055 |
| wsk_mth_09 | Hiss | ∿∿∿ | 0.05 |
| wsk_mth_10 | Croon | ω | 0.04 |
| wsk_mth_11 | Yowl | ∿^∿ | 0.03 |
| wsk_mth_12 | Keen | ⌇^⌇ | 0.025 |
| wsk_mth_13 | Wail | ↯^↯ | 0.02 |
| wsk_mth_14 | Screech | ⚡^⚡ | 0.015 |
| wsk_mth_15 | Shriek | ✧^✧ | 0.01 |
| wsk_mth_16 | Banshee | ✦^✦ | 0.005 |
| wsk_mth_17 | Phantom | ★^★ | 0.003 |

### Tail (16 traits)

| id | name | art | rate |
|----|------|-----|------|
| wsk_tal_01 | Swish | ~~¬ | 0.12 |
| wsk_tal_02 | Curl | ~/ | 0.11 |
| wsk_tal_03 | Flick | /~ | 0.10 |
| wsk_tal_04 | Sway | ~~ | 0.09 |
| wsk_tal_05 | Drift | ~¬ | 0.08 |
| wsk_tal_06 | Sweep | ⌇~ | 0.07 |
| wsk_tal_07 | Coil | ~⌇ | 0.06 |
| wsk_tal_08 | Whisk | ⌇⌇ | 0.055 |
| wsk_tal_09 | Twist | ~⌇~ | 0.05 |
| wsk_tal_10 | Lash | ⌇~⌇ | 0.04 |
| wsk_tal_11 | Snap | ↯~ | 0.03 |
| wsk_tal_12 | Phantom | ↯↯ | 0.025 |
| wsk_tal_13 | Shadow | ✧~ | 0.02 |
| wsk_tal_14 | Wisp | ✧⌇✧ | 0.01 |
| wsk_tal_15 | Ghost | ☄~☄ | 0.007 |
| wsk_tal_16 | Vanish | ✧↯✧ | 0.003 |

---

## Type System Changes

Whiski has only 3 slots (no body). This requires:
- The `traitPools` in species JSON can have 3 or 4 keys
- The spawn engine must handle species with fewer slots
- The renderer must handle missing slots gracefully (skip the line)
- The breeding system must handle cross-slot differences when breeding same-species

---

## Implementation Order

1. Renderer fix (use species art templates)
2. Support for variable slot counts in engine
3. Create species JSON files (Flikk, Monu, Jinx, Glich, Whiski)
4. Update tests
