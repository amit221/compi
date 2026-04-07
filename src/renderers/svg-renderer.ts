import {
  Renderer,
  ScanResult,
  CatchResult,
  MergeResult,
  MergePreview,
  StatusResult,
  Notification,
  CollectionCreature,
  CreatureSlot,
  Rarity,
  SlotId,
} from "../types";
import { MAX_ENERGY } from "../engine/energy";
import { getVariantById } from "../config/traits";

// --- SVG color palette (Catppuccin Mocha-inspired) ---

const BG_COLOR = "#1a1a2e";
const TEXT_COLOR = "#e0e0e0";
const BOLD_COLOR = "#ffffff";
const DIM_COLOR = "#888888";
const GREEN = "#00e676";
const YELLOW = "#ffea00";
const BLUE = "#448aff";

const RARITY_COLOR: Record<Rarity, string> = {
  common: "#9e9e9e",
  uncommon: "#ffffff",
  rare: "#00e5ff",
  epic: "#d500f9",
  legendary: "#ffea00",
  mythic: "#ff1744",
};

// --- SVG building helpers ---

const SVG_WIDTH = 500;
const PADDING = 16;
const LINE_HEIGHT = 20;
const FONT_SIZE = 14;
const CHAR_WIDTH = 8.4; // approximate monospace char width at 14px

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface SvgSpan {
  text: string;
  color?: string;
  bold?: boolean;
}

type SvgLine = SvgSpan[];

function span(text: string, color?: string, bold?: boolean): SvgSpan {
  return { text, color, bold };
}

function renderSpansToSvg(spans: SvgSpan[], x: number, y: number): string {
  let parts: string[] = [];
  let currentX = x;
  for (const s of spans) {
    const fill = s.color ?? TEXT_COLOR;
    const weight = s.bold ? ' font-weight="bold"' : "";
    parts.push(
      `<tspan x="${currentX}" fill="${fill}"${weight}>${esc(s.text)}</tspan>`
    );
    currentX += s.text.length * CHAR_WIDTH;
  }
  return `<text y="${y}" font-family="monospace" font-size="${FONT_SIZE}">${parts.join("")}</text>`;
}

function wrapSvg(lines: SvgLine[]): string {
  const contentHeight = lines.length * LINE_HEIGHT;
  const totalHeight = contentHeight + PADDING * 2;
  const svgLines: string[] = [];

  svgLines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_WIDTH}" height="${totalHeight}" viewBox="0 0 ${SVG_WIDTH} ${totalHeight}">`
  );
  svgLines.push(
    `<rect width="${SVG_WIDTH}" height="${totalHeight}" rx="8" fill="${BG_COLOR}"/>`
  );

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length === 0) continue;
    const y = PADDING + (i + 1) * LINE_HEIGHT;
    svgLines.push(renderSpansToSvg(line, PADDING, y));
  }

  svgLines.push("</svg>");
  return svgLines.join("\n");
}

// --- Color helpers ---

function raritySpan(text: string, rarity: Rarity): SvgSpan {
  return span(text, RARITY_COLOR[rarity]);
}

function boldSpan(text: string): SvgSpan {
  return span(text, BOLD_COLOR, true);
}

function dimSpan(text: string): SvgSpan {
  return span(text, DIM_COLOR);
}

function greenSpan(text: string): SvgSpan {
  return span(text, GREEN);
}

function yellowSpan(text: string): SvgSpan {
  return span(text, YELLOW);
}

// --- Creature art ---

function creatureArtLines(slots: CreatureSlot[]): SvgLine[] {
  const bySlot: Partial<Record<SlotId, CreatureSlot>> = {};
  for (const s of slots) {
    bySlot[s.slotId] = s;
  }

  const eyesSlot = bySlot["eyes"];
  const mouthSlot = bySlot["mouth"];
  const bodySlot = bySlot["body"];
  const tailSlot = bySlot["tail"];

  const eyesArt = eyesSlot ? (getVariantById(eyesSlot.variantId)?.art ?? "o.o") : "o.o";
  const mouthArt = mouthSlot ? (getVariantById(mouthSlot.variantId)?.art ?? " - ") : " - ";
  const bodyArt = bodySlot ? (getVariantById(bodySlot.variantId)?.art ?? " \u2591\u2591 ") : " \u2591\u2591 ";
  const tailArt = tailSlot ? (getVariantById(tailSlot.variantId)?.art ?? "~") : "~";

  const eyesRarity = eyesSlot?.rarity ?? "common";
  const mouthRarity = mouthSlot?.rarity ?? "common";
  const bodyRarity = bodySlot?.rarity ?? "common";
  const tailRarity = tailSlot?.rarity ?? "common";

  const pad = "      ";
  return [
    [span(pad), raritySpan(eyesArt, eyesRarity)],
    [span(pad), raritySpan(`(${mouthArt})`, mouthRarity)],
    [span(pad), raritySpan(`\u2571${bodyArt}\u2572`, bodyRarity)],
    [span(pad), raritySpan(tailArt, tailRarity)],
  ];
}

