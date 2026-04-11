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
  BreedTableSpecies,
  BreedTableRow,
} from "../types";
import { MAX_ENERGY } from "../engine/energy";
import { getVariantById } from "../config/traits";
import { getSpeciesById, getTraitDefinition } from "../config/species";
import { calculateSlotScore, calculateCreatureScore, calculateTraitRarityScore } from "../engine/rarity";

const stringWidth = require("string-width") as (str: string) => number;

// --- ANSI codes ---
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const WHITE = "\x1b[97m";
const BLUE = "\x1b[34m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";

const COLOR_ANSI: Record<string, string> = {
  grey: "\x1b[90m",
  white: "\x1b[97m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

const ENERGY_ICON = `${YELLOW}⚡${RESET}`;

// --- Rarity to color mapping ---

function calculateRarityColor(rarityScore: number): string {
  // Maps 1-100 rarity score to 8 color tiers
  if (rarityScore <= 12.5) return COLOR_ANSI.grey;
  if (rarityScore <= 25) return COLOR_ANSI.white;
  if (rarityScore <= 37.5) return COLOR_ANSI.green;
  if (rarityScore <= 50) return COLOR_ANSI.cyan;
  if (rarityScore <= 62.5) return COLOR_ANSI.blue;
  if (rarityScore <= 75) return COLOR_ANSI.magenta;
  if (rarityScore <= 87.5) return COLOR_ANSI.yellow;
  return COLOR_ANSI.red;
}

// --- Creature art ---

const ART_WIDTH = 13;

function centerLine(rawText: string, coloredText: string): string {
  const w = stringWidth(rawText);
  const left = Math.floor((ART_WIDTH - w) / 2);
  return " ".repeat(Math.max(0, left)) + coloredText;
}

function renderCreatureLines(slots: CreatureSlot[], speciesId?: string): string[] {
  // Build slot-to-art map using species-aware lookup
  const slotArt: Record<string, string> = {};
  for (const s of slots) {
    const trait = speciesId
      ? getTraitDefinition(speciesId, s.variantId)
      : getVariantById(s.variantId);
    slotArt[s.slotId] = trait?.art ?? "???";
  }

  // Build slot-to-color map (based on rarity, not slot color)
  const slotColor: Record<string, string> = {};
  for (const s of slots) {
    const rarityScore = speciesId ? calculateTraitRarityScore(speciesId, s.slotId, s.variantId) : 50;
    slotColor[s.slotId] = calculateRarityColor(rarityScore);
  }

  const species = speciesId ? getSpeciesById(speciesId) : undefined;

  if (species?.art) {
    // Use species art template with placeholder replacement
    // Color the entire line with the slot color so frame characters match
    return species.art.map((line) => {
      let result = line;
      const replacements: [string, string, string][] = [
        ["EE", slotArt["eyes"] ?? "", slotColor["eyes"] ?? WHITE],
        ["MM", slotArt["mouth"] ?? "", slotColor["mouth"] ?? WHITE],
        ["BB", slotArt["body"] ?? "", slotColor["body"] ?? WHITE],
        ["TT", slotArt["tail"] ?? "", slotColor["tail"] ?? WHITE],
      ];
      let lineColor: string | null = null;
      for (const [placeholder, art, color] of replacements) {
        if (result.includes(placeholder)) {
          result = result.replace(placeholder, art);
          lineColor = color;
        }
      }
      if (lineColor) {
        return "      " + lineColor + result + RESET;
      }
      return "      " + result;
    });
  }

  // Fallback: original hardcoded layout (for backward compat)
  const eyesArt = slotArt["eyes"] ?? "o.o";
  const mouthArt = slotArt["mouth"] ?? " - ";
  const bodyArt = slotArt["body"] ?? " ░░ ";
  const tailArt = slotArt["tail"] ?? "~";

  const eyesC = slotColor["eyes"] ?? WHITE;
  const mouthC = slotColor["mouth"] ?? WHITE;
  const bodyC = slotColor["body"] ?? WHITE;
  const tailC = slotColor["tail"] ?? WHITE;

  const eyesLine = "      " + centerLine(eyesArt, `${eyesC}${eyesArt}${RESET}`);
  const mouthLine = "      " + centerLine(`(${mouthArt})`, `${mouthC}(${mouthArt})${RESET}`);
  const bodyLine = "      " + centerLine(`╱${bodyArt}╲`, `${bodyC}╱${bodyArt}╲${RESET}`);
  const tailLine = "      " + centerLine(tailArt, `${tailC}${tailArt}${RESET}`);

  return [eyesLine, mouthLine, bodyLine, tailLine];
}

/**
 * Render a creature's slots as art lines overridden to a single neutral grey,
 * regardless of per-slot rarity. Used as a species "silhouette" next to the
 * breed table. The slot art itself still comes from the species template.
 */
function renderGreySilhouette(slots: CreatureSlot[], speciesId: string): string[] {
  const slotArt: Record<string, string> = {};
  for (const s of slots) {
    const trait = getTraitDefinition(speciesId, s.variantId);
    slotArt[s.slotId] = trait?.art ?? "???";
  }

  const species = getSpeciesById(speciesId);
  const GREY = COLOR_ANSI.grey;

  if (species?.art) {
    return species.art.map((line) => {
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
      return GREY + result + RESET;
    });
  }

  // Fallback: same shape as the non-species path in renderCreatureLines
  const eyesArt = slotArt["eyes"] ?? "o.o";
  const mouthArt = slotArt["mouth"] ?? " - ";
  const bodyArt = slotArt["body"] ?? " ░░ ";
  const tailArt = slotArt["tail"] ?? "~";
  return [
    `      ${GREY}${eyesArt}${RESET}`,
    `     ${GREY}(${mouthArt})${RESET}`,
    `    ${GREY}╱${bodyArt}╲${RESET}`,
    `      ${GREY}${tailArt}${RESET}`,
  ];
}

// --- Progress bars ---

function energyBar(energy: number, maxEnergy: number): string {
  const filled = Math.min(10, Math.round((energy / maxEnergy) * 10));
  const bar = "█".repeat(filled) + "░".repeat(10 - filled);
  return `  ${ENERGY_ICON} ${GREEN}${bar}${RESET} ${energy}/${maxEnergy}`;
}

function xpBar(xp: number, nextXp: number): string {
  const filled = Math.min(10, Math.round((xp / nextXp) * 10));
  const bar = "█".repeat(filled) + "░".repeat(10 - filled);
  return `${GREEN}${bar}${RESET} ${xp}/${nextXp}`;
}

// --- Divider ---

function divider(): string {
  return `  ${DIM}${"─".repeat(46)}${RESET}`;
}

// --- Side-by-side creature + traits display ---

const ART_PAD = 20; // fixed width for the art column (visual chars)

function padArtLine(line: string, targetWidth: number): string {
  const w = stringWidth(line);
  const pad = Math.max(0, targetWidth - w);
  return line + " ".repeat(pad);
}

function renderCreatureSideBySide(slots: CreatureSlot[], speciesId?: string): string[] {
  const artLines = renderCreatureLines(slots, speciesId);
  const order: SlotId[] = ["eyes", "mouth", "body", "tail"];
  const traitLines: string[] = [];

  for (const slotId of order) {
    const s = slots.find((sl) => sl.slotId === slotId);
    if (s) {
      const variant = speciesId ? getTraitDefinition(speciesId, s.variantId) : getVariantById(s.variantId);
      const name = variant?.name ?? s.variantId;
      const rarityScore = speciesId ? calculateTraitRarityScore(speciesId, s.slotId, s.variantId) : 50;
      const rarityColor = calculateRarityColor(rarityScore);
      const score = speciesId ? Math.round(calculateSlotScore(speciesId, s)) : 50;
      traitLines.push(`${DIM}${slotId.padEnd(5)}${RESET} ${rarityColor}${name}${RESET} ${DIM}[${score}]${RESET}`);
    } else {
      traitLines.push(`${DIM}${slotId.padEnd(5)}${RESET} ${DIM}—${RESET}`);
    }
  }

  const lines: string[] = [];
  const maxLines = Math.max(artLines.length, traitLines.length);
  for (let i = 0; i < maxLines; i++) {
    const artLine = artLines[i] ?? "";
    const traitLine = traitLines[i] ?? "";
    lines.push(padArtLine(artLine, ART_PAD) + traitLine);
  }
  return lines;
}

// --- Compact horizontal trait display (for scan list) ---

function horizontalTraitLine(slots: CreatureSlot[]): string {
  const order: SlotId[] = ["eyes", "mouth", "body", "tail"];
  const parts: string[] = [];
  for (const slotId of order) {
    const s = slots.find((sl) => sl.slotId === slotId);
    if (s) {
      const variant = getVariantById(s.variantId);
      const art = variant?.art ?? "?";
      parts.push(`${WHITE}${art.padEnd(6)}${RESET}`);
    }
  }
  return `      ${parts.join(" ")}`;
}

function horizontalLabelLine(): string {
  return `      ${DIM}eyes   mouth  body   tail${RESET}`;
}

export class SimpleTextRenderer implements Renderer {
  renderScan(result: ScanResult): string {
    const lines: string[] = [];

    lines.push(`  ${ENERGY_ICON} ${GREEN}${"█".repeat(Math.min(10, Math.round((result.energy / MAX_ENERGY) * 10)))}${"░".repeat(10 - Math.min(10, Math.round((result.energy / MAX_ENERGY) * 10)))}${RESET} ${result.energy}/${MAX_ENERGY}`);
    lines.push("");

    for (const entry of result.nearby) {
      const c = entry.creature;
      const rate = Math.round(entry.catchRate * 100);
      const statsIndent = " ".repeat(ART_PAD);
      const creatureScore = calculateCreatureScore(c.speciesId, c.slots);
      lines.push(`  ${DIM}[${entry.index + 1}]${RESET} ${BOLD}${c.name}${RESET} ${DIM}(${c.speciesId})${RESET}  ⭐ ${creatureScore}`);
      lines.push(`${statsIndent}${DIM}Rate:${RESET} ${rate}%  ${DIM}Cost:${RESET} ${entry.energyCost}${ENERGY_ICON}`);
      for (const line of renderCreatureSideBySide(c.slots, c.speciesId)) {
        lines.push(line);
      }
      lines.push("");
    }

    lines.push(divider());
    lines.push(`  ${WHITE}Use ${BLUE}/catch <number>${WHITE} to attempt a catch${RESET}`);

    if (result.nextBatchInMs > 0) {
      const mins = Math.ceil(result.nextBatchInMs / 60000);
      lines.push(`  ${DIM}Next batch in ~${mins} min${RESET}`);
    } else {
      lines.push(`  ${DIM}New batch available now${RESET}`);
    }

    return lines.join("\n");
  }

  renderCatch(result: CatchResult): string {
    const c = result.creature;
    const lines: string[] = [];

    if (result.success) {
      lines.push(`  ${GREEN}${BOLD}✦ CAUGHT! ✦${RESET}`);
      lines.push("");
      const creatureScore = calculateCreatureScore(c.speciesId, c.slots);
      lines.push(`  ${BOLD}${c.name}${RESET} joined your collection!  ⭐ ${creatureScore}`);
      for (const line of renderCreatureSideBySide(c.slots, c.speciesId)) {
        lines.push(line);
      }
      lines.push("");
      lines.push(`  ${DIM}+${result.xpEarned} XP   -${result.energySpent}${RESET}${ENERGY_ICON}`);
      lines.push("");
      lines.push(divider());
    } else if (result.fled) {
      lines.push(`  ${RED}${BOLD}✦ FLED ✦${RESET}`);
      lines.push("");
      lines.push(`  ${BOLD}${c.name}${RESET} fled into the void!`);
      lines.push(`  ${DIM}The creature is gone.${RESET}`);
      lines.push("");
      lines.push(`  ${DIM}-${result.energySpent}${RESET}${ENERGY_ICON}`);
      lines.push("");
      lines.push(divider());
    } else {
      lines.push(`  ${YELLOW}${BOLD}✦ ESCAPED ✦${RESET}`);
      lines.push("");
      lines.push(`  ${BOLD}${c.name}${RESET} slipped away!`);
      for (const line of renderCreatureSideBySide(c.slots, c.speciesId)) {
        lines.push(line);
      }
      lines.push("");
      lines.push(`  ${DIM}-${result.energySpent}${RESET}${ENERGY_ICON}   ${DIM}${result.attemptsRemaining} attempts remaining${RESET}`);
      lines.push("");
      lines.push(divider());
    }

    return lines.join("\n");
  }

  renderBreedPreview(preview: BreedPreview): string {
    const { parentA, parentB, parentAIndex, parentBIndex, slotInheritance, energyCost } = preview;
    const lines: string[] = [];

    lines.push(`  Breed ${BOLD}#${parentAIndex} ${parentA.name}${RESET} ${DIM}(Lv ${parentA.generation})${RESET} + ${BOLD}#${parentBIndex} ${parentB.name}${RESET} ${DIM}(Lv ${parentB.generation})${RESET}?`);
    lines.push(`  ${DIM}Both parents will be consumed.${RESET}`);
    lines.push("");

    const scoreA = calculateCreatureScore(parentA.speciesId, parentA.slots);
    lines.push(`  ${BOLD}Parent A: #${parentAIndex} ${parentA.name}${RESET}  ⭐ ${scoreA}`);
    for (const line of renderCreatureSideBySide(parentA.slots, parentA.speciesId)) {
      lines.push(line);
    }
    lines.push("");

    const scoreB = calculateCreatureScore(parentB.speciesId, parentB.slots);
    lines.push(`  ${BOLD}Parent B: #${parentBIndex} ${parentB.name}${RESET}  ⭐ ${scoreB}`);
    for (const line of renderCreatureSideBySide(parentB.slots, parentB.speciesId)) {
      lines.push(line);
    }
    lines.push("");

    lines.push(`  ${BOLD}Inheritance odds:${RESET}`);
    for (const si of slotInheritance) {
      const slotLabel = si.slotId.padEnd(5);
      const pctA = `${Math.round(si.parentAChance * 100)}%`;
      const pctB = `${Math.round(si.parentBChance * 100)}%`;
      const traitScoreA = Math.round(calculateTraitRarityScore(parentA.speciesId, si.slotId, si.parentAVariant.id));
      const traitScoreB = Math.round(calculateTraitRarityScore(parentB.speciesId, si.slotId, si.parentBVariant.id));
      const colorA = calculateRarityColor(traitScoreA);
      const colorB = calculateRarityColor(traitScoreB);
      lines.push(
        `    ${WHITE}${slotLabel}${RESET}  ${DIM}A:${RESET} ${colorA}${si.parentAVariant.name} [${traitScoreA}]${RESET} ${pctA}  ${DIM}B:${RESET} ${colorB}${si.parentBVariant.name} [${traitScoreB}]${RESET} ${pctB}`
      );
    }
    lines.push("");
    lines.push(`  ${DIM}Energy cost: ${energyCost}${RESET}${ENERGY_ICON}`);
    lines.push(divider());
    lines.push(`  ${DIM}Run /breed ${parentAIndex} ${parentBIndex} --confirm to proceed${RESET}`);

    return lines.join("\n");
  }

  renderBreedResult(result: BreedResult): string {
    const { child, parentA, parentB, inheritedFrom } = result;
    const lines: string[] = [];

    lines.push(`  ${GREEN}${BOLD}✦ BREED SUCCESS ✦${RESET}`);
    lines.push("");

    const childScore = calculateCreatureScore(child.speciesId, child.slots);
    lines.push(`  ${BOLD}${child.name}${RESET} was born!  ⭐ ${childScore}`);
    for (const line of renderCreatureSideBySide(child.slots, child.speciesId)) {
      lines.push(line);
    }
    lines.push("");

    lines.push(`  ${DIM}Inherited from:${RESET}`);
    for (const slot of child.slots) {
      const from = inheritedFrom[slot.slotId];
      const parentName = from === "A" ? parentA.name : parentB.name;
      lines.push(`    ${DIM}${slot.slotId}${RESET} → ${from} (${parentName})`);
    }
    lines.push("");

    lines.push(`  ${DIM}Both parents consumed.${RESET}`);
    lines.push("");
    lines.push(divider());

    return lines.join("\n");
  }

  renderCollection(collection: CollectionCreature[]): string {
    const lines: string[] = [];

    if (collection.length === 0) {
      return "  No creatures in your collection yet. Use /scan to find some!";
    }

    lines.push(`  ${DIM}Your creatures (${collection.length})${RESET}`);
    lines.push("");

    collection.forEach((creature, i) => {
      const creatureScore = calculateCreatureScore(creature.speciesId, creature.slots);
      const num = `${i + 1}.`;
      lines.push(`  ${BOLD}${num}${RESET} ${BOLD}${creature.name}${RESET}  ${DIM}${creature.speciesId}${RESET}  Lv ${creature.generation}  ⭐ ${creatureScore}`);
      for (const line of renderCreatureSideBySide(creature.slots, creature.speciesId)) {
        lines.push(line);
      }
      lines.push("");
    });

    lines.push(divider());

    return lines.join("\n");
  }

  renderArchive(archive: CollectionCreature[]): string {
    const lines: string[] = [];

    if (archive.length === 0) {
      return "  No creatures in your archive yet.";
    }

    lines.push(`  ${DIM}Archive (${archive.length})${RESET}`);
    lines.push("");

    for (const creature of archive) {
      const creatureScore = calculateCreatureScore(creature.speciesId, creature.slots);
      lines.push(`  ${BOLD}${creature.name}${RESET}  ${DIM}${creature.speciesId}${RESET}  Lv ${creature.generation}  ⭐ ${creatureScore}`);
      for (const line of renderCreatureSideBySide(creature.slots, creature.speciesId)) {
        lines.push(line);
      }
      lines.push("");
    }

    lines.push(divider());

    return lines.join("\n");
  }

  renderEnergy(energy: number, maxEnergy: number): string {
    return energyBar(energy, maxEnergy);
  }

  renderStatus(result: StatusResult): string {
    const p = result.profile;
    const nextXp = p.level * 100;
    const lines: string[] = [];

    lines.push(`  ${BOLD}Player Status${RESET}`);
    lines.push("");
    lines.push(`  Level: ${p.level}`);
    lines.push(`  XP:    ${xpBar(p.xp, nextXp)}`);
    lines.push(`  ${ENERGY_ICON} ${GREEN}${"█".repeat(Math.min(10, Math.round((result.energy / MAX_ENERGY) * 10)))}${"░".repeat(10 - Math.min(10, Math.round((result.energy / MAX_ENERGY) * 10)))}${RESET} ${result.energy}/${MAX_ENERGY}`);
    lines.push("");
    lines.push(`  Catches:    ${p.totalCatches}`);
    lines.push(`  Merges:     ${p.totalMerges}`);
    lines.push(`  Collection: ${result.collectionCount} creatures`);
    lines.push(`  Archive:    ${result.archiveCount} creatures`);
    lines.push(`  Streak:     ${p.currentStreak} days ${DIM}(best: ${p.longestStreak})${RESET}`);
    lines.push(`  Nearby:     ${result.nearbyCount} creatures`);
    lines.push(`  Ticks:      ${p.totalTicks.toLocaleString()}`);
    lines.push(divider());

    return lines.join("\n");
  }

  renderNotification(notification: Notification): string {
    return notification.message;
  }

  renderBreedTable(table: BreedTable): string {
    if (table.species.length === 0) {
      return "  No breedable pairs yet — you need 2+ creatures of the same species.\n  Use /scan and /catch to find more.";
    }

    const lines: string[] = [];
    const totalCreatures = table.species.reduce((n, s) => n + s.rows.length, 0);

    lines.push(`  ${DIM}${"═".repeat(74)}${RESET}`);
    lines.push(`  ${BOLD}BREED${RESET}   ${DIM}${totalCreatures} creatures, ${table.species.length} species${RESET}`);
    lines.push(`  ${DIM}${"═".repeat(74)}${RESET}`);
    lines.push("");

    for (const s of table.species) {
      this.appendBreedSpeciesSection(lines, s);
      lines.push("");
    }

    lines.push(`  ${DIM}${"─".repeat(74)}${RESET}`);
    lines.push(`  ${DIM}Run /breed N M to preview a pair  ·  add --confirm to execute${RESET}`);
    lines.push(`  ${DIM}${"─".repeat(74)}${RESET}`);

    return lines.join("\n");
  }

  private appendBreedSpeciesSection(lines: string[], species: BreedTableSpecies): void {
    lines.push(`  ${BOLD}${species.speciesId}${RESET}  ${DIM}${species.rows.length} creatures${RESET}`);
    lines.push(`  ${DIM}${"─".repeat(74)}${RESET}`);

    const header = `  ${DIM}  #    NAME       LV    EYES             MOUTH            BODY             TAIL${RESET}`;
    const rule = `  ${DIM}  ───  ─────────  ──    ──────────────   ──────────────   ──────────────   ──────────────${RESET}`;

    const silhouette = renderGreySilhouette(species.silhouette, species.speciesId);
    const rowTexts: string[] = [header, rule];
    for (const row of species.rows) {
      rowTexts.push(this.breedRowLine(row, species.speciesId));
    }

    const total = Math.max(silhouette.length, rowTexts.length);
    for (let i = 0; i < total; i++) {
      const sil = silhouette[i] ?? "";
      const txt = rowTexts[i] ?? "";
      lines.push(this.padSilhouette(sil) + " " + txt);
    }
  }

  private padSilhouette(silhouetteLine: string): string {
    const visible = silhouetteLine.replace(/\x1b\[[0-9;]*m/g, "");
    const target = 14;
    const pad = Math.max(0, target - stringWidth(visible));
    return "  " + silhouetteLine + " ".repeat(pad);
  }

  private breedRowLine(row: BreedTableRow, speciesId: string): string {
    const { creatureIndex, creature } = row;
    const num = String(creatureIndex).padStart(3);
    const nameCell = creature.name.padEnd(9);
    const lv = String(creature.generation).padStart(2);

    const order: SlotId[] = ["eyes", "mouth", "body", "tail"];
    const cells: string[] = [];
    for (const slotId of order) {
      const slot = creature.slots.find((s) => s.slotId === slotId);
      if (!slot) {
        cells.push(`${DIM}—${RESET}`.padEnd(16));
        continue;
      }
      const variant = getTraitDefinition(speciesId, slot.variantId);
      const traitName = variant?.name ?? slot.variantId;
      const score = Math.round(
        calculateTraitRarityScore(speciesId, slot.slotId, slot.variantId)
      );
      const color = calculateRarityColor(score);
      const label = `${traitName} [${score}]`;
      const visibleLen = stringWidth(label);
      const pad = Math.max(0, 14 - visibleLen);
      cells.push(`${color}${label}${RESET}` + " ".repeat(pad));
    }

    return `  ${num}  ${BOLD}${nameCell}${RESET}  ${lv}   ` + cells.join("   ");
  }
}
