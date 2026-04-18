/**
 * HtmlAppRenderer — renders Compi game UI as full HTML documents
 * for Cursor MCP Apps iframes. Terminal hacker vibe, game-like polish.
 */

import {
  Renderer,
  ScanResult,
  CatchResult,
  BreedPreview,
  BreedResult,
  StatusResult,
  Notification,
  CollectionCreature,
  CreatureSlot,
  SlotId,
  BreedTable,
  LevelUpResult,
  DiscoveryResult,
  ProgressInfo,
  ActionMenuEntry,
  CompanionOverview,
  DrawResult,
  PlayResult,
  Card,
  CatchCardData,
  BreedCardData,
  PlayerProfile,
} from "../types";
import { buildAppHtml } from "./ansi-to-html";
import { SimpleTextRenderer } from "./simple-text";
import {
  wrapPage,
  RARITY_NAMES,
  rarityHex,
  RESULT_AUTO_DISMISS_SCRIPT,
} from "./html-templates";
import { getXpForNextLevel } from "../engine/progression";
import { getSpeciesById, getTraitDefinition } from "../config/species";
import { getVariantById } from "../config/traits";

// Escape HTML entities
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Render creature art lines as colorized HTML.
 * Each art line is colored by the zone's slot rarity.
 */
function renderCreatureArtHtml(slots: CreatureSlot[], speciesId: string): string {
  const species = getSpeciesById(speciesId);
  if (!species?.art) return `<pre style="color:#9e9e9e">???</pre>`;

  const slotArt: Record<string, string> = {};
  for (const s of slots) {
    const trait = getTraitDefinition(speciesId, s.variantId);
    slotArt[s.slotId] = trait?.art ?? "???";
  }

  const slotRarity: Record<string, number> = {};
  for (const s of slots) {
    slotRarity[s.slotId] = s.rarity ?? 0;
  }

  const lines = species.art.map((line, lineIndex) => {
    let result = line;
    const replacements: [string, string][] = [
      ["EE", slotArt["eyes"] ?? ""],
      ["MM", slotArt["mouth"] ?? ""],
      ["BB", slotArt["body"] ?? ""],
      ["TT", slotArt["tail"] ?? ""],
    ];
    for (const [placeholder, art] of replacements) {
      result = result.replace(placeholder, art);
    }

    const zoneSlot = species.zones?.[lineIndex];
    const color = zoneSlot ? rarityHex(slotRarity[zoneSlot] ?? 0) : "#ffffff";
    return `<span style="color:${color}">${esc(result)}</span>`;
  });

  return `<pre>${lines.join("\n")}</pre>`;
}

/**
 * Build the status HUD bar (energy + level + XP).
 */
function renderHud(energy: number, maxEnergy: number, profile: PlayerProfile): string {
  const energyPct = Math.round((energy / maxEnergy) * 100);
  const nextXp = getXpForNextLevel(profile.level);
  const xpPct = nextXp > 0 ? Math.round((profile.xp / nextXp) * 100) : 100;

  return `<div class="status-hud">
  <div class="hud-item">
    <span class="hud-label">Lv</span>
    <span class="hud-value">${profile.level}</span>
  </div>
  <div class="hud-item">
    <span style="color:var(--energy-color)">&#9889;</span>
    <div class="bar-track"><div class="bar-fill energy" style="width:${energyPct}%"></div></div>
    <span class="hud-value">${energy}/${maxEnergy}</span>
  </div>
  <div class="hud-item">
    <span class="hud-label">XP</span>
    <div class="bar-track"><div class="bar-fill xp" style="width:${xpPct}%"></div></div>
    <span style="color:var(--text-secondary)">${profile.xp}/${nextXp}</span>
  </div>
</div>`;
}

/**
 * Render trait rows HTML for a creature's slots.
 */
function renderTraitsHtml(slots: CreatureSlot[], speciesId: string): string {
  const order: SlotId[] = ["eyes", "mouth", "body", "tail"];
  const rows: string[] = [];
  for (const slotId of order) {
    const slot = slots.find(s => s.slotId === slotId);
    if (slot) {
      const variant = getTraitDefinition(speciesId, slot.variantId) ?? getVariantById(slot.variantId);
      const name = variant?.name ?? slot.variantId;
      const color = rarityHex(slot.rarity);
      const rName = RARITY_NAMES[slot.rarity] ?? "Common";
      rows.push(`<div class="trait-row">
  <span class="trait-dot" style="color:${color};background:${color}"></span>
  <span class="trait-name">${esc(name)}</span>
  <span class="trait-rarity">${rName}</span>
</div>`);
    }
  }
  return rows.join("\n");
}

