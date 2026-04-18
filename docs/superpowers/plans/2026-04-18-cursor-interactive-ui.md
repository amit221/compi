# Cursor Interactive UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Cursor MCP App's terminal-in-a-browser rendering with a native HTML game UI featuring clickable cards, CSS animations, and an HTTP sidecar for in-iframe interactivity.

**Architecture:** New `HtmlAppRenderer` implements the existing `Renderer` interface, outputting self-contained HTML documents instead of ANSI strings. An HTTP sidecar server runs alongside the Cursor MCP server, allowing the iframe to trigger game actions via fetch requests without chat interaction. The MCP server wires in the new renderer and spawns the sidecar on startup.

**Tech Stack:** TypeScript, Node.js `http` module (sidecar), CSS animations, vanilla JS (iframe interactivity). No external dependencies added.

---

### Task 1: HTML Template Foundation

**Files:**
- Create: `src/renderers/html-templates.ts`
- Test: `tests/renderers/html-templates.test.ts`

This file contains all shared HTML/CSS/JS template strings: the base page wrapper, CSS variables, rarity colors, animation keyframes, card styles, status bar, and the iframe-side JS for card selection and sidecar communication.

- [ ] **Step 1: Write failing test for base page template**

```typescript
// tests/renderers/html-templates.test.ts
import { wrapPage, RARITY_CSS_COLORS } from "../../src/renderers/html-templates";

describe("html-templates", () => {
  it("wrapPage produces valid HTML document", () => {
    const html = wrapPage("<p>hello</p>", { sidecarPort: null });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<p>hello</p>");
    expect(html).toContain("--bg-primary");
    expect(html).toContain("</html>");
  });

  it("wrapPage embeds sidecar port when provided", () => {
    const html = wrapPage("<p>test</p>", { sidecarPort: 54321 });
    expect(html).toContain("54321");
    expect(html).toContain("SIDECAR_PORT");
  });

  it("wrapPage omits sidecar JS when port is null", () => {
    const html = wrapPage("<p>test</p>", { sidecarPort: null });
    expect(html).not.toContain("SIDECAR_PORT");
  });

  it("RARITY_CSS_COLORS has 8 entries", () => {
    expect(RARITY_CSS_COLORS).toHaveLength(8);
    expect(RARITY_CSS_COLORS[0]).toBe("#9e9e9e"); // common/grey
    expect(RARITY_CSS_COLORS[7]).toBe("#ff1744"); // mythic/red
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/renderers/html-templates.test.ts -v`
Expected: FAIL — module not found

- [ ] **Step 3: Implement html-templates.ts**

```typescript
// src/renderers/html-templates.ts

/** Maps rarity index 0-7 to CSS hex color */
export const RARITY_CSS_COLORS = [
  "#9e9e9e", // 0 Common (grey)
  "#ffffff", // 1 Uncommon (white)
  "#00e676", // 2 Rare (green)
  "#00e5ff", // 3 Superior (cyan)
  "#448aff", // 4 Elite (blue)
  "#d500f9", // 5 Epic (magenta)
  "#ffea00", // 6 Legendary (yellow)
  "#ff1744", // 7 Mythic (red)
];

export const RARITY_NAMES = [
  "Common", "Uncommon", "Rare", "Superior",
  "Elite", "Epic", "Legendary", "Mythic",
];

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg-primary:#0a0a0f;
  --bg-card:#14141f;
  --bg-card-hover:#1a1a2e;
  --border-card:#2a2a3e;
  --text-primary:#e0e0e8;
  --text-secondary:#8888a0;
  --accent:#7c5cff;
}
body{
  background:var(--bg-primary);color:var(--text-primary);
  font-family:'Cascadia Code','Fira Code','JetBrains Mono',Consolas,monospace;
  font-size:15px;line-height:1.5;padding:0;margin:0;
}

/* Status bar */
.status-bar{
  display:flex;justify-content:space-between;align-items:center;
  padding:10px 16px;background:rgba(124,92,255,0.08);
  border-bottom:1px solid var(--border-card);font-size:13px;
}
.status-bar .energy,.status-bar .level{display:flex;align-items:center;gap:8px}
.bar-bg{width:80px;height:6px;background:#1a1a2e;border-radius:3px;overflow:hidden}
.bar-fill-energy{height:100%;background:linear-gradient(90deg,#7c5cff,#00e5ff);border-radius:3px;transition:width .5s ease}
.bar-fill-xp{height:100%;background:linear-gradient(90deg,#ffea00,#ff9100);border-radius:3px;transition:width .5s ease}

/* Cards layout */
.cards-row{display:flex;justify-content:center;gap:16px;padding:24px 16px 12px;flex-wrap:wrap}
.game-card{
  background:var(--bg-card);border:1px solid var(--border-card);border-radius:12px;
  padding:16px 14px;width:190px;cursor:pointer;position:relative;overflow:hidden;
  transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease;
}
.game-card:hover{
  transform:translateY(-6px) scale(1.02);
  box-shadow:0 8px 28px rgba(124,92,255,0.2);border-color:var(--accent);
}
.game-card:active{transform:translateY(-2px) scale(0.98)}
.game-card.dimmed{opacity:0.3;pointer-events:none;transition:opacity .3s ease}

.card-type{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--text-secondary);margin-bottom:8px}
.creature-art{font-size:13px;line-height:1.3;text-align:center;margin:8px 0 12px;white-space:pre}
.creature-name{font-size:15px;font-weight:bold;margin-bottom:8px}
.traits{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px}
.trait{font-size:10px;padding:2px 8px;border-radius:10px;background:rgba(255,255,255,0.06);white-space:nowrap}

.card-footer{display:flex;justify-content:space-between;align-items:center;margin-top:8px}
.catch-rate{font-size:13px;font-weight:bold}
.energy-cost{font-size:12px;color:var(--text-secondary)}
.card-key{display:flex;justify-content:center;margin-top:12px}
.key-badge{
  font-size:12px;padding:4px 16px;border-radius:6px;
  background:rgba(124,92,255,0.15);color:var(--accent);
  border:1px solid rgba(124,92,255,0.3);letter-spacing:1px;
}

/* Breed card extras */
.breed-parents{display:flex;justify-content:center;align-items:center;gap:8px;margin:4px 0 8px}
.breed-parents .mini-art{font-size:10px;line-height:1.2;white-space:pre;text-align:center}
.breed-heart{font-size:18px;color:#ff4081;animation:heartbeat 1.5s ease infinite}
.upgrade-chance{font-size:10px;color:var(--text-secondary);text-align:center;margin:4px 0}

/* Breed card big (single breed) */
.breed-card-big{
  background:var(--bg-card);border:1px solid var(--border-card);border-radius:12px;
  padding:20px;max-width:500px;margin:0 auto;cursor:pointer;position:relative;overflow:hidden;
  transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease;
}
.breed-card-big:hover{
  box-shadow:0 8px 28px rgba(124,92,255,0.2);border-color:var(--accent);
}
.breed-big-parents{display:flex;justify-content:center;align-items:center;gap:24px;margin:16px 0}
.breed-big-parent{text-align:center}
.breed-big-parent .creature-art{margin:4px 0}
.breed-big-parent .parent-name{font-size:13px;font-weight:bold;margin-top:4px}
.breed-big-slots{margin:12px 0}
.breed-slot-row{
  display:flex;justify-content:space-between;align-items:center;
  padding:4px 8px;font-size:12px;
}
.breed-slot-row:nth-child(odd){background:rgba(255,255,255,0.02)}

/* Skip button */
.skip-btn{
  display:block;margin:4px auto 16px;padding:8px 24px;background:transparent;
  border:1px solid var(--border-card);border-radius:8px;color:var(--text-secondary);
  font-family:inherit;font-size:12px;cursor:pointer;transition:all .15s ease;
}
.skip-btn:hover{border-color:var(--text-secondary);color:var(--text-primary);background:rgba(255,255,255,0.03)}

/* Result overlay */
.result-overlay{
  position:fixed;inset:0;background:rgba(10,10,15,0.95);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  z-index:100;animation:fadeIn .3s ease;
}
.result-creature{animation:burst .5s ease}
.result-title{font-size:22px;font-weight:bold;margin-bottom:12px}
.result-title.success{color:#ffea00;text-shadow:0 0 20px rgba(255,234,0,0.4)}
.result-title.fail{color:#9e9e9e}
.result-title.hybrid{color:#d500f9;text-shadow:0 0 20px rgba(213,0,249,0.4)}
.result-details{font-size:13px;color:var(--text-secondary);margin-top:8px}
.result-traits{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:12px 0}
.result-xp{font-size:14px;color:#00e676;margin-top:8px}
.result-energy{font-size:12px;color:var(--text-secondary);margin-top:4px}

/* Collection grid */
.collection-grid{
  display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));
  gap:12px;padding:16px;
}
.collection-card{
  background:var(--bg-card);border:1px solid var(--border-card);border-radius:10px;
  padding:12px;text-align:center;
}
.collection-count{font-size:13px;color:var(--text-secondary);padding:12px 16px}

/* Empty/error states */
.empty-state{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  min-height:200px;color:var(--text-secondary);font-size:14px;
}

/* Animations */
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes burst{0%{transform:scale(0.6);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes heartbeat{0%,100%{transform:scale(1)}15%{transform:scale(1.15)}30%{transform:scale(1)}}
@keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
@keyframes flashUpgrade{0%{background:rgba(255,255,255,0.3)}100%{background:transparent}}
`;

