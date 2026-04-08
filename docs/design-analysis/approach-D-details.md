# Approach D: Compound/Recursive Merging (Crafting Tree)

## Core Mechanic
Merging requires specific mathematical criteria to be met between target and catalyst creatures. Works like a crafting recipe system.

## Design Attempted

### D1: Prime-Based Resonance (rejected pre-simulation)
Each variant has PRIME and HARMONIC hidden values. Merge rule: target.PRIME * catalyst.PRIME must be divisible by a tier-specific "resonance number."

**Rejected immediately**: players cannot intuit prime factorization in their head. Terminal game requires intuitable mechanics.

### D2: Signature-Range Catalysts

```
Creature signature = sum of variant indices mod 100

To upgrade from tier T to T+1, catalyst signature must be within:
  |target_sig - catalyst_sig| mod 100 <= window(T)

Windows and P(valid catalyst):
  common->uncommon:  window=40, P=0.80
  uncommon->rare:    window=25, P=0.50
  rare->epic:        window=15, P=0.30
  epic->legendary:   window=8,  P=0.16
  legendary->mythic: window=3,  P=0.06

Total 4 slots: 118 catches, 2.8 days
```

## Verdict: REJECT

### Weaknesses
1. **Binary check, not strategic depth**: "Is my signature in range?" is yes/no. No gradient, no optimization.
2. **Too fast**: 2.8 days is not a meaningful progression.
3. **Inventory mismatch**: crafting trees work in games with 64-stack inventories (Minecraft). Compi has ~20 creatures max. Not enough material to build trees.
4. **UI dependency**: players can't mentally track signatures. Game would show "compatible: yes/no", reducing player agency to "merge whatever the game says works."
5. **No reason to keep creatures**: beyond "right signature", no creature is special.
6. **Complexity without strategy**: the math is complex but the player decision is trivial.