/**
 * Render a single catch card as HTML.
 */
function renderCatchCardHtml(card: Card, letter: string, sidecarPort: number | null): string {
  const data = card.data as CatchCardData;
  const creature = data.creature;
  const rate = Math.round(data.catchRate * 100);
  const speciesDisplay = creature.speciesId.charAt(0).toUpperCase() + creature.speciesId.slice(1);
  const rateClass = rate >= 70 ? "card-rate-high" : rate < 40 ? "card-rate-low" : "card-rate";
  const click = sidecarPort != null ? ` onclick="pickCard('${letter.toLowerCase()}')"` : "";

  return `<div class="game-card" data-choice="${letter.toLowerCase()}"${click} style="cursor:pointer">
  <div class="card-badge">${letter.toUpperCase()}</div>
  <div class="card-type-banner">catch</div>
  <div class="card-art">${renderCreatureArtHtml(creature.slots, creature.speciesId)}</div>
  <div class="card-name">${esc(speciesDisplay)}</div>
  <div class="card-traits">${renderTraitsHtml(creature.slots, creature.speciesId)}</div>
  <div class="card-footer">
    <span class="card-energy">&#9889; ${data.energyCost}</span>
    <span class="${rateClass}">${rate}%</span>
  </div>
</div>`;
}

/**
 * Render a breed card (big) as HTML.
 */
function renderBreedCardHtml(card: Card, sidecarPort: number | null): string {
  const data = card.data as BreedCardData;
  const pA = data.parentA.creature;
  const pB = data.parentB.creature;
  const order: SlotId[] = ["eyes", "mouth", "body", "tail"];
  const clickBreed = sidecarPort != null ? ` onclick="pickCard('a')"` : "";
  const clickPass = sidecarPort != null ? ` onclick="pickCard('b')"` : "";

  const slotsHtml = order.map(slotId => {
    const info = data.upgradeChances.find(u => u.slotId === slotId);
    const matchHtml = info?.match
      ? `<span class="breed-slot-match">&uarr; ${Math.round(info.upgradeChance * 100)}%</span>`
      : `<span class="breed-slot-nomatch">&mdash;</span>`;
    return `<div class="breed-slot-row">
  <span class="breed-slot-label">${slotId}</span>
  ${matchHtml}
</div>`;
  }).join("\n");

  return `<div class="breed-card-big" data-choice="a">
  <div class="breed-title">&#9829; BREEDING MATCH &#9829;</div>
  <div class="breed-parents">
    <div class="breed-parent">
      ${renderCreatureArtHtml(pA.slots, pA.speciesId)}
      <div class="breed-parent-name">${esc(pA.name)}</div>
    </div>
    <div class="breed-heart">&#9829;</div>
    <div class="breed-parent">
      ${renderCreatureArtHtml(pB.slots, pB.speciesId)}
      <div class="breed-parent-name">${esc(pB.name)}</div>
    </div>
  </div>
  <div class="breed-slots">${slotsHtml}</div>
  <div class="breed-actions">
    <div class="breed-btn primary" style="cursor:pointer"${clickBreed}>[A] Breed &#9889;${data.energyCost}</div>
    <div class="breed-btn" style="cursor:pointer"${clickPass}>[B] Pass</div>
  </div>
</div>`;
}

/**
 * Build the prompt hint shown below cards.
 */
function promptHint(letters: string[], hasSkip: boolean): string {
  const keys = letters.map(l => `<kbd>${l}</kbd>`).join(" ");
  const skip = hasSkip ? ` or <kbd>s</kbd> skip` : "";
  return `<div class="prompt-hint">reply ${keys}${skip} in chat</div>`;
}

/**
 * Render the "next draw" cards section (no HUD, used inside PlayResult).
 */