function sidecarScript(port: number): string {
  return `
<script>
  const SIDECAR_PORT = ${port};
  const SIDECAR_URL = "http://127.0.0.1:" + SIDECAR_PORT;

  async function pickCard(choice) {
    document.querySelectorAll('.game-card,.breed-card-big').forEach(c => {
      if (c.dataset.choice !== choice) c.classList.add('dimmed');
    });
    try {
      const res = await fetch(SIDECAR_URL + "/action?choice=" + choice);
      if (res.ok) {
        const html = await res.text();
        document.documentElement.innerHTML = html;
      }
    } catch (e) {
      // Sidecar unreachable — user will need to respond in chat
      console.warn("Sidecar unreachable:", e);
    }
  }

  async function skipTurn() {
    try {
      const res = await fetch(SIDECAR_URL + "/action?choice=s");
      if (res.ok) {
        const html = await res.text();
        document.documentElement.innerHTML = html;
      }
    } catch (e) {
      console.warn("Sidecar unreachable:", e);
    }
  }
</script>`;
}

export interface WrapPageOptions {
  sidecarPort: number | null;
}

export function wrapPage(bodyContent: string, options: WrapPageOptions): string {
  const sidecar = options.sidecarPort != null ? sidecarScript(options.sidecarPort) : "";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${CSS}</style></head><body>${bodyContent}${sidecar}</body></html>`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/renderers/html-templates.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderers/html-templates.ts tests/renderers/html-templates.test.ts
git commit -m "feat: add HTML template foundation for Cursor interactive UI"
```

---

### Task 2: HtmlAppRenderer — Core Rendering Methods

**Files:**
- Create: `src/renderers/html-app.ts`
- Test: `tests/renderers/html-app.test.ts`

Implements the `Renderer` interface. Each method returns an HTML string (full document via `wrapPage`). This task covers: `renderCardDraw`, `renderPlayResult`, `renderCollection`, and the status header helper. The remaining Renderer methods delegate to `SimpleTextRenderer` wrapped in a `<pre>` block (same as current behavior) since they're low-traffic screens.

- [ ] **Step 1: Write failing tests for HtmlAppRenderer**

```typescript
// tests/renderers/html-app.test.ts
import { HtmlAppRenderer } from "../../src/renderers/html-app";
import { DrawResult, Card, CatchCardData, BreedCardData, PlayResult, PlayerProfile, CollectionCreature, SlotUpgradeInfo } from "../../src/types";

function makeProfile(): PlayerProfile {
  return { level: 4, xp: 287, totalCatches: 10, totalMerges: 2, totalTicks: 50, currentStreak: 3, longestStreak: 5, lastActiveDate: "2026-04-17" };
}

function makeCatchCard(id: string, name: string, speciesId: string): Card {
  return {
    id, type: "catch", label: `Catch ${name}`, energyCost: 2,
    data: {
      nearbyIndex: 0,
      creature: { id: `n-${id}`, speciesId, name, slots: [
        { slotId: "eyes", variantId: "eye_c01", color: "green", rarity: 2 },
        { slotId: "mouth", variantId: "mth_c01", color: "grey", rarity: 0 },
        { slotId: "body", variantId: "bod_c01", color: "cyan", rarity: 3 },
        { slotId: "tail", variantId: "tal_c01", color: "grey", rarity: 0 },
      ], spawnedAt: Date.now() },
      catchRate: 0.78, energyCost: 2,
    } as CatchCardData,
  };
}

function makeCollectionCreature(id: string, name: string): CollectionCreature {
  return {
    id, speciesId: "compi", name, slots: [
      { slotId: "eyes", variantId: "eye_c01", color: "green", rarity: 2 },
      { slotId: "mouth", variantId: "mth_c01", color: "grey", rarity: 0 },
      { slotId: "body", variantId: "bod_c01", color: "cyan", rarity: 3 },
      { slotId: "tail", variantId: "tal_c01", color: "grey", rarity: 0 },
    ], caughtAt: Date.now(), generation: 1, archived: false,
  };
}

describe("HtmlAppRenderer", () => {
  const renderer = new HtmlAppRenderer(null);

  describe("renderCardDraw", () => {
    it("renders catch cards with clickable elements", () => {
      const draw: DrawResult = {
        cards: [makeCatchCard("1", "Flikk", "flikk"), makeCatchCard("2", "Pyrax", "pyrax")],
        empty: false, noEnergy: false,
      };
      const html = renderer.renderCardDraw(draw, 16, 30, makeProfile());
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("game-card");
      expect(html).toContain("Flikk");
      expect(html).toContain("Pyrax");
      expect(html).toContain("78%");
      expect(html).toContain("data-choice");
    });

    it("renders no-energy state", () => {
      const draw: DrawResult = { cards: [], empty: false, noEnergy: true };
      const html = renderer.renderCardDraw(draw, 0, 30, makeProfile());
      expect(html).toContain("energy");
    });

    it("renders empty state", () => {
      const draw: DrawResult = { cards: [], empty: true, noEnergy: false };
      const html = renderer.renderCardDraw(draw, 5, 30, makeProfile());
      expect(html).toContain("Nothing happening");
    });

    it("includes status bar with energy and level", () => {
      const draw: DrawResult = {
        cards: [makeCatchCard("1", "Flikk", "flikk")],
        empty: false, noEnergy: false,
      };
      const html = renderer.renderCardDraw(draw, 24, 30, makeProfile());
      expect(html).toContain("24/30");
      expect(html).toContain("Lv.4");
    });
  });

  describe("renderCollection", () => {
    it("renders creatures in a grid", () => {
      const creatures = [makeCollectionCreature("c1", "Alpha"), makeCollectionCreature("c2", "Beta")];
      const html = renderer.renderCollection(creatures);
      expect(html).toContain("collection-grid");
      expect(html).toContain("Alpha");
      expect(html).toContain("Beta");
    });

    it("renders empty collection", () => {
      const html = renderer.renderCollection([]);
      expect(html).toContain("No creatures");
    });
  });

  describe("renderPlayResult", () => {
    it("renders catch success with animation classes", () => {
      const result: PlayResult = {
        action: "catch",
        catchResult: {
          success: true, creature: { id: "n1", speciesId: "compi", name: "Sparky", slots: [
            { slotId: "eyes", variantId: "eye_c01", color: "green", rarity: 2 },
            { slotId: "mouth", variantId: "mth_c01", color: "grey", rarity: 0 },
            { slotId: "body", variantId: "bod_c01", color: "cyan", rarity: 3 },
            { slotId: "tail", variantId: "tal_c01", color: "grey", rarity: 0 },
          ], spawnedAt: Date.now() },
          energySpent: 2, fled: false, xpEarned: 10, attemptsRemaining: 3, failPenalty: 0,
        },
        nextDraw: { cards: [], empty: true, noEnergy: false },
      };
      const html = renderer.renderPlayResult(result, 14, 30, makeProfile());
      expect(html).toContain("CAUGHT");
      expect(html).toContain("result-overlay");
      expect(html).toContain("Sparky");
    });

    it("renders catch failure", () => {
      const result: PlayResult = {
        action: "catch",
        catchResult: {
          success: false, creature: { id: "n1", speciesId: "compi", name: "Runner", slots: [
            { slotId: "eyes", variantId: "eye_c01", color: "green", rarity: 2 },
            { slotId: "mouth", variantId: "mth_c01", color: "grey", rarity: 0 },
            { slotId: "body", variantId: "bod_c01", color: "cyan", rarity: 3 },
            { slotId: "tail", variantId: "tal_c01", color: "grey", rarity: 0 },
          ], spawnedAt: Date.now() },
          energySpent: 2, fled: true, xpEarned: 0, attemptsRemaining: 2, failPenalty: 0.1,
        },
        nextDraw: { cards: [], empty: true, noEnergy: false },
      };
      const html = renderer.renderPlayResult(result, 14, 30, makeProfile());
      expect(html).toContain("FLED");
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/renderers/html-app.test.ts -v`
Expected: FAIL — module not found

- [ ] **Step 3: Implement HtmlAppRenderer**

```typescript
// src/renderers/html-app.ts
import {
  Renderer, ScanResult, CatchResult, BreedPreview, BreedResult,
  StatusResult, Notification, CollectionCreature, CreatureSlot,
  SlotId, BreedTable, LevelUpResult, DiscoveryResult, ProgressInfo,
  ActionMenuEntry, CompanionOverview, DrawResult, PlayResult, Card,
  CatchCardData, BreedCardData, PlayerProfile,
} from "../types";
import { wrapPage, RARITY_CSS_COLORS, RARITY_NAMES } from "./html-templates";
import { SimpleTextRenderer } from "./simple-text";
import { buildAppHtml } from "./ansi-to-html";
import { getXpForNextLevel } from "../engine/progression";
import { getSpeciesById, getTraitDefinition } from "../config/species";
import { getVariantById } from "../config/traits";

const SLOT_ORDER: SlotId[] = ["eyes", "mouth", "body", "tail"];

/** Escape HTML entities */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export class HtmlAppRenderer implements Renderer {
  private sidecarPort: number | null;
  private fallback = new SimpleTextRenderer();

  constructor(sidecarPort: number | null) {
    this.sidecarPort = sidecarPort;
  }

  private wrap(body: string): string {
    return wrapPage(body, { sidecarPort: this.sidecarPort });
  }

  private statusBar(energy: number, maxEnergy: number, profile: PlayerProfile): string {
    const ePct = Math.round((energy / maxEnergy) * 100);
    const nextXp = getXpForNextLevel(profile.level);
    const xpPct = Math.round((profile.xp / nextXp) * 100);
    return `<div class="status-bar">
      <div class="energy"><span>\u26A1 ${energy}/${maxEnergy}</span><div class="bar-bg"><div class="bar-fill-energy" style="width:${ePct}%"></div></div></div>
      <div class="level"><span>Lv.${profile.level}</span><div class="bar-bg"><div class="bar-fill-xp" style="width:${xpPct}%"></div></div><span style="color:var(--text-secondary);font-size:11px">${profile.xp}/${nextXp} XP</span></div>
    </div>`;
  }

  /** Render creature ASCII art lines as colored HTML spans */
  private creatureArtHtml(slots: CreatureSlot[], speciesId?: string): string {
    const slotArt: Record<string, string> = {};
    for (const s of slots) {
      const trait = speciesId ? getTraitDefinition(speciesId, s.variantId) : getVariantById(s.variantId);
      slotArt[s.slotId] = trait?.art ?? "???";
    }
    const species = speciesId ? getSpeciesById(speciesId) : undefined;
    if (!species?.art) return `<pre class="creature-art">???</pre>`;

    const lines = species.art.map((line, i) => {
      let result = line;
      for (const [ph, id] of [["EE","eyes"],["MM","mouth"],["BB","body"],["TT","tail"]] as const) {
        result = result.replace(ph, slotArt[id] ?? "");
      }
      const zoneSlot = species.zones?.[i];
      const slot = slots.find(s => s.slotId === zoneSlot);
      const color = slot ? RARITY_CSS_COLORS[slot.rarity ?? 0] : "#e0e0e8";
      return `<span style="color:${color}">${esc(result)}</span>`;
    });
    return `<pre class="creature-art">${lines.join("\n")}</pre>`;
  }

  /** Render trait pills for a creature */
  private traitPills(slots: CreatureSlot[], speciesId?: string): string {
    return SLOT_ORDER.map(slotId => {
      const s = slots.find(sl => sl.slotId === slotId);
      if (!s) return "";
      const variant = speciesId ? getTraitDefinition(speciesId, s.variantId) : getVariantById(s.variantId);
      const name = variant?.name ?? s.variantId;
      const color = RARITY_CSS_COLORS[s.rarity ?? 0];
      return `<span class="trait" style="color:${color};border:1px solid ${color}40">${esc(name)}</span>`;
    }).join("");
  }

  private catchCardHtml(card: Card, letter: string): string {
    const data = card.data as CatchCardData;
    const c = data.creature;
    const rate = Math.round(data.catchRate * 100);
    const speciesName = c.speciesId.charAt(0).toUpperCase() + c.speciesId.slice(1);
    const rateColor = rate >= 70 ? RARITY_CSS_COLORS[2] : rate >= 40 ? RARITY_CSS_COLORS[6] : RARITY_CSS_COLORS[7];
    const onclick = this.sidecarPort != null ? `onclick="pickCard('${letter.toLowerCase()}')"` : "";

    return `<div class="game-card" data-choice="${letter.toLowerCase()}" ${onclick} style="animation:slideUp .3s ease both;animation-delay:${(letter.charCodeAt(0)-65)*0.08}s">
      <div class="card-type">Catch</div>
      ${this.creatureArtHtml(c.slots, c.speciesId)}
      <div class="creature-name">${esc(speciesName)}</div>
      <div class="traits">${this.traitPills(c.slots, c.speciesId)}</div>
      <div class="card-footer">
        <span class="catch-rate" style="color:${rateColor}">${rate}%</span>
        <span class="energy-cost">\u26A1${data.energyCost}</span>
      </div>
      <div class="card-key"><span class="key-badge">${letter}</span></div>
    </div>`;
  }

  private breedCardBigHtml(card: Card): string {
    const data = card.data as BreedCardData;
    const pA = data.parentA.creature;
    const pB = data.parentB.creature;
    const matchCount = data.upgradeChances.filter(u => u.match).length;
    const avgChance = data.upgradeChances.reduce((s, u) => s + u.upgradeChance, 0) / data.upgradeChances.length;
    const onclick = this.sidecarPort != null ? `onclick="pickCard('a')"` : "";

    const slotsHtml = data.upgradeChances.map(u => {
      const pct = Math.round(u.upgradeChance * 100);
      const indicator = u.match
        ? `<span style="color:${RARITY_CSS_COLORS[2]}">↑${pct}%</span>`
        : `<span style="color:var(--text-secondary)">${pct}%</span>`;
      return `<div class="breed-slot-row"><span>${u.slotId}</span>${indicator}</div>`;
    }).join("");

    const skipOnclick = this.sidecarPort != null ? `onclick="pickCard('b')"` : "";

    return `<div class="breed-card-big" data-choice="a" ${onclick}>
      <div class="card-type" style="text-align:center">Breed</div>
      <div class="breed-big-parents">
        <div class="breed-big-parent">
          ${this.creatureArtHtml(pA.slots, pA.speciesId)}
          <div class="parent-name">${esc(pA.name)}</div>
        </div>
        <div class="breed-heart">\u2665</div>
        <div class="breed-big-parent">
          ${this.creatureArtHtml(pB.slots, pB.speciesId)}
          <div class="parent-name">${esc(pB.name)}</div>
        </div>
      </div>
      <div class="breed-big-slots">${slotsHtml}</div>
      <div class="card-footer" style="justify-content:center;gap:16px">
        <span class="energy-cost">\u26A1${data.energyCost}</span>
        <span style="color:var(--text-secondary);font-size:12px">${matchCount} matching slots</span>
      </div>
      <div class="card-key"><span class="key-badge">A</span> Breed</div>
    </div>
    <button class="skip-btn" ${skipOnclick} style="margin-top:12px">Pass</button>`;
  }

  private breedCardSmallHtml(card: Card, letter: string): string {
    const data = card.data as BreedCardData;
    const pA = data.parentA.creature;
    const pB = data.parentB.creature;
    const matchCount = data.upgradeChances.filter(u => u.match).length;
    const onclick = this.sidecarPort != null ? `onclick="pickCard('${letter.toLowerCase()}')"` : "";

    return `<div class="game-card" data-choice="${letter.toLowerCase()}" ${onclick} style="animation:slideUp .3s ease both">
      <div class="card-type">Breed</div>
      <div class="breed-parents">
        <div class="mini-art">${this.creatureArtHtml(pA.slots, pA.speciesId).replace('creature-art','creature-art" style="font-size:9px')}</div>
        <div class="breed-heart">\u2665</div>
        <div class="mini-art">${this.creatureArtHtml(pB.slots, pB.speciesId).replace('creature-art','creature-art" style="font-size:9px')}</div>
      </div>
      <div class="creature-name" style="text-align:center;font-size:12px">${esc(pA.name)} \u00d7 ${esc(pB.name)}</div>
      <div class="upgrade-chance">${matchCount} match${matchCount !== 1 ? "es" : ""}</div>
      <div class="card-footer">
        <span class="catch-rate" style="color:var(--text-secondary)">Breed</span>
        <span class="energy-cost">\u26A1${data.energyCost}</span>
      </div>
      <div class="card-key"><span class="key-badge">${letter}</span></div>
    </div>`;
  }

  private nextDrawHtml(draw: DrawResult): string {
    if (draw.noEnergy) return `<div class="empty-state">Out of energy. Come back later!</div>`;
    if (draw.empty) return `<div class="empty-state">Nothing happening right now. New creatures spawn every 30 min.</div>`;

    if (draw.cards.length === 1 && draw.cards[0].type === "breed") {
      return this.breedCardBigHtml(draw.cards[0]);
    }

    const letters = ["A", "B", "C"];
    const cardsHtml = draw.cards.map((card, i) => {
      if (card.type === "catch") return this.catchCardHtml(card, letters[i]);
      return this.breedCardSmallHtml(card, letters[i]);
    }).join("");

    const skipOnclick = this.sidecarPort != null ? `onclick="skipTurn()"` : "";
    return `<div class="cards-row">${cardsHtml}</div><button class="skip-btn" ${skipOnclick}>Skip Turn \u26A11</button>`;
  }

  // --- Renderer interface ---

  renderCardDraw(draw: DrawResult, energy: number, maxEnergy: number, profile: PlayerProfile): string {
    const status = this.statusBar(energy, maxEnergy, profile);
    const content = this.nextDrawHtml(draw);
    return this.wrap(status + content);
  }

  renderPlayResult(result: PlayResult, energy: number, maxEnergy: number, profile: PlayerProfile): string {
    const status = this.statusBar(energy, maxEnergy, profile);
    let resultHtml = "";

    if (result.action === "catch" && result.catchResult) {
      const cr = result.catchResult;
      if (cr.success) {
        const discoveryHtml = cr.discovery?.isNew
          ? `<div style="color:${RARITY_CSS_COLORS[6]};font-weight:bold;margin-top:8px">\u2726 NEW SPECIES: ${esc(cr.discovery.speciesId)} \u2726</div><div class="result-xp">+${cr.discovery.bonusXp} bonus XP</div>`
          : "";
        resultHtml = `<div class="result-overlay" id="result-overlay">
          <div class="result-creature">${this.creatureArtHtml(cr.creature.slots, cr.creature.speciesId)}</div>
          <div class="result-title success">\u2726 CAUGHT! \u2726</div>
          <div class="creature-name">${esc(cr.creature.name)}</div>
          <div class="result-traits">${this.traitPills(cr.creature.slots, cr.creature.speciesId)}</div>
          ${discoveryHtml}
          <div class="result-xp">+${cr.xpEarned} XP</div>
          <div class="result-energy">-${cr.energySpent}\u26A1</div>
        </div>`;
      } else if (cr.fled) {
        resultHtml = `<div class="result-overlay" id="result-overlay">
          <div class="result-creature" style="opacity:0.3;animation:shake .5s ease">${this.creatureArtHtml(cr.creature.slots, cr.creature.speciesId)}</div>
          <div class="result-title fail">\u2726 FLED \u2726</div>
          <div class="result-details">${esc(cr.creature.name)} is gone</div>
          <div class="result-energy">-${cr.energySpent}\u26A1</div>
        </div>`;
      } else {
        resultHtml = `<div class="result-overlay" id="result-overlay">
          <div class="result-creature" style="opacity:0.5;animation:shake .5s ease">${this.creatureArtHtml(cr.creature.slots, cr.creature.speciesId)}</div>
          <div class="result-title fail">\u2726 ESCAPED \u2726</div>
          <div class="result-details">${esc(cr.creature.name)} slipped away! ${cr.attemptsRemaining} attempts left</div>
          <div class="result-energy">-${cr.energySpent}\u26A1</div>
        </div>`;
      }
    }

    if (result.action === "breed" && result.breedResult) {
      const br = result.breedResult;
      const child = br.child;
      const titleClass = br.isCrossSpecies ? "hybrid" : "success";
      const titleText = br.isCrossSpecies ? "\u2605 NEW HYBRID BORN! \u2605" : "\u2605 BABY BORN! \u2605";

      const upgradesHtml = br.upgrades.length > 0
        ? br.upgrades.map(u => {
          const from = RARITY_NAMES[u.fromRarity];
          const to = RARITY_NAMES[u.toRarity];
          return `<div style="color:${RARITY_CSS_COLORS[6]};font-size:12px">\u2191 ${u.slotId}: ${from} \u2192 ${to}</div>`;
        }).join("")
        : "";

      resultHtml = `<div class="result-overlay" id="result-overlay">
        <div class="result-creature">${this.creatureArtHtml(child.slots, child.speciesId)}</div>
        <div class="result-title ${titleClass}">${titleText}</div>
        <div class="creature-name">${esc(child.name)}</div>
        <div class="result-traits">${this.traitPills(child.slots, child.speciesId)}</div>
        ${upgradesHtml}
        <div class="result-details" style="margin-top:8px">${esc(br.parentA.name)} \u00d7 ${esc(br.parentB.name)}</div>
      </div>`;
    }

    // Auto-dismiss result overlay after 2.5s and show next draw
    const nextContent = this.nextDrawHtml(result.nextDraw);
    const autoDismiss = `<div id="next-draw" style="display:none">${status}${nextContent}</div>
    <script>
      setTimeout(function(){
        var overlay = document.getElementById('result-overlay');
        if(overlay) overlay.style.transition='opacity .5s ease', overlay.style.opacity='0';
        setTimeout(function(){
          document.body.innerHTML = document.getElementById('next-draw')?.innerHTML || '';
        }, 500);
      }, 2500);
    </script>`;

    return this.wrap(status + resultHtml + autoDismiss);
  }

  renderCollection(collection: CollectionCreature[]): string {
    if (collection.length === 0) {
      return this.wrap(`<div class="empty-state">No creatures in your collection yet.</div>`);
    }

    const cardsHtml = collection.map(c => {
      const speciesName = c.speciesId.charAt(0).toUpperCase() + c.speciesId.slice(1);
      return `<div class="collection-card">
        ${this.creatureArtHtml(c.slots, c.speciesId)}
        <div class="creature-name">${esc(c.name)}</div>
        <div style="font-size:11px;color:var(--text-secondary)">${esc(speciesName)} \u00b7 Gen ${c.generation}</div>
        <div class="traits" style="justify-content:center;margin-top:8px">${this.traitPills(c.slots, c.speciesId)}</div>
      </div>`;
    }).join("");

    return this.wrap(`<div class="collection-count">Your creatures (${collection.length})</div><div class="collection-grid">${cardsHtml}</div>`);
  }

  // --- Delegated methods (low-traffic, wrap ANSI in pre) ---

  private wrapAnsi(ansi: string): string {
    return buildAppHtml(ansi);
  }

  renderScan(result: ScanResult): string { return this.wrapAnsi(this.fallback.renderScan(result)); }
  renderCatch(result: CatchResult): string { return this.wrapAnsi(this.fallback.renderCatch(result)); }
  renderBreedPreview(preview: BreedPreview): string { return this.wrapAnsi(this.fallback.renderBreedPreview(preview)); }
  renderBreedResult(result: BreedResult): string { return this.wrapAnsi(this.fallback.renderBreedResult(result)); }
  renderEnergy(energy: number, maxEnergy: number): string { return this.wrapAnsi(this.fallback.renderEnergy(energy, maxEnergy)); }
  renderStatus(result: StatusResult): string { return this.wrapAnsi(this.fallback.renderStatus(result)); }
  renderNotification(notification: Notification): string { return this.wrapAnsi(this.fallback.renderNotification(notification)); }
  renderBreedTable(table: BreedTable): string { return this.wrapAnsi(this.fallback.renderBreedTable(table)); }
  renderSpeciesIndex(progress: Record<string, boolean[]>): string { return this.wrapAnsi(this.fallback.renderSpeciesIndex(progress)); }
  renderLevelUp(result: LevelUpResult): string { return this.wrapAnsi(this.fallback.renderLevelUp(result)); }
  renderDiscovery(result: DiscoveryResult): string { return this.wrapAnsi(this.fallback.renderDiscovery(result)); }
  renderStatusBar(progress: ProgressInfo): string { return this.wrapAnsi(this.fallback.renderStatusBar(progress)); }
  renderActionMenu(entries: ActionMenuEntry[]): string { return this.wrapAnsi(this.fallback.renderActionMenu(entries)); }
  renderProgressPanel(progress: ProgressInfo): string { return this.wrapAnsi(this.fallback.renderProgressPanel(progress)); }
  renderCompanionOverview(overview: CompanionOverview): string { return ""; }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/renderers/html-app.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderers/html-app.ts tests/renderers/html-app.test.ts
git commit -m "feat: add HtmlAppRenderer with interactive card draw, play result, and collection"
```

---

### Task 3: HTTP Sidecar Server

**Files:**
- Create: `src/cursor-sidecar.ts`
- Test: `tests/integration/cursor-sidecar.test.ts`

Lightweight HTTP server that receives card picks from the iframe and returns updated HTML.

- [ ] **Step 1: Write failing test for sidecar**

```typescript
// tests/integration/cursor-sidecar.test.ts
import * as http from "http";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

// Set up a test state before importing sidecar
const testStatePath = path.join(os.tmpdir(), `compi-sidecar-test-${Date.now()}.json`);
process.env.COMPI_STATE_PATH = testStatePath;

import { createSidecar } from "../../src/cursor-sidecar";
import { StateManager } from "../../src/state/state-manager";

function seedState(): void {
  const mgr = new StateManager(testStatePath);
  const state = mgr.load();
  // Add some energy and nearby creatures so cards can be drawn
  state.energy = 20;
  state.nearby = [
    { id: "n1", speciesId: "compi", name: "TestCreature", slots: [
      { slotId: "eyes", variantId: "eye_c01", color: "grey", rarity: 0 },
      { slotId: "mouth", variantId: "mth_c01", color: "grey", rarity: 0 },
      { slotId: "body", variantId: "bod_c01", color: "grey", rarity: 0 },
      { slotId: "tail", variantId: "tal_c01", color: "grey", rarity: 0 },
    ], spawnedAt: Date.now() },
  ];
  state.batch = { attemptsRemaining: 5, failPenalty: 0, spawnedAt: Date.now() };
  state.lastSpawnAt = Date.now();
  mgr.save(state);
}

function fetch(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = "";
      res.on("data", (chunk: Buffer) => body += chunk.toString());
      res.on("end", () => resolve({ status: res.statusCode!, body }));
    }).on("error", reject);
  });
}

describe("cursor-sidecar", () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    seedState();
    const result = await createSidecar();
    server = result.server;
    port = result.port;
  });

  afterAll((done) => {
    server.close(done);
    try { fs.unlinkSync(testStatePath); } catch {}
  });

  it("GET /health returns 200", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.status).toBe(200);
  });

  it("GET /action?choice=s returns HTML with game content", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/action?choice=s`);
    expect(res.status).toBe(200);
    expect(res.body).toContain("<!DOCTYPE html>");
  });

  it("GET /unknown returns 404", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/unknown`);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/integration/cursor-sidecar.test.ts -v`
Expected: FAIL — module not found

- [ ] **Step 3: Implement cursor-sidecar.ts**

```typescript
// src/cursor-sidecar.ts
import * as http from "http";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import * as url from "url";
import { StateManager } from "./state/state-manager";
import { GameEngine } from "./engine/game-engine";
import { HtmlAppRenderer } from "./renderers/html-app";
import { drawCards, playCard, skipHand } from "./engine/cards";
import { MAX_ENERGY } from "./engine/energy";
import { registerPersonalSpecies } from "./config/species";

const statePath =
  process.env.COMPI_STATE_PATH ||
  path.join(os.homedir(), ".compi", "state.json");

const portFile = path.join(os.homedir(), ".compi", "cursor-port");

function handleAction(choice: string, sidecarPort: number): string {
  const stateManager = new StateManager(statePath);
  const state = stateManager.load();
  const engine = new GameEngine(state);
  registerPersonalSpecies(state.personalSpecies);

  // Process ticks
  engine.processTick({ timestamp: Date.now(), sessionId: state.currentSessionId }, Math.random);

  const renderer = new HtmlAppRenderer(sidecarPort);

  let output: string;

  if (choice === "s") {
    const draw = drawCards(state, Math.random);
    output = renderer.renderCardDraw(draw, state.energy, MAX_ENERGY, state.profile);
  } else {
    const choiceIndex = choice.charCodeAt(0) - 97; // 'a'=0, 'b'=1, 'c'=2

    // Handle breed pass (choice "b" on a single breed card)
    if (state.currentHand?.length === 1 && state.currentHand[0].type === "breed" && choice === "b") {
      const draw = skipHand(state, Math.random);
      output = renderer.renderCardDraw(draw, state.energy, MAX_ENERGY, state.profile);
    } else {
      const result = playCard(state, choiceIndex, Math.random);
      output = renderer.renderPlayResult(result, state.energy, MAX_ENERGY, state.profile);
    }
  }

  stateManager.save(state);
  return output;
}

export function createSidecar(): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsed = url.parse(req.url || "", true);

      // CORS for iframe
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET");

      if (parsed.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("OK");
        return;
      }

      if (parsed.pathname === "/action") {
        const choice = (parsed.query.choice as string || "").toLowerCase();
        if (!["a", "b", "c", "s"].includes(choice)) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Invalid choice. Use a, b, c, or s.");
          return;
        }

        try {
          const port = (server.address() as any)?.port ?? 0;
          const html = handleAction(choice, port);
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(html);
        } catch (err: any) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end(err.message || "Internal error");
        }
        return;
      }

      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as any;
      const port = addr.port;

      // Write port file so the renderer can discover it
      try {
        const dir = path.dirname(portFile);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(portFile, String(port));
      } catch {}

      resolve({ server, port });
    });

    server.on("error", reject);
  });
}

/** Read the sidecar port from the port file, or null if not running */
export function readSidecarPort(): number | null {
  try {
    const content = fs.readFileSync(portFile, "utf-8").trim();
    const port = parseInt(content, 10);
    return isNaN(port) ? null : port;
  } catch {
    return null;
  }
}

/** Clean up the port file */
export function cleanupPortFile(): void {
  try { fs.unlinkSync(portFile); } catch {}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/integration/cursor-sidecar.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cursor-sidecar.ts tests/integration/cursor-sidecar.test.ts
git commit -m "feat: add HTTP sidecar server for Cursor iframe interactivity"
```

---

### Task 4: Wire HtmlAppRenderer Into Cursor MCP Server

**Files:**
- Modify: `src/mcp-server-cursor.ts`
- Modify: `src/mcp-tools.ts` (add renderer injection option)

Replace `SimpleTextRenderer + ansiToHtml` with `HtmlAppRenderer`. Start the sidecar on server init.

- [ ] **Step 1: Write failing test — MCP tools accept renderer option**

```typescript
// tests/renderers/html-app-integration.test.ts
import { HtmlAppRenderer } from "../../src/renderers/html-app";

describe("HtmlAppRenderer integration", () => {
  it("renderCardDraw output is valid HTML that works without sidecar", () => {
    const renderer = new HtmlAppRenderer(null);
    const draw = { cards: [], empty: true, noEnergy: false };
    const html = renderer.renderCardDraw(draw as any, 10, 30, {
      level: 1, xp: 0, totalCatches: 0, totalMerges: 0,
      totalTicks: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: "",
    });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).not.toContain("SIDECAR_PORT");
    expect(html).toContain("Nothing happening");
  });
});
```

- [ ] **Step 2: Run test to verify it passes** (uses already-implemented renderer)

Run: `npx jest tests/renderers/html-app-integration.test.ts -v`
Expected: PASS

- [ ] **Step 3: Update mcp-tools.ts to accept a custom renderer**

Add a `renderer` option to `RegisterToolsOptions`:

In `src/mcp-tools.ts`, add to the `RegisterToolsOptions` interface:
```typescript
/** Custom renderer instance (used by Cursor server for HTML rendering) */
renderer?: Renderer;
```

And in `registerTools`, change the line `const renderer = new SimpleTextRenderer();` inside each tool handler to use the injected renderer when available:
```typescript
const renderer = options.renderer ?? new SimpleTextRenderer();
```

This change applies inside the `play` and `collection` tool handlers (two occurrences).

Import `Renderer` from `../types` at the top of the file.

- [ ] **Step 4: Update mcp-server-cursor.ts**

Replace the current content of `src/mcp-server-cursor.ts` with:

```typescript
#!/usr/bin/env node
/**
 * Stdio MCP server for Cursor with interactive HTML UI.
 *
 * Uses HtmlAppRenderer for native HTML output with clickable cards.
 * Spawns an HTTP sidecar server so the iframe can trigger game actions
 * without chat interaction.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadEngine, registerTools } from "./mcp-tools";
import { HtmlAppRenderer } from "./renderers/html-app";
import { createSidecar, readSidecarPort, cleanupPortFile } from "./cursor-sidecar";

const APP_URI = "ui://compi/display.html";
const APP_MIME = "text/html;profile=mcp-app";

let latestOutput = "";
let outputVersion = 0;

function createOutputWaiter(): Promise<string> {
  const startVersion = outputVersion;
  return new Promise<string>((resolve) => {
    const deadline = Date.now() + 3000;
    const check = () => {
      if (outputVersion > startVersion) {
        resolve(latestOutput);
      } else if (Date.now() >= deadline) {
        resolve(latestOutput);
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
}

const server = new McpServer({
  name: "compi",
  version: "0.4.0",
});

server.registerResource(
  APP_URI,
  APP_URI,
  { mimeType: APP_MIME },
  async () => {
    const content = await createOutputWaiter();
    return {
      contents: [{ uri: APP_URI, mimeType: APP_MIME, text: content }],
    };
  }
);

const appMeta = {
  ui: { resourceUri: APP_URI },
  "ui/resourceUri": APP_URI,
};

async function main() {
  // Start sidecar first so we know the port
  let sidecarPort: number | null = null;
  try {
    const sidecar = await createSidecar();
    sidecarPort = sidecar.port;

    // Clean up on exit
    process.on("exit", () => {
      cleanupPortFile();
      sidecar.server.close();
    });
    process.on("SIGTERM", () => process.exit(0));
    process.on("SIGINT", () => process.exit(0));
  } catch (err) {
    // Sidecar failed to start — continue without it
    console.error("Sidecar failed:", err);
  }

  const renderer = new HtmlAppRenderer(sidecarPort);

  registerTools(server, {
    appMeta,
    renderer,
    // For Cursor MCP Apps, the HTML comes from the renderer directly
    // (no ansiToHtml conversion needed)
    renderHtml: (content: string) => content,
    onOutput: (content) => {
      latestOutput = content;
      outputVersion++;
    },
  });

  // Warm up
  try {
    const { engine } = loadEngine();
    const warmup = renderer.renderScan(engine.scan());
    latestOutput = warmup;
    outputVersion++;
  } catch {}

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

- [ ] **Step 5: Run full test suite**

Run: `npx jest --passWithNoTests -v`
Expected: All existing tests PASS, new tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/mcp-server-cursor.ts src/mcp-tools.ts tests/renderers/html-app-integration.test.ts
git commit -m "feat: wire HtmlAppRenderer into Cursor MCP server with sidecar"
```

---

### Task 5: Update renderHtml Flow for HTML Renderer

**Files:**
- Modify: `src/mcp-tools.ts`

The current `makeText` function calls `renderHtml(content)` where `content` is ANSI text. When using the HTML renderer, the content is already HTML. The `renderHtml` option in `mcp-server-cursor.ts` is now a passthrough (`content => content`), but `makeText` still creates the embedded resource with the right MIME type. We need to ensure the flow works correctly: when a custom renderer is used, the ANSI text output should still be included for the chat response, but the HTML resource uses the renderer's output.

- [ ] **Step 1: Verify the existing flow works correctly**

Read through `makeText` in `src/mcp-tools.ts`. Currently it:
1. Writes ANSI to display file (Claude Code)
2. Calls `onOutput(content)` — this is the ANSI content
3. Creates embedded resource via `renderHtml(content)`

With the HTML renderer, the `play` tool handler calls `renderer.renderCardDraw()` which returns HTML. But the ANSI content (first `text` item) is still useful for the chat response.

The fix: when a custom renderer is provided, call it separately and pass its output to `onOutput` and the embedded resource, while keeping the ANSI fallback text for the chat.

- [ ] **Step 2: Update makeText to support dual output**

In `src/mcp-tools.ts`, update the `RegisterToolsOptions` interface and `makeText`:

```typescript
export interface RegisterToolsOptions {
  writeDisplayFile?: boolean;
  appMeta?: Record<string, unknown>;
  onOutput?: (content: string) => void;
  renderHtml?: (ansiContent: string) => string;
  /** Custom renderer (outputs HTML directly, bypasses ansiToHtml) */
  renderer?: Renderer;
}
```

Update `makeText` to accept an optional pre-rendered HTML:

```typescript
function makeText(content: string, options: RegisterToolsOptions, htmlContent?: string) {
  if (options.writeDisplayFile) {
    fs.writeFileSync(displayPath, content);
  }

  const htmlOutput = htmlContent ?? (options.renderHtml ? options.renderHtml(content) : null);

  if (options.onOutput && htmlOutput) {
    options.onOutput(htmlOutput);
  } else if (options.onOutput) {
    options.onOutput(content);
  }

  if (htmlOutput) {
    return { content: [
      { type: "text" as const, text: content },
      { type: "resource" as any, resource: { uri: `ui://compi/result-${Date.now()}.html`, mimeType: "text/html;profile=mcp-app", text: htmlOutput } },
    ] };
  }
  return { content: [{ type: "text" as const, text: content }] };
}
```

Then in each tool handler, when `options.renderer` is set, render with both:

```typescript
// In the play tool handler, after computing the result:
const ansiRenderer = new SimpleTextRenderer();
let ansiOutput: string;
let htmlOutput: string | undefined;

