import {
  Renderer,
  ScanResult,
  CatchResult,
  EvolveResult,
  StatusResult,
  Notification,
  CollectionEntry,
  CreatureDefinition,
  ItemDefinition,
  RARITY_STARS,
} from "../types";
import { MAX_CATCH_ATTEMPTS } from "../config/constants";

function stars(rarity: string): string {
  const count = RARITY_STARS[rarity as keyof typeof RARITY_STARS] || 1;
  return "*".repeat(count) + "-".repeat(5 - count);
}

function rarityLabel(rarity: string): string {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

// Helper: Pad content to exactly 34 chars: | content padded |
function pad(content: string): string {
  const interiorWidth = 32; // 34 - 2 borders
  const padding = Math.max(0, interiorWidth - content.length);
  return `| ${content}${" ".repeat(padding)}|`;
}

// Helper: Pad content with double borders: | content padded |
function padDouble(content: string): string {
  const interiorWidth = 32; // 34 - 2 borders
  const padding = Math.max(0, interiorWidth - content.length);
  return `| ${content}${" ".repeat(padding)}|`;
}

export class SimpleTextRenderer implements Renderer {
  renderScan(result: ScanResult): string {
    if (result.nearby.length === 0) {
      return "No signals detected — nothing nearby right now.";
    }

    let out = `NEARBY SIGNALS — ${result.nearby.length} detected\n`;
    if (result.totalCatchItems !== undefined) {
      out += `Catch items: ${result.totalCatchItems}\n`;
    }
    out += "\n";

    // Group creatures into rows of 3
    for (let i = 0; i < result.nearby.length; i += 3) {
      const rowCreatures = result.nearby.slice(i, i + 3);
      const rows = this.formatCreatureRow(rowCreatures);
      out += rows + "\n";
    }

    out += "Use /catch [number] to attempt capture";
    return out;
  }

  private formatCreatureRow(entries: ScanResult["nearby"]): string {
    const colWidth = 20;

    // Get max height of art to align rows
    const maxArtHeight = Math.max(
      ...entries.map((e) => e.creature.art.simple.length)
    );

    // Build each line of the row
    const lines: string[] = [];

    // Top border
    let topBorder = "";
    for (let i = 0; i < entries.length; i++) {
      topBorder += "+" + "-".repeat(colWidth - 1);
    }
    topBorder += "+";
    lines.push(topBorder);

    // Name/header line
    let nameLine = "|";
    for (const entry of entries) {
      const label = `[${entry.index + 1}] ${entry.creature.name}`;
      nameLine += label.padEnd(colWidth - 1) + "|";
    }
    lines.push(nameLine);

    // Art lines
    for (let artLine = 0; artLine < maxArtHeight; artLine++) {
      let artRowLine = "|";
      for (const entry of entries) {
        const c = entry.creature;
        const line =
          artLine < c.art.simple.length ? c.art.simple[artLine] : "";
        artRowLine += line.padEnd(colWidth - 1) + "|";
      }
      lines.push(artRowLine);
    }

    // Rarity line
    let rarityLine = "|";
    for (const entry of entries) {
      const c = entry.creature;
      const rarity = `${stars(c.rarity)} ${rarityLabel(c.rarity)}`;
      rarityLine += rarity.padEnd(colWidth - 1) + "|";
    }
    lines.push(rarityLine);

    // Catch rate line
    let rateLine = "|";
    for (const entry of entries) {
      const rate = Math.round(entry.catchRate * 100);
      const rateStr = `Rate: ${rate}%`;
      rateLine += rateStr.padEnd(colWidth - 1) + "|";
    }
    lines.push(rateLine);

    // Attempts line
    let attemptsLine = "|";
    for (const entry of entries) {
      let attStr = "";
      if (entry.attemptsRemaining !== undefined) {
        const attemptBar =
          "*".repeat(entry.attemptsRemaining) +
          "o".repeat(MAX_CATCH_ATTEMPTS - entry.attemptsRemaining);
        attStr = `Att: [${attemptBar}]`;
      } else {
        attStr = "Att: [***]";
      }
      attemptsLine += attStr.padEnd(colWidth - 1) + "|";
    }
    lines.push(attemptsLine);

    // Bottom border
    let bottomBorder = "";
    for (let i = 0; i < entries.length; i++) {
      bottomBorder += "+" + "-".repeat(colWidth - 1);
    }
    bottomBorder += "+";
    lines.push(bottomBorder);

    return lines.join("\n");
  }

  renderCatch(result: CatchResult): string {
    const c = result.creature;

    if (result.success) {
      let out = `+==================================+\n`;
      out += padDouble("*** CAUGHT! ***") + "\n";
      out += `+==================================+\n`;
      out += padDouble(`${c.name} captured with ${result.itemUsed.name}`) + "\n";
      out += `+==================================+\n`;
      out += padDouble(`+${result.xpEarned} XP`) + "\n";

      if (c.evolution) {
        const bar = Math.round((result.totalFragments / c.evolution.fragmentCost) * 10);
        out += padDouble(`Fragments: [${" ".repeat(bar)}${" ".repeat(10 - bar)}] ${result.totalFragments}/${c.evolution.fragmentCost}`) + "\n";
      } else {
        out += padDouble(`Fragment: ${result.totalFragments}`) + "\n";
      }

      if (result.evolutionReady) {
        out += padDouble("[Ready to evolve!]") + "\n";
      }
      if (result.bonusItem) {
        out += padDouble(`Bonus: +${result.bonusItem.count}x ${result.bonusItem.item.name}`) + "\n";
      }
      out += `+==================================+`;
      return out;
    }

    if (result.fled) {
      let out = `+==================================+\n`;
      out += padDouble("* FLED! *") + "\n";
      out += `+==================================+\n`;
      out += padDouble(`${c.name} slipped away for good.`) + "\n";
      out += padDouble(`The ${result.itemUsed.name} was used.`) + "\n";
      out += `+==================================+`;
      return out;
    }

    let out = `+==================================+\n`;
    out += padDouble("X ESCAPED") + "\n";
    out += `+==================================+\n`;
    out += padDouble(`${c.name} broke free!`) + "\n";
    out += padDouble(`Try again with another ${result.itemUsed.name}`) + "\n";
    out += `+==================================+`;
    return out;
  }

  renderCollection(
    collection: CollectionEntry[],
    creatures: Map<string, CreatureDefinition>
  ): string {
    if (collection.length === 0) {
      return "Your collection is empty. Use /scan to find creatures nearby.";
    }

    let out = `+----------------------------------+\n`;
    out += pad(`COLLECTION — ${collection.length} creatures`) + "\n";
    out += `+----------------------------------+\n\n`;

    for (const entry of collection) {
      const c = creatures.get(entry.creatureId);
      if (!c) continue;

      const evolvedLabel = entry.evolved ? " [EVOLVED]" : "";
      const headerContent = `${c.name}${evolvedLabel}`;
      const dashes = Math.max(0, 32 - headerContent.length - 1);
      out += `+ ${headerContent}${" ".repeat(dashes)}+\n`;

      out += pad(stars(c.rarity)) + "\n";

      // Display creature art
      const art = c.art.simple.map((line) => "  " + line).join("\n");
      out += art + "\n";

      out += pad(`Caught: ${entry.totalCaught}x`) + "\n";
      if (c.evolution && !entry.evolved) {
        const bar = Math.round((entry.fragments / c.evolution.fragmentCost) * 10);
        out += pad(`Frags: [${" ".repeat(bar)}${" ".repeat(10 - bar)}] ${entry.fragments}/${c.evolution.fragmentCost}`) + "\n";
        if (entry.fragments >= c.evolution.fragmentCost) {
          out += pad("[Ready to evolve!]") + "\n";
        }
      }
      out += `+----------------------------------+\n\n`;
    }

    return out.trimEnd();
  }

  renderInventory(
    inventory: Record<string, number>,
    items: Map<string, ItemDefinition>
  ): string {
    const entries = Object.entries(inventory).filter(([, count]) => count > 0);

    if (entries.length === 0) {
      return "Inventory is empty. Complete tasks and catches to earn items.";
    }

    // Separate capture and catalyst items
    const captureItems: typeof entries = [];
    const catalystItems: typeof entries = [];

    for (const [itemId, count] of entries) {
      const item = items.get(itemId);
      if (!item) continue;
      if (item.type === "capture") {
        captureItems.push([itemId, count]);
      } else {
        catalystItems.push([itemId, count]);
      }
    }

    let out = `+----------------------------------+\n`;
    out += pad("INVENTORY") + "\n";
    out += `+----------------------------------+\n\n`;

    if (captureItems.length > 0) {
      out += `CAPTURE DEVICES\n`;
      for (const [itemId, count] of captureItems) {
        const item = items.get(itemId);
        if (!item) continue;
        out += `  +- ${item.name} x${count}\n`;
        out += `     ${item.description}\n`;
      }
      out += "\n";
    }

    if (catalystItems.length > 0) {
      out += `EVOLUTION CATALYSTS\n`;
      for (const [itemId, count] of catalystItems) {
        const item = items.get(itemId);
        if (!item) continue;
        out += `  +- ${item.name} x${count}\n`;
        out += `     ${item.description}\n`;
      }
      out += "\n";
    }

    return out.trimEnd();
  }

  renderEvolve(result: EvolveResult): string {
    if (!result.success) {
      return "Evolution failed.";
    }

    let out = `+==================================+\n`;
    out += padDouble("[* EVOLUTION COMPLETE! *]") + "\n";
    out += `+==================================+\n`;
    out += padDouble(`${result.from.name} -> ${result.to.name}`) + "\n";
    out += `+==================================+\n`;
    const art = result.to.art.simple.map((line) => "  " + line).join("\n");
    out += art + "\n";
    out += padDouble("") + "\n";
    out += padDouble(result.to.description) + "\n";
    if (result.catalystUsed) {
      out += padDouble(`(Used: ${result.catalystUsed})`) + "\n";
    }
    out += `+==================================+`;
    return out;
  }

  renderStatus(result: StatusResult): string {
    const p = result.profile;
    let out = `+----------------------------------+\n`;
    out += pad("STATUS") + "\n";
    out += `+----------------------------------+\n`;
    out += pad(`Level ${p.level}`) + "\n";

    // XP progress bar
    const nextLevelXP = p.level * 100;
    const xpPercent = (p.xp / nextLevelXP) * 100;
    const xpBar = Math.round(xpPercent / 10);
    out += pad(`XP: ${"#".repeat(xpBar)}${"-".repeat(10 - xpBar)} ${p.xp}/${nextLevelXP}`) + "\n";

    out += pad(`Total catches: ${p.totalCatches}`) + "\n";

    // Collection progress bar
    const collectionPercent = (result.collectionCount / result.totalCreatures) * 100;
    const collectionBar = Math.round(collectionPercent / 10);
    out += pad(`Collection: ${"*".repeat(collectionBar)}${"-".repeat(10 - collectionBar)} ${result.collectionCount}/${result.totalCreatures}`) + "\n";

    out += pad(`Streak: ${p.currentStreak} days (best: ${p.longestStreak})`) + "\n";
    out += pad(`Nearby: ${result.nearbyCount} creatures`) + "\n";
    out += pad(`Total ticks: ${p.totalTicks}`) + "\n";
    out += `+----------------------------------+`;
    return out;
  }

  renderNotification(notification: Notification): string {
    return notification.message;
  }
}