function creatureSideBySideLines(slots: CreatureSlot[]): SvgLine[] {
  const artLines = creatureArtLines(slots);
  const order: SlotId[] = ["eyes", "mouth", "body", "tail"];
  const traitLines: SvgLine[] = [];

  for (const slotId of order) {
    const s = slots.find((sl) => sl.slotId === slotId);
    if (s) {
      const variant = getVariantById(s.variantId);
      const name = variant?.name ?? s.variantId;
      traitLines.push([
        dimSpan(slotId.padEnd(5)),
        span(" "),
        raritySpan(name, s.rarity),
        span(" "),
        dimSpan(`(${s.rarity})`),
      ]);
    } else {
      traitLines.push([dimSpan(slotId.padEnd(5)), span(" "), dimSpan("\u2014")]);
    }
  }

  const gap = "          ";
  const result: SvgLine[] = [];
  for (let i = 0; i < 4; i++) {
    result.push([...artLines[i], span(gap), ...traitLines[i]]);
  }
  return result;
}

// --- Bars ---

function energyBarLine(energy: number, maxEnergy: number): SvgLine {
  const filled = Math.min(10, Math.round((energy / maxEnergy) * 10));
  const bar = "\u2588".repeat(filled) + "\u2591".repeat(10 - filled);
  return [
    span("  "),
    yellowSpan("\u26A1"),
    span(" "),
    greenSpan(bar),
    span(` ${energy}/${maxEnergy}`),
  ];
}

function xpBarSpans(xp: number, nextXp: number): SvgSpan[] {
  const filled = Math.min(10, Math.round((xp / nextXp) * 10));
  const bar = "\u2588".repeat(filled) + "\u2591".repeat(10 - filled);
  return [greenSpan(bar), span(` ${xp}/${nextXp}`)];
}

function upgradeBarSpans(chance: number, rarity: Rarity): SvgSpan[] {
  const filled = Math.round(chance * 10);
  const bar = "\u25B8".repeat(filled) + "\u2591".repeat(10 - filled);
  return [raritySpan(bar, rarity)];
}

// --- Divider ---

function dividerLine(): SvgLine {
  return [span("  "), dimSpan("\u2500".repeat(46))];
}

// --- Renderer ---

export class SvgRenderer implements Renderer {
  renderScan(result: ScanResult): string {
    const lines: SvgLine[] = [];

    lines.push(energyBarLine(result.energy, MAX_ENERGY));
    lines.push([]);

    for (const entry of result.nearby) {
      const c = entry.creature;
      const rate = Math.round(entry.catchRate * 100);
      lines.push([
        span("  "),
        dimSpan(`[${entry.index + 1}]`),
        span(" "),
        boldSpan(c.name),
      ]);
      lines.push([
        span("                    "),
        dimSpan("Rate:"),
        span(` ${rate}%  `),
        dimSpan("Cost:"),
        span(` ${entry.energyCost}`),
        yellowSpan("\u26A1"),
      ]);
      for (const line of creatureSideBySideLines(c.slots)) {
        lines.push(line);
      }
      lines.push([]);
    }

    lines.push(dividerLine());
    lines.push([
      span("  "),
      span("Use ", TEXT_COLOR),
      span("/catch <number>", BLUE),
      span(" to attempt a catch", TEXT_COLOR),
    ]);

    return wrapSvg(lines);
  }

  renderCatch(result: CatchResult): string {
    const c = result.creature;
    const lines: SvgLine[] = [];

    if (result.success) {
      lines.push([span("  "), span("\u2726 CAUGHT! \u2726", GREEN, true)]);
      lines.push([]);
      lines.push([span("  "), boldSpan(c.name), span(" joined your collection!")]);
      for (const line of creatureSideBySideLines(c.slots)) {
        lines.push(line);
      }
      lines.push([]);
      lines.push([
        span("  "),
        dimSpan(`+${result.xpEarned} XP   -${result.energySpent}`),
        yellowSpan("\u26A1"),
      ]);
      lines.push([]);
      lines.push(dividerLine());
    } else if (result.fled) {
      lines.push([span("  "), span("\u2726 FLED \u2726", RARITY_COLOR["mythic"], true)]);
      lines.push([]);
      lines.push([span("  "), boldSpan(c.name), span(" fled into the void!")]);
      lines.push([span("  "), dimSpan("The creature is gone.")]);
      lines.push([]);
      lines.push([
        span("  "),
        dimSpan(`-${result.energySpent}`),
        yellowSpan("\u26A1"),
      ]);
      lines.push([]);
      lines.push(dividerLine());
    } else {
      lines.push([span("  "), span("\u2726 ESCAPED \u2726", RARITY_COLOR["legendary"], true)]);
      lines.push([]);
      lines.push([span("  "), boldSpan(c.name), span(" slipped away!")]);
      for (const line of creatureSideBySideLines(c.slots)) {
        lines.push(line);
      }
      lines.push([]);
      lines.push([
        span("  "),
        dimSpan(`-${result.energySpent}`),
        yellowSpan("\u26A1"),
        span("   "),
        dimSpan(`${result.attemptsRemaining} attempts remaining`),
      ]);
      lines.push([]);
      lines.push(dividerLine());
    }

    return wrapSvg(lines);
  }

