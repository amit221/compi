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
} from "../types";
import { MAX_ENERGY } from "../engine/energy";
import { getVariantById } from "../config/traits";

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

const ENERGY_ICON = `${YELLOW}⚡${RESET}`;

// --- Creature art ---

const ART_WIDTH = 13;

function centerLine(rawText: string, coloredText: string): string {
  const w = stringWidth(rawText);
  const left = Math.floor((ART_WIDTH - w) / 2);
  return " ".repeat(Math.max(0, left)) + coloredText;
}

function renderCreatureLines(slots: CreatureSlot[]): string[] {
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
  const bodyArt = bodySlot ? (getVariantById(bodySlot.variantId)?.art ?? " ░░ ") : " ░░ ";
  const tailArt = tailSlot ? (getVariantById(tailSlot.variantId)?.art ?? "~") : "~";

  const eyesLine = "      " + centerLine(eyesArt, `${WHITE}${eyesArt}${RESET}`);
  const mouthLine = "      " + centerLine(`(${mouthArt})`, `${WHITE}(${mouthArt})${RESET}`);
  const bodyLine = "      " + centerLine(`╱${bodyArt}╲`, `${WHITE}╱${bodyArt}╲${RESET}`);
  const tailLine = "      " + centerLine(tailArt, `${WHITE}${tailArt}${RESET}`);

  return [eyesLine, mouthLine, bodyLine, tailLine];
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

function renderCreatureSideBySide(slots: CreatureSlot[]): string[] {
  const artLines = renderCreatureLines(slots);
  const order: SlotId[] = ["eyes", "mouth", "body", "tail"];
  const traitLines: string[] = [];

  for (const slotId of order) {
    const s = slots.find((sl) => sl.slotId === slotId);
    if (s) {
      const variant = getVariantById(s.variantId);
      const name = variant?.name ?? s.variantId;
      traitLines.push(`${DIM}${slotId.padEnd(5)}${RESET} ${WHITE}${name}${RESET}`);
    } else {
      traitLines.push(`${DIM}${slotId.padEnd(5)}${RESET} ${DIM}—${RESET}`);
    }
  }

  const lines: string[] = [];
  for (let i = 0; i < 4; i++) {
    lines.push(padArtLine(artLines[i], ART_PAD) + traitLines[i]);
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
      lines.push(`  ${DIM}[${entry.index + 1}]${RESET} ${BOLD}${c.name}${RESET} ${DIM}(${c.speciesId})${RESET}`);
      lines.push(`${statsIndent}${DIM}Rate:${RESET} ${rate}%  ${DIM}Cost:${RESET} ${entry.energyCost}${ENERGY_ICON}`);
      for (const line of renderCreatureSideBySide(c.slots)) {
        lines.push(line);
      }
      lines.push("");
    }

    lines.push(divider());
    lines.push(`  ${WHITE}Use ${BLUE}/catch <number>${WHITE} to attempt a catch${RESET}`);

    return lines.join("\n");
  }

  renderCatch(result: CatchResult): string {
    const c = result.creature;
    const lines: string[] = [];

    if (result.success) {
      lines.push(`  ${GREEN}${BOLD}✦ CAUGHT! ✦${RESET}`);
      lines.push("");
      lines.push(`  ${BOLD}${c.name}${RESET} joined your collection!`);
      for (const line of renderCreatureSideBySide(c.slots)) {
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
      for (const line of renderCreatureSideBySide(c.slots)) {
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
    const { parentA, parentB, slotInheritance, energyCost } = preview;
    const lines: string[] = [];

    lines.push(`  Breed ${BOLD}${parentA.name}${RESET} ${DIM}(Lv ${parentA.generation})${RESET} + ${BOLD}${parentB.name}${RESET} ${DIM}(Lv ${parentB.generation})${RESET}?`);
    lines.push(`  ${DIM}Both parents will be consumed.${RESET}`);
    lines.push("");

    lines.push(`  ${BOLD}Parent A: ${parentA.name}${RESET}`);
    for (const line of renderCreatureSideBySide(parentA.slots)) {
      lines.push(line);
    }
    lines.push("");

    lines.push(`  ${BOLD}Parent B: ${parentB.name}${RESET}`);
    for (const line of renderCreatureSideBySide(parentB.slots)) {
      lines.push(line);
    }
    lines.push("");

    lines.push(`  ${BOLD}Inheritance odds:${RESET}`);
    for (const si of slotInheritance) {
      const slotLabel = si.slotId.padEnd(5);
      const pctA = `${Math.round(si.parentAChance * 100)}%`;
      const pctB = `${Math.round(si.parentBChance * 100)}%`;
      lines.push(`    ${WHITE}${slotLabel}${RESET}  ${DIM}A:${RESET} ${pctA}  ${DIM}B:${RESET} ${pctB}`);
    }
    lines.push("");
    lines.push(`  ${DIM}Energy cost: ${energyCost}${RESET}${ENERGY_ICON}`);
    lines.push(divider());
    lines.push(`  ${DIM}/breed confirm to proceed${RESET}`);

    return lines.join("\n");
  }

  renderBreedResult(result: BreedResult): string {
    const { child, parentA, parentB, inheritedFrom } = result;
    const lines: string[] = [];

    lines.push(`  ${GREEN}${BOLD}✦ BREED SUCCESS ✦${RESET}`);
    lines.push("");

    lines.push(`  ${BOLD}${child.name}${RESET} was born!`);
    for (const line of renderCreatureSideBySide(child.slots)) {
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

    for (const creature of collection) {
      lines.push(`  ${BOLD}${creature.name}${RESET}  ${DIM}${creature.speciesId}${RESET}  Lv ${creature.generation}`);
      for (const line of renderCreatureSideBySide(creature.slots)) {
        lines.push(line);
      }
      lines.push("");
    }

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
      for (const line of renderCreatureSideBySide(creature.slots)) {
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
}