function renderDrawCardsOnly(draw: DrawResult, sidecarPort: number | null): string {
  if (draw.noEnergy) {
    return `<div class="empty-state">
  <div class="empty-state-icon">&#9889;</div>
  <div class="empty-state-text">Out of energy. Come back later!</div>
</div>`;
  }

  if (draw.empty) {
    return `<div class="empty-state">
  <div class="empty-state-icon">&#8987;</div>
  <div class="empty-state-text">Nothing happening right now. New creatures spawn every 30 min.</div>
</div>`;
  }

  // Single breed card
  if (draw.cards.length === 1 && draw.cards[0].type === "breed") {
    return renderBreedCardHtml(draw.cards[0], sidecarPort) + promptHint(["a", "b"], false);
  }

  // Catch cards
  const letters = ["a", "b", "c"];
  const usedLetters = letters.slice(0, draw.cards.length);
  const cardsHtml = draw.cards.map((card, i) =>
    renderCatchCardHtml(card, usedLetters[i], sidecarPort)
  ).join("\n");

  const skipClick = sidecarPort != null ? ` onclick="skipTurn()"` : "";
  return `<div class="card-row">${cardsHtml}</div>` + promptHint(usedLetters, true);
}

/**
 * Render catch result overlay HTML.
 */
function renderCatchResultOverlay(cr: CatchResult): string {
  const c = cr.creature;
  if (cr.success) {
    return `<div class="result-overlay catch-success">
  <div class="result-title success-text">&#10022; CAUGHT! &#10022;</div>
  <div class="result-creature-name">${esc(c.name)}</div>
  <div class="result-creature-art">${renderCreatureArtHtml(c.slots, c.speciesId)}</div>
  ${cr.discovery?.isNew ? `<div style="color:var(--warning);margin:4px 0;font-weight:bold;text-shadow:0 0 12px rgba(255,234,0,0.4)">&#10022; NEW SPECIES: ${esc(cr.discovery.speciesId)} &#10022;</div>` : ""}
  <div class="result-xp">+${cr.xpEarned} XP &nbsp; -${cr.energySpent} &#9889;</div>
</div>`;
  } else if (cr.fled) {
    return `<div class="result-overlay catch-fail">
  <div class="result-title fail-text">&#10022; FLED &#10022;</div>
  <div class="result-creature-name">${esc(c.name)}</div>
  <div class="result-subtitle">The creature is gone.</div>
  <div style="color:var(--text-dim)">-${cr.energySpent} &#9889;</div>
</div>`;
  } else {
    return `<div class="result-overlay catch-escaped">
  <div class="result-title escaped-text">&#10022; ESCAPED &#10022;</div>
  <div class="result-creature-name">${esc(c.name)}</div>
  <div class="result-subtitle">${cr.attemptsRemaining} attempts remaining</div>
  <div style="color:var(--text-dim)">-${cr.energySpent} &#9889;</div>
</div>`;
  }
}

/**
 * Render breed result overlay HTML.
 */
function renderBreedResultOverlay(br: BreedResult): string {
  const child = br.child;
  const order: SlotId[] = ["eyes", "mouth", "body", "tail"];
  const titleClass = br.isCrossSpecies ? "hybrid-text" : "breed-text";
  const titleText = br.isCrossSpecies ? "&#9733; NEW HYBRID BORN! &#9733;" : "&#9733; BABY BORN! &#9733;";

  const traitsHtml = order.map(slotId => {
    const slot = child.slots.find(s => s.slotId === slotId);
    if (!slot) return "";
    const color = rarityHex(slot.rarity);
    const rName = RARITY_NAMES[slot.rarity] ?? "Common";
    const upgrade = br.upgrades?.find(u => u.slotId === slotId);
    const arrow = upgrade ? ` <span class="upgrade-arrow">&uarr;</span>` : "";
    return `<div class="trait-row" style="justify-content:center">
  <span class="trait-dot" style="color:${color};background:${color}"></span>
  <span>${rName} ${slotId}</span>${arrow}
</div>`;
  }).join("\n");

  return `<div class="result-overlay breed-success">
  <div class="result-title ${titleClass}">${titleText}</div>
  <div class="result-creature-name">${esc(child.name)}</div>
  <div class="result-creature-art">${renderCreatureArtHtml(child.slots, child.speciesId)}</div>
  <div style="margin:6px 0">${traitsHtml}</div>
  <div class="result-subtitle">${esc(br.parentA.name)} &times; ${esc(br.parentB.name)}</div>
</div>`;
}

export class HtmlAppRenderer implements Renderer {
  private fallback: SimpleTextRenderer;
  private sidecarPort: number | null;

  constructor(sidecarPort: number | null) {
    this.sidecarPort = sidecarPort;
    this.fallback = new SimpleTextRenderer();
  }

  // --- Primary HTML methods ---

  renderCardDraw(draw: DrawResult, energy: number, maxEnergy: number, profile: PlayerProfile): string {
    const hud = renderHud(energy, maxEnergy, profile);
    const cards = renderDrawCardsOnly(draw, this.sidecarPort);
    return wrapPage(`${hud}\n${cards}`, { sidecarPort: this.sidecarPort });
  }

  renderPlayResult(result: PlayResult, energy: number, maxEnergy: number, profile: PlayerProfile): string {
    const hud = renderHud(energy, maxEnergy, profile);

    let overlay = "";
    if (result.action === "catch" && result.catchResult) {
      overlay = renderCatchResultOverlay(result.catchResult);
    }
    if (result.action === "breed" && result.breedResult) {
      overlay = renderBreedResultOverlay(result.breedResult);
    }

    const nextCards = renderDrawCardsOnly(result.nextDraw, this.sidecarPort);

    return wrapPage(
      `${hud}\n${overlay}\n<div class="next-draw-content">${nextCards}</div>\n${RESULT_AUTO_DISMISS_SCRIPT}`,
      { sidecarPort: this.sidecarPort },
    );
  }

  renderCollection(collection: CollectionCreature[]): string {
    if (collection.length === 0) {
      return wrapPage(
        `<div class="empty-state">
  <div class="empty-state-icon">&#128230;</div>
  <div class="empty-state-text">No creatures in your collection yet.</div>
</div>`,
        { sidecarPort: this.sidecarPort },
      );
    }

    const cards = collection.map((c, i) => {
      const speciesDisplay = c.speciesId.charAt(0).toUpperCase() + c.speciesId.slice(1);
      return `<div class="collection-card" style="animation-delay:${i * 0.04}s">
  ${renderCreatureArtHtml(c.slots, c.speciesId)}
  <div class="collection-name">${i + 1}. ${esc(c.name)}</div>
  <div class="collection-species">${esc(speciesDisplay)} &middot; Gen ${c.generation}</div>
  <div class="collection-traits">${renderTraitsHtml(c.slots, c.speciesId)}</div>
</div>`;
    }).join("\n");

    return wrapPage(
      `<div class="collection-header">Collection (${collection.length})</div>
<div class="collection-grid">${cards}</div>`,
      { sidecarPort: this.sidecarPort },
    );
  }

  renderCompanionOverview(_overview: CompanionOverview): string {
    return "";
  }

  // --- Delegated methods ---

  renderScan(result: ScanResult): string {
    return buildAppHtml(this.fallback.renderScan(result));
  }

  renderCatch(result: CatchResult): string {
    return buildAppHtml(this.fallback.renderCatch(result));
  }

  renderBreedPreview(preview: BreedPreview): string {
    return buildAppHtml(this.fallback.renderBreedPreview(preview));
  }

  renderBreedResult(result: BreedResult): string {
    return buildAppHtml(this.fallback.renderBreedResult(result));
  }

  renderEnergy(energy: number, maxEnergy: number): string {
    return buildAppHtml(this.fallback.renderEnergy(energy, maxEnergy));
  }

  renderStatus(result: StatusResult): string {
    return buildAppHtml(this.fallback.renderStatus(result));
  }

  renderNotification(notification: Notification): string {
    return buildAppHtml(this.fallback.renderNotification(notification));
  }

  renderBreedTable(table: BreedTable): string {
    return buildAppHtml(this.fallback.renderBreedTable(table));
  }

  renderSpeciesIndex(progress: Record<string, boolean[]>): string {
    return buildAppHtml(this.fallback.renderSpeciesIndex(progress));
  }

  renderLevelUp(result: LevelUpResult): string {
    return buildAppHtml(this.fallback.renderLevelUp(result));
  }

  renderDiscovery(result: DiscoveryResult): string {
    return buildAppHtml(this.fallback.renderDiscovery(result));
  }

  renderStatusBar(progress: ProgressInfo): string {
    return buildAppHtml(this.fallback.renderStatusBar(progress));
  }

  renderActionMenu(entries: ActionMenuEntry[]): string {
    return buildAppHtml(this.fallback.renderActionMenu(entries));
  }

  renderProgressPanel(progress: ProgressInfo): string {
    return buildAppHtml(this.fallback.renderProgressPanel(progress));
  }
}