  renderMergePreview(preview: MergePreview): string {
    const { target, food, slotChances } = preview;
    const lines: SvgLine[] = [];

    lines.push([
      span("  Feed "),
      boldSpan(food.name),
      span(" "),
      dimSpan(`(Lv ${food.generation})`),
      span(" into "),
      boldSpan(target.name),
      span(" "),
      dimSpan(`(Lv ${target.generation})`),
      span("?"),
    ]);
    lines.push([span("  "), dimSpan(`${food.name} will be consumed.`)]);
    lines.push([]);

    lines.push([span("  "), boldSpan(`Target: ${target.name}`)]);
    for (const line of creatureSideBySideLines(target.slots)) {
      lines.push(line);
    }
    lines.push([]);

    lines.push([span("  "), boldSpan(`Food: ${food.name}`)]);
    for (const line of creatureSideBySideLines(food.slots)) {
      lines.push(line);
    }
    lines.push([]);

    lines.push([span("  "), boldSpan("Upgrade chances:")]);
    const sorted = [...slotChances].sort((a, b) => b.chance - a.chance);
    for (const sc of sorted) {
      const slotLabel = sc.slotId.padEnd(5);
      const pct = `${Math.round(sc.chance * 100)}%`.padStart(3);
      lines.push([
        span("    "),
        raritySpan(slotLabel, sc.currentRarity),
        span("  "),
        ...upgradeBarSpans(sc.chance, sc.currentRarity),
        span(` ${pct}  `),
        dimSpan(`${sc.currentRarity} \u2192 ${sc.nextRarity}`),
      ]);
    }
    lines.push([]);
    lines.push(dividerLine());
    lines.push([span("  "), dimSpan("/merge confirm to proceed")]);

    return wrapSvg(lines);
  }

  renderMergeResult(result: MergeResult): string {
    const { target, food, upgradedSlot, previousRarity, newRarity, graftedVariantName } = result;
    const lines: SvgLine[] = [];

    lines.push([span("  "), span("\u2726 MERGE SUCCESS \u2726", GREEN, true)]);
    lines.push([]);

    lines.push([
      span("  "),
      boldSpan(target.name),
      span(` \u2014 ${upgradedSlot} upgraded!`),
    ]);
    lines.push([
      span("    "),
      raritySpan(previousRarity, previousRarity),
      span(" \u2192 "),
      raritySpan(newRarity, newRarity),
    ]);
    lines.push([span("    "), dimSpan(`\u2192 ${graftedVariantName} (grafted)`)]);
    lines.push([]);

    for (const line of creatureSideBySideLines(target.slots)) {
      lines.push(line);
    }
    lines.push([]);

    lines.push([span("  "), dimSpan(`${food.name} was consumed.`)]);
    lines.push([]);
    lines.push(dividerLine());

    return wrapSvg(lines);
  }

  renderCollection(collection: CollectionCreature[]): string {
    if (collection.length === 0) {
      return wrapSvg([
        [span("  No creatures in your collection yet. Use /scan to find some!")],
      ]);
    }

    const lines: SvgLine[] = [];

    lines.push([span("  "), dimSpan(`Your creatures (${collection.length})`)]);
    lines.push([]);

    for (const creature of collection) {
      lines.push([
        span("  "),
        boldSpan(creature.name),
        span(`  Lv ${creature.generation}`),
      ]);
      for (const line of creatureSideBySideLines(creature.slots)) {
        lines.push(line);
      }
      lines.push([]);
    }

    lines.push(dividerLine());

    return wrapSvg(lines);
  }

  renderEnergy(energy: number, maxEnergy: number): string {
    return wrapSvg([energyBarLine(energy, maxEnergy)]);
  }

  renderStatus(result: StatusResult): string {
    const p = result.profile;
    const nextXp = p.level * 100;
    const lines: SvgLine[] = [];

    lines.push([span("  "), boldSpan("Player Status")]);
    lines.push([]);
    lines.push([span(`  Level: ${p.level}`)]);
    lines.push([span("  XP:    "), ...xpBarSpans(p.xp, nextXp)]);
    lines.push(energyBarLine(result.energy, MAX_ENERGY));
    lines.push([]);
    lines.push([span(`  Catches:    ${p.totalCatches}`)]);
    lines.push([span(`  Merges:     ${p.totalMerges}`)]);
    lines.push([span(`  Collection: ${result.collectionCount} creatures`)]);
    lines.push([
      span(`  Streak:     ${p.currentStreak} days `),
      dimSpan(`(best: ${p.longestStreak})`),
    ]);
    lines.push([span(`  Nearby:     ${result.nearbyCount} creatures`)]);
    lines.push([span(`  Ticks:      ${p.totalTicks.toLocaleString()}`)]);
    lines.push(dividerLine());

    return wrapSvg(lines);
  }

  renderNotification(notification: Notification): string {
    return wrapSvg([[span(notification.message)]]);
  }
}