if (!args.choice) {
  const draw = drawCards(state, Math.random);
  ansiOutput = ansiRenderer.renderCardDraw(draw, state.energy, MAX_ENERGY, state.profile);
  if (options.renderer) htmlOutput = options.renderer.renderCardDraw(draw, state.energy, MAX_ENERGY, state.profile);
} else if (args.choice === "s") {
  const draw = drawCards(state, Math.random);
  ansiOutput = ansiRenderer.renderCardDraw(draw, state.energy, MAX_ENERGY, state.profile);
  if (options.renderer) htmlOutput = options.renderer.renderCardDraw(draw, state.energy, MAX_ENERGY, state.profile);
} else {
  // ... similar pattern for other branches
}

stateManager.save(state);
return makeText(ansiOutput, options, htmlOutput);
```

Apply the same pattern to the `collection` and `register_hybrid` handlers.

- [ ] **Step 3: Run full test suite**

Run: `npx jest --passWithNoTests -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/mcp-tools.ts
git commit -m "feat: dual ANSI+HTML rendering in MCP tools for Cursor"
```

---

### Task 6: Build and Manual Testing

**Files:**
- Modify: `src/index.ts` (export new renderer)

- [ ] **Step 1: Add HtmlAppRenderer to barrel export**

In `src/index.ts`, add:
```typescript
export { HtmlAppRenderer } from "./renderers/html-app";
```

- [ ] **Step 2: Build the project**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 3: Bundle for Cursor**

Run: `npm run bundle`
Expected: Bundles created in `scripts/`

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/index.ts
git commit -m "feat: export HtmlAppRenderer from barrel, build and bundle"
```

