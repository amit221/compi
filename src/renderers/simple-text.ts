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
import { MAX_ENERGY } from "../engine/energy";
import { getVariantById } from "../config/traits";
import { getSpeciesById, getTraitDefinition } from "../config/species";
import { getXpForNextLevel } from "../engine/progression";

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

const RARITY_ANSI = ["\x1b[90m", "\x1b[97m", "\x1b[32m", "\x1b[36m", "\x1b[34m", "\x1b[35m", "\x1b[33m", "\x1b[31m"];
const RARITY_NAMES = ["Common", "Uncommon", "Rare", "Superior", "Elite", "Epic", "Legendary", "Mythic"];

function rarityColor(rarity: number | undefined): string {
  return RARITY_ANSI[rarity ?? 0] || "\x1b[90m";
}

// --- Creature art ---

const ART_WIDTH = 13;

function centerLine(rawText: string, coloredText: string): string {
  const w = stringWidth(rawText);
  const left = Math.floor((ART_WIDTH - w) / 2);
  return " ".repeat(Math.max(0, left)) + coloredText;
}

function renderCreatureLines(slots: CreatureSlot[], speciesId?: string): string[] {
  const slotArt: Record<string, string> = {};
  for (const s of slots) {
    const trait = speciesId
      ? getTraitDefinition(speciesId, s.variantId)
      : getVariantById(s.variantId);
    slotArt[s.slotId] = trait?.art ?? "???";
  }

  const slotColor: Record<string, string> = {};
  for (const s of slots) {
    slotColor[s.slotId] = rarityColor(s.rarity);
  }

  const species = speciesId ? getSpeciesById(speciesId) : undefined;
  if (!species?.art) {
    return ["      ???"];
  }

  return species.art.map((line, lineIndex) => {
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
    const color = zoneSlot ? (slotColor[zoneSlot] ?? WHITE) : WHITE;
    return "      " + color + result + RESET;
  });
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

  if (!species?.art) {
    return [GREY + "???" + RESET];
  }

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
      const color = rarityColor(s.rarity);
      const rarityName = RARITY_NAMES[s.rarity ?? 0] ?? "Common";
      traitLines.push(`${DIM}${slotId.padEnd(5)}${RESET} ${color}${name}${RESET} ${DIM}${rarityName}${RESET}`);
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
      const speciesDisplay = c.speciesId.charAt(0).toUpperCase() + c.speciesId.slice(1);
      lines.push(`  ${DIM}[${entry.index + 1}]${RESET} ${BOLD}${c.name}${RESET}  ${DIM}${speciesDisplay}${RESET}`);
      lines.push(`      ${DIM}catch rate: ${rate}%  cost: ${entry.energyCost}${RESET}${ENERGY_ICON}`);
      for (const line of renderCreatureSideBySide(c.slots, c.speciesId)) {
        lines.push(line);
      }
      lines.push("");
    }

    lines.push(divider());
    lines.push(`  ${WHITE}${BLUE}/catch${WHITE} to capture  ·  ${BLUE}/scan${WHITE} for a new one${RESET}`);

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
      lines.push(`  ${BOLD}${c.name}${RESET} joined your collection!`);
      for (const line of renderCreatureSideBySide(c.slots, c.speciesId)) {
        lines.push(line);
      }
      lines.push("");
      if (result.discovery?.isNew) {
        lines.push(`  ${YELLOW}${BOLD}✦ NEW SPECIES: ${result.discovery.speciesId} ✦${RESET}  ${GREEN}+${result.discovery.bonusXp} bonus XP${RESET}`);
      }
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
    lines.push(`  ${DIM}Parents kept. Child added to collection.${RESET}`);
    lines.push("");

    lines.push(`  ${BOLD}Parent A: #${parentAIndex} ${parentA.name}${RESET}`);
    for (const line of renderCreatureSideBySide(parentA.slots, parentA.speciesId)) {
      lines.push(line);
    }
    lines.push("");

    lines.push(`  ${BOLD}Parent B: #${parentBIndex} ${parentB.name}${RESET}`);
    for (const line of renderCreatureSideBySide(parentB.slots, parentB.speciesId)) {
      lines.push(line);
    }
    lines.push("");

    lines.push(`  ${BOLD}Inheritance odds:${RESET}`);
    for (const si of slotInheritance) {
      const slotLabel = si.slotId.padEnd(5);
      const pctA = `${Math.round(si.parentAChance * 100)}%`;
      const pctB = `${Math.round(si.parentBChance * 100)}%`;
      const slotA = parentA.slots.find((s) => s.slotId === si.slotId);
      const slotB = parentB.slots.find((s) => s.slotId === si.slotId);
      const colorA = rarityColor(slotA?.rarity);
      const colorB = rarityColor(slotB?.rarity);
      const rarityNameA = RARITY_NAMES[slotA?.rarity ?? 0] ?? "Common";
      const rarityNameB = RARITY_NAMES[slotB?.rarity ?? 0] ?? "Common";
      lines.push(
        `    ${WHITE}${slotLabel}${RESET}  ${DIM}A:${RESET} ${colorA}${si.parentAVariant.name}${RESET} ${DIM}${rarityNameA}${RESET} ${pctA}  ${DIM}B:${RESET} ${colorB}${si.parentBVariant.name}${RESET} ${DIM}${rarityNameB}${RESET} ${pctB}`
      );
    }
    lines.push("");
    lines.push(`  ${DIM}Energy cost: ${energyCost}${RESET}${ENERGY_ICON}`);
    lines.push(divider());
    lines.push(`  ${DIM}Run /breed ${parentAIndex} ${parentBIndex} --confirm to proceed${RESET}`);

    return lines.join("\n");
  }

  renderBreedResult(result: BreedResult): string {
    const { child, parentA, parentB, inheritedFrom, isCrossSpecies, upgrades } = result;
    const lines: string[] = [];

    if (isCrossSpecies) {
      lines.push(`  ${YELLOW}${BOLD}★ HYBRID SPECIES BORN!${RESET}`);
    }

    lines.push(`  ${GREEN}${BOLD}✦ BREED SUCCESS ✦${RESET}`);
    lines.push("");

    lines.push(`  ${BOLD}${child.name}${RESET} was born!`);
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

    if (upgrades && upgrades.length > 0) {
      lines.push("");
      for (const u of upgrades) {
        const fromName = (["Common","Uncommon","Rare","Superior","Elite","Epic","Legendary","Mythic"])[u.fromRarity] ?? String(u.fromRarity);
        const toName = (["Common","Uncommon","Rare","Superior","Elite","Epic","Legendary","Mythic"])[u.toRarity] ?? String(u.toRarity);
        lines.push(`    ${YELLOW}↑ UP! ${u.slotId}: ${fromName} → ${toName}${RESET}`);
      }
    }

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
      const num = `${i + 1}.`;
      lines.push(`  ${BOLD}${num}${RESET} ${BOLD}${creature.name}${RESET}  ${DIM}${creature.speciesId}${RESET}  Lv ${creature.generation}`);
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
      lines.push(`  ${BOLD}${creature.name}${RESET}  ${DIM}${creature.speciesId}${RESET}  Lv ${creature.generation}`);
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
    lines.push(`  Discovered: ${result.discoveredCount} species`);
    lines.push(`  Streak:     ${p.currentStreak} days ${DIM}(best: ${p.longestStreak})${RESET}`);
    lines.push(`  Nearby:     ${result.nearbyCount} creatures`);
    lines.push(`  Ticks:      ${p.totalTicks.toLocaleString()}`);

    lines.push(divider());

    return lines.join("\n");
  }

  renderSpeciesIndex(progress: Record<string, boolean[]>): string {
    const { getSpeciesIndex } = require("../engine/species-index");
    const entries = getSpeciesIndex(progress);
    if (!entries.length) return "No species discovered yet.";

    const TIER_COLORS_ANSI: Record<number, string> = {
      0: "\x1b[90m",
      1: "\x1b[37m",
      2: "\x1b[32m",
      3: "\x1b[36m",
      4: "\x1b[34m",
      5: "\x1b[35m",
      6: "\x1b[33m",
      7: "\x1b[31m",
    };

    let out = "SPECIES INDEX\n\n";
    const base = entries.filter((e: { isHybrid: boolean }) => !e.isHybrid);
    const hybrids = entries.filter((e: { isHybrid: boolean }) => e.isHybrid);

    for (const e of base) {
      const dots = (e.tiers as boolean[]).map((t: boolean, i: number) =>
        t ? `${TIER_COLORS_ANSI[i]}●${RESET}` : `${DIM}○${RESET}`
      ).join(" ");
      out += `  ${e.speciesId.padEnd(14)} ${dots}  ${e.discovered}/8\n`;
    }

    if (hybrids.length) {
      out += "\n  ── HYBRIDS ──\n\n";
      for (const e of hybrids) {
        const dots = (e.tiers as boolean[]).map((t: boolean, i: number) =>
          t ? `${TIER_COLORS_ANSI[i]}●${RESET}` : `${DIM}○${RESET}`
        ).join(" ");
        const name = e.speciesId.replace("hybrid_", "").replace("_", "×");
        out += `  ${name.padEnd(14)} ${dots}  ${e.discovered}/8\n`;
      }
    }

    return out;
  }

  renderNotification(notification: Notification): string {
    return notification.message;
  }

  renderBreedTable(table: BreedTable): string {
    if (table.species.length === 0) {
      return "  No breedable pairs yet — you need 2+ creatures in your collection.\n  Use /scan and /catch to find more.";
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
      const color = rarityColor(slot.rarity);
      const rarityName = RARITY_NAMES[slot.rarity ?? 0] ?? "Common";
      const label = `${traitName} ${rarityName}`;
      const visibleLen = stringWidth(label);
      const pad = Math.max(0, 14 - visibleLen);
      cells.push(`${color}${traitName}${RESET} ${DIM}${rarityName}${RESET}` + " ".repeat(pad));
    }

    return `  ${num}  ${BOLD}${nameCell}${RESET}  ${lv}   ` + cells.join("   ");
  }

  renderLevelUp(result: LevelUpResult): string {
    const lines: string[] = [];

    lines.push(`  ${YELLOW}${BOLD}✦ LEVEL UP ✦${RESET}`);
    lines.push("");
    lines.push(`  ${DIM}Level:${RESET} ${result.oldLevel} → ${BOLD}${result.newLevel}${RESET}`);
    lines.push("");
    lines.push(divider());
    return lines.join("\n");
  }

  renderDiscovery(result: DiscoveryResult): string {
    const lines: string[] = [];

    if (result.isNew) {
      lines.push(`  ${YELLOW}${BOLD}✦ NEW SPECIES DISCOVERED ✦${RESET}`);
      lines.push("");
      lines.push(`  ${BOLD}${result.speciesId}${RESET} added to your Compidex!`);
      lines.push(`  ${GREEN}+${result.bonusXp} bonus XP${RESET}`);
      lines.push(`  ${DIM}Total discovered: ${result.totalDiscovered}${RESET}`);
      lines.push("");
      lines.push(divider());
    }
    return lines.join("\n");
  }

  /**
   * Compact one-line status bar: energy, collection size, XP%, level.
   */
  renderStatusBar(progress: ProgressInfo): string {
    const energyPart = `${ENERGY_ICON} ${GREEN}${progress.energy}/${progress.energyMax}${RESET}`;
    const collectionPart = `📦 ${DIM}${progress.collectionSize}/${progress.collectionMax}${RESET}`;
    const xpPart = `⭐ ${GREEN}${progress.xpPercent}% XP${RESET}`;
    const levelPart = `${BOLD}Lv.${progress.level}${RESET}`;
    return `  ${levelPart}  ${energyPart}  ${collectionPart}  ${xpPart}`;
  }

  /**
   * Numbered action menu with costs and recommended marker.
   */
  renderActionMenu(entries: ActionMenuEntry[]): string {
    if (entries.length === 0) return "";
    const lines: string[] = [];
    lines.push(`  ${DIM}What next?${RESET}`);
    for (const entry of entries) {
      const num = `${BOLD}${entry.number}.${RESET}`;
      const cost = entry.cost ? `  ${DIM}(${entry.cost})${RESET}` : "";
      const rec = entry.number === 1 ? `  ${GREEN}★${RESET}` : "";
      lines.push(`  ${num} ${entry.label}${cost}${rec}`);
    }
    return lines.join("\n");
  }

  /**
   * Detailed progress panel: XP bar, tier progress, milestones.
   */
  renderProgressPanel(progress: ProgressInfo): string {
    const lines: string[] = [];
    lines.push(divider());
    lines.push(`  ${BOLD}Progress${RESET}`);

    // XP bar
    const filled = Math.min(10, Math.round((progress.xpPercent / 100) * 10));
    const bar = `${GREEN}${"█".repeat(filled)}${"░".repeat(10 - filled)}${RESET}`;
    lines.push(`  ${DIM}XP:${RESET}    ${bar}  ${progress.xp}/${progress.xpToNextLevel}  ${DIM}Lv ${progress.level}${RESET}`);

    // Collection
    lines.push(`  ${DIM}Crew:${RESET}  ${progress.collectionSize}/${progress.collectionMax}`);

    // Best trait
    if (progress.bestTrait) {
      const bt = progress.bestTrait;
      lines.push(`  ${DIM}Best:${RESET}  ${bt.creatureName} ${bt.slot} rank ${bt.rank} ${DIM}(${bt.tierName})${RESET}`);
    }

    // Next species unlock
    if (progress.nextSpeciesUnlock) {
      lines.push(`  ${DIM}Unlock:${RESET} ${progress.nextSpeciesUnlock.species} at Lv ${progress.nextSpeciesUnlock.level}`);
    }

    // Discovered
    lines.push(`  ${DIM}Found:${RESET} ${progress.discoveredCount}/${progress.totalSpecies} species`);

    lines.push(divider());
    return lines.join("\n");
  }

  renderCompanionOverview(_overview: CompanionOverview): string {
    // The companion agent decides what to show — we just provide the status bar
    // (prepended by the MCP tool) and the raw JSON data for the agent to interpret.
    return "";
  }

  renderCardDraw(draw: DrawResult, energy: number, maxEnergy: number, profile: PlayerProfile): string {
    const lines: string[] = [];
    lines.push(this.renderStatusHeader(energy, maxEnergy, profile));
    lines.push("");

    if (draw.noEnergy) {
      lines.push(`  ${DIM}Out of energy. Come back later!${RESET}`);
      return lines.join("\n");
    }

    if (draw.empty) {
      lines.push(`  ${DIM}Nothing happening right now. New creatures spawn every 30 min.${RESET}`);
      return lines.join("\n");
    }

    // Single breed card — render big
    if (draw.cards.length === 1 && draw.cards[0].type === "breed") {
      const bigLines = this.renderBreedCardBig(draw.cards[0]);
      for (const l of bigLines) lines.push(l);
      lines.push("");
      lines.push(`  ${DIM}Reply ${RESET}${BOLD}a${RESET}${DIM} or ${RESET}${BOLD}b${RESET}`);
      return lines.join("\n");
    }

    // Catch cards side-by-side
    const letters = ["A", "B", "C", "D", "E", "F"];
    const cardLineArrays: string[][] = [];
    for (let i = 0; i < draw.cards.length; i++) {
      cardLineArrays.push(this.renderCatchCardLines(draw.cards[i], letters[i]));
    }

    // Pad all to same height
    const maxHeight = Math.max(...cardLineArrays.map((a) => a.length));
    for (const arr of cardLineArrays) {
      while (arr.length < maxHeight) arr.push(" ".repeat(22));
    }

    // Join side-by-side
    for (let row = 0; row < maxHeight; row++) {
      const parts: string[] = [];
      for (const arr of cardLineArrays) {
        parts.push(arr[row]);
      }
      lines.push("  " + parts.join("  "));
    }

    lines.push("");
    lines.push(`  ${DIM}[S] Skip${RESET} ${ENERGY_ICON}${DIM}1${RESET}`);

    return lines.join("\n");
  }

  renderPlayResult(result: PlayResult, energy: number, maxEnergy: number, profile: PlayerProfile): string {
    const lines: string[] = [];
    lines.push(this.renderStatusHeader(energy, maxEnergy, profile));
    lines.push("");

    if (result.action === "catch" && result.catchResult) {
      const cr = result.catchResult;
      if (cr.success) {
        lines.push(`  ${GREEN}${BOLD}✦ CAUGHT! ✦${RESET}  ${BOLD}${cr.creature.name}${RESET} added to collection`);
        if (cr.discovery?.isNew) {
          lines.push(`  ${YELLOW}${BOLD}✦ NEW SPECIES: ${cr.discovery.speciesId} ✦${RESET}  ${GREEN}+${cr.discovery.bonusXp} bonus XP${RESET}`);
        }
        lines.push(`  ${DIM}+${cr.xpEarned} XP   -${cr.energySpent}${RESET}${ENERGY_ICON}`);
      } else if (cr.fled) {
        lines.push(`  ${RED}${BOLD}✦ FLED ✦${RESET}  ${BOLD}${cr.creature.name}${RESET} is gone`);
      } else {
        lines.push(`  ${YELLOW}${BOLD}✦ ESCAPED ✦${RESET}  ${BOLD}${cr.creature.name}${RESET} got away`);
        lines.push(`  ${DIM}${cr.attemptsRemaining} attempts remaining${RESET}`);
      }
    }

    if (result.action === "breed" && result.breedResult) {
      const br = result.breedResult;
      lines.push(`  ${GREEN}${BOLD}✦ BRED! ✦${RESET}  Baby ${BOLD}${br.child.name}${RESET} born!`);
      if (br.upgrades && br.upgrades.length > 0) {
        for (const u of br.upgrades) {
          const fromName = RARITY_NAMES[u.fromRarity] ?? String(u.fromRarity);
          const toName = RARITY_NAMES[u.toRarity] ?? String(u.toRarity);
          lines.push(`  ${YELLOW}↑ UP! ${u.slotId}: ${fromName} → ${toName}${RESET}`);
        }
      }
      if (br.isCrossSpecies) {
        lines.push(`  ${YELLOW}${BOLD}★ HYBRID SPECIES!${RESET}`);
      }
    }

    lines.push("");

    // Render next draw cards (without duplicate status header)
    const nextDraw = result.nextDraw;
    if (nextDraw.noEnergy) {
      lines.push(`  ${DIM}Out of energy. Come back later!${RESET}`);
    } else if (nextDraw.empty) {
      lines.push(`  ${DIM}Nothing happening right now. New creatures spawn every 30 min.${RESET}`);
    } else if (nextDraw.cards.length === 1 && nextDraw.cards[0].type === "breed") {
      const bigLines = this.renderBreedCardBig(nextDraw.cards[0]);
      for (const l of bigLines) lines.push(l);
      lines.push("");
      lines.push(`  ${DIM}Reply ${RESET}${BOLD}a${RESET}${DIM} or ${RESET}${BOLD}b${RESET}`);
    } else {
      const letters = ["A", "B", "C", "D", "E", "F"];
      const cardLineArrays: string[][] = [];
      for (let i = 0; i < nextDraw.cards.length; i++) {
        cardLineArrays.push(this.renderCatchCardLines(nextDraw.cards[i], letters[i]));
      }
      const maxHeight = Math.max(...cardLineArrays.map((a) => a.length));
      for (const arr of cardLineArrays) {
        while (arr.length < maxHeight) arr.push(" ".repeat(22));
      }
      for (let row = 0; row < maxHeight; row++) {
        const parts: string[] = [];
        for (const arr of cardLineArrays) {
          parts.push(arr[row]);
        }
        lines.push("  " + parts.join("  "));
      }
      lines.push("");
      lines.push(`  ${DIM}[S] Skip${RESET} ${ENERGY_ICON}${DIM}1${RESET}`);
    }

    return lines.join("\n");
  }

  private renderStatusHeader(energy: number, maxEnergy: number, profile: PlayerProfile): string {
    const filled = Math.min(10, Math.round((energy / maxEnergy) * 10));
    const bar = `${GREEN}${"█".repeat(filled)}${"░".repeat(10 - filled)}${RESET}`;
    const nextXp = getXpForNextLevel(profile.level);
    return `  ${ENERGY_ICON} ${bar} ${energy}/${maxEnergy}  ${BOLD}Lv.${profile.level}${RESET}  ${DIM}${profile.xp}/${nextXp} XP${RESET}`;
  }

  private renderCatchCardLines(card: Card, letter: string): string[] {
    const CARD_WIDTH = 22;
    const INNER = CARD_WIDTH - 2; // 20
    const data = card.data as CatchCardData;
    const creature = data.creature;
    const lines: string[] = [];

    const topBot = "+" + "-".repeat(INNER) + "+";
    lines.push(topBot);

    // Header
    const headerText = `[${letter}] CATCH`;
    const headerPad = INNER - stringWidth(headerText);
    lines.push("|" + headerText + " ".repeat(Math.max(0, headerPad)) + "|");

    // Separator
    lines.push("|" + "-".repeat(INNER) + "|");

    // Creature art (4 lines)
    const artLines = renderCreatureLines(creature.slots, creature.speciesId);
    for (let i = 0; i < 4; i++) {
      const artLine = artLines[i] ?? "";
      const visW = stringWidth(artLine);
      const pad = Math.max(0, INNER - visW);
      lines.push("|" + artLine + " ".repeat(pad) + "|");
    }

    // Species name (bold)
    const speciesDisplay = creature.speciesId.charAt(0).toUpperCase() + creature.speciesId.slice(1);
    const nameStr = `${BOLD}${speciesDisplay}${RESET}`;
    const nameVisW = stringWidth(speciesDisplay);
    const namePad = Math.max(0, INNER - nameVisW);
    lines.push("|" + nameStr + " ".repeat(namePad) + "|");

    // Separator
    lines.push("|" + "-".repeat(INNER) + "|");

    // 4 trait slots with rarity color
    const order: SlotId[] = ["eyes", "mouth", "body", "tail"];
    for (const slotId of order) {
      const slot = creature.slots.find((s) => s.slotId === slotId);
      if (slot) {
        const color = rarityColor(slot.rarity);
        const variant = creature.speciesId
          ? getTraitDefinition(creature.speciesId, slot.variantId)
          : getVariantById(slot.variantId);
        const traitName = variant?.name ?? slot.variantId;
        const traitStr = `${color}■${RESET} ${traitName}`;
        const traitVisW = stringWidth("■ " + traitName);
        const traitPad = Math.max(0, INNER - traitVisW);
        lines.push("|" + traitStr + " ".repeat(traitPad) + "|");
      } else {
        const emptyStr = `${DIM}—${RESET}`;
        const pad = Math.max(0, INNER - 1);
        lines.push("|" + emptyStr + " ".repeat(pad) + "|");
      }
    }

    // Separator
    lines.push("|" + "-".repeat(INNER) + "|");

    // Energy cost + catch rate
    const rate = Math.round(data.catchRate * 100);
    const costStr = `${ENERGY_ICON}${data.energyCost}  ${rate}%`;
    const costVisW = stringWidth(`⚡${data.energyCost}  ${rate}%`);
    const costPad = Math.max(0, INNER - costVisW);
    lines.push("|" + costStr + " ".repeat(costPad) + "|");

    lines.push(topBot);

    return lines;
  }

  private renderBreedCardBig(card: Card): string[] {
    const CARD_WIDTH = 60;
    const INNER = CARD_WIDTH - 2;
    const data = card.data as BreedCardData;
    const lines: string[] = [];

    const topBot = "+" + "-".repeat(INNER) + "+";
    lines.push(topBot);

    // Title
    const title = "♥ BREEDING MATCH ♥";
    const titleVisW = stringWidth(title);
    const titleLeftPad = Math.floor((INNER - titleVisW) / 2);
    const titleRightPad = INNER - titleVisW - titleLeftPad;
    lines.push("|" + " ".repeat(titleLeftPad) + title + " ".repeat(titleRightPad) + "|");

    lines.push("|" + "-".repeat(INNER) + "|");

    // Both parents' art side-by-side with heart in middle
    const artA = renderCreatureLines(data.parentA.creature.slots, data.parentA.creature.speciesId);
    const artB = renderCreatureLines(data.parentB.creature.slots, data.parentB.creature.speciesId);
    const artHeight = Math.max(artA.length, artB.length);
    const ART_COL = 22;
    const HEART_COL = INNER - ART_COL * 2;

    for (let i = 0; i < artHeight; i++) {
      const leftArt = artA[i] ?? "";
      const rightArt = artB[i] ?? "";
      const leftPadded = padArtLine(leftArt, ART_COL);
      const heartStr = i === Math.floor(artHeight / 2) ? "♥" : " ";
      const heartVisW = stringWidth(heartStr);
      const heartPad = Math.max(0, HEART_COL - heartVisW);
      const heartPadLeft = Math.floor(heartPad / 2);
      const heartPadRight = heartPad - heartPadLeft;
      const rightPadded = padArtLine(rightArt, ART_COL);
      // Compute total visual width and pad to INNER
      const combined = leftPadded + " ".repeat(heartPadLeft) + heartStr + " ".repeat(heartPadRight) + rightPadded;
      const combinedW = stringWidth(combined);
      const finalPad = Math.max(0, INNER - combinedW);
      lines.push("|" + combined + " ".repeat(finalPad) + "|");
    }

    // Parent names
    const nameA = data.parentA.creature.name;
    const nameB = data.parentB.creature.name;
    const nameAPadded = nameA + " ".repeat(Math.max(0, ART_COL - stringWidth(nameA)));
    const nameCenterPad = " ".repeat(HEART_COL);
    const nameBStr = nameB;
    const nameLineContent = nameAPadded + nameCenterPad + nameBStr;
    const nameLineW = stringWidth(nameLineContent);
    const nameLinePad = Math.max(0, INNER - nameLineW);
    lines.push("|" + nameLineContent + " ".repeat(nameLinePad) + "|");

    lines.push("|" + "-".repeat(INNER) + "|");

    // Slot comparison table
    const order: SlotId[] = ["eyes", "mouth", "body", "tail"];
    for (const slotId of order) {
      const upgrade = data.upgradeChances.find((u) => u.slotId === slotId);
      const matchStr = upgrade?.match ? `${GREEN}↑${Math.round(upgrade.upgradeChance * 100)}%${RESET}` : `${DIM}—${RESET}`;
      const matchVisW = upgrade?.match ? stringWidth(`↑${Math.round(upgrade.upgradeChance * 100)}%`) : 1;
      const slotLabel = slotId.padEnd(6);
      const content = `  ${slotLabel} ${matchStr}`;
      const contentVisW = 2 + 6 + 1 + matchVisW;
      const pad = Math.max(0, INNER - contentVisW);
      lines.push("|" + content + " ".repeat(pad) + "|");
    }

    lines.push("|" + "-".repeat(INNER) + "|");

    // Breed / Pass options
    const breedOpt = `[A] Breed ${ENERGY_ICON}${data.energyCost}`;
    const breedVisW = stringWidth(`[A] Breed ⚡${data.energyCost}`);
    const breedPad = Math.max(0, INNER - breedVisW);
    lines.push("|" + breedOpt + " ".repeat(breedPad) + "|");

    const passOpt = `[B] Pass`;
    const passPad = Math.max(0, INNER - stringWidth(passOpt));
    lines.push("|" + passOpt + " ".repeat(passPad) + "|");

    lines.push(topBot);

    return lines;
  }
}