---

### Task 7: Final Wiring — Ensure renderHtml Passthrough Works

**Files:**
- Modify: `src/mcp-server-cursor.ts` (if needed based on Task 5 changes)

This task verifies the complete end-to-end flow after Task 5's changes. The `renderHtml` option in `mcp-server-cursor.ts` may need updating since `makeText` now handles the dual rendering.

- [ ] **Step 1: Review mcp-server-cursor.ts renderHtml usage**

After Task 5, `makeText` handles HTML rendering when `options.renderer` is set. The `renderHtml` in `mcp-server-cursor.ts` is no longer needed for ANSI→HTML conversion. But it's still used by `makeText` as a fallback for methods that don't have a custom renderer path (the delegated methods in HtmlAppRenderer that call `buildAppHtml`).

Update `mcp-server-cursor.ts` to remove the `renderHtml` option since the renderer now handles everything:

```typescript
registerTools(server, {
  appMeta,
  renderer,
  onOutput: (content) => {
    latestOutput = content;
    outputVersion++;
  },
});
```

And update `makeText` to handle the case where `htmlContent` is provided directly (from the renderer) — which it already does after Task 5.

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Build and bundle**

Run: `npm run build:all`
Expected: Success

- [ ] **Step 4: Commit**

```bash
git add src/mcp-server-cursor.ts src/mcp-tools.ts
git commit -m "refactor: simplify Cursor MCP server to use renderer directly"
```
