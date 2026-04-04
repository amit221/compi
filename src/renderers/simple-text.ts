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
import { MAX_CATCH_ATTEMPTS, MESSAGES } from "../config/constants";
import { formatMessage } from "../config/loader";

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
      return MESSAGES.scan.empty;
    }

    let out = `${formatMessage(MESSAGES.scan.header, { count: result.nearby.length })}\n`;
    if (result.totalCatchItems !== undefined) {
      out += `${formatMessage(MESSAGES.scan.catchItems, { count: result.totalCatchItems })}\n`;
    }
    out += "\n";

    // Group creatures into rows of 3
    for (let i = 0; i < result.nearby.length; i += 3) {
      const rowCreatures = result.nearby.slice(i, i + 3);
      const rows = this.formatCreatureRow(rowCreatures);
      out += rows + "\n";
    }

    out += MESSAGES.scan.footer;
    return out;
  }

  private formatCreatureRow(entries: ScanResult["nearby"]): string {
    const artWidth = 12;
    const detailsWidth = 22;
    const cardWidth = artWidth + detailsWidth;

    // Format each creature card individually
    const creatureCards = entries.map((entry) => {
      const c = entry.creature;
      const card: string[] = [];

      // Top border
      card.push("+" + "-".repeat(cardWidth));

      // Get details
      const name = `[${entry.index + 1}] ${c.name}`;
      const rarity = `${stars(c.rarity)} ${rarityLabel(c.rarity)}`;
      const rate = Math.round(entry.catchRate * 100);
      const rateStr = `Rate: ${rate}%`;
      const attemptBar =
        entry.attemptsRemaining !== undefined
          ? "*".repeat(entry.attemptsRemaining) +
            "o".repeat(MAX_CATCH_ATTEMPTS - entry.attemptsRemaining)
          : "***";
      const attStr = `Att: [${attemptBar}]`;

      // Build card with art on left, details on right
      const maxHeight = Math.max(c.art.simple.length, 5);
      for (let i = 0; i < maxHeight; i++) {
        let line = "|";
        // Art (left side)
        const artLine =
          i < c.art.simple.length ? c.art.simple[i] : "";
        line += artLine.padEnd(artWidth);

        // Details (right side)
        let detail = "";
        if (i === 0) detail = name.substring(0, detailsWidth - 1);
        else if (i === 1) detail = rarity.substring(0, detailsWidth - 1);
        else if (i === 2) detail = rateStr.substring(0, detailsWidth - 1);
        else if (i === 3) detail = attStr.substring(0, detailsWidth - 1);

        line += detail.padEnd(detailsWidth - 1);
        line += "|";
        card.push(line);
      }

      // Bottom border
      card.push("+" + "-".repeat(cardWidth) + "+");
      return card;
    });

    // Combine cards horizontally
    const lines: string[] = [];
    if (creatureCards.length > 0) {
      const maxLines = creatureCards[0].length;
      for (let lineIdx = 0; lineIdx < maxLines; lineIdx++) {
        let combined = "";
        for (const card of creatureCards) {
          combined += (card[lineIdx] || "").substring(0, cardWidth + 1);
        }
        lines.push(combined);
      }
    }

    return lines.join("\n");
  }

  renderCatch(result: CatchResult): string {
    const c = result.creature;

    if (result.success) {
      let out = `+==================================+\n`;
      out += padDouble(MESSAGES.catch.successHeader) + "\n";
      out += `+==================================+\n`;
      out += padDouble(formatMessage(MESSAGES.catch.captured, { name: c.name, item: result.itemUsed.name })) + "\n";
      out += `+==================================+\n`;
      out += padDouble(formatMessage(MESSAGES.catch.xpGained, { xp: result.xpEarned })) + "\n";

      if (c.evolution) {
        const bar = Math.round((result.totalFragments / c.evolution.fragmentCost) * 10);
        out += padDouble(formatMessage(MESSAGES.catch.fragmentProgress, { bar: `${" ".repeat(bar)}${" ".repeat(10 - bar)}`, count: result.totalFragments, cost: c.evolution.fragmentCost })) + "\n";
      } else {
        out += padDouble(formatMessage(MESSAGES.catch.fragmentCount, { count: result.totalFragments })) + "\n";
      }

      if (result.evolutionReady) {
        out += padDouble(MESSAGES.catch.evolutionReady) + "\n";
      }
      if (result.bonusItem) {
        out += padDouble(formatMessage(MESSAGES.catch.bonusItem, { count: result.bonusItem.count, name: result.bonusItem.item.name })) + "\n";
      }
      out += `+==================================+`;
      return out;
    }

    if (result.fled) {
      let out = `+==================================+\n`;
      out += padDouble(MESSAGES.catch.fledHeader) + "\n";
      out += `+==================================+\n`;
      out += padDouble(formatMessage(MESSAGES.catch.fledMessage, { name: c.name })) + "\n";
      out += padDouble(formatMessage(MESSAGES.catch.itemUsed, { item: result.itemUsed.name })) + "\n";
      out += `+==================================+`;
      return out;
    }

    let out = `+==================================+\n`;
    out += padDouble(MESSAGES.catch.escapedHeader) + "\n";
    out += `+==================================+\n`;
    out += padDouble(formatMessage(MESSAGES.catch.escapedMessage, { name: c.name })) + "\n";
    out += padDouble(formatMessage(MESSAGES.catch.escapedHint, { item: result.itemUsed.name })) + "\n";
    out += `+==================================+`;
    return out;
  }

  renderCollection(
    collection: CollectionEntry[],
    creatures: Map<string, CreatureDefinition>
  ): string {
    if (collection.length === 0) {
      return MESSAGES.collection.empty;
    }

    let out = `+----------------------------------+\n`;
    out += pad(formatMessage(MESSAGES.collection.header, { count: collection.length })) + "\n";
    out += `+----------------------------------+\n\n`;

    for (const entry of collection) {
      const c = creatures.get(entry.creatureId);
      if (!c) continue;

      const evolvedLabel = entry.evolved ? ` ${MESSAGES.collection.evolved}` : "";
      const headerContent = `${c.name}${evolvedLabel}`;
      const dashes = Math.max(0, 32 - headerContent.length - 1);
      out += `+ ${headerContent}${" ".repeat(dashes)}+\n`;

      out += pad(stars(c.rarity)) + "\n";

      // Display creature art
      const art = c.art.simple.map((line) => "  " + line).join("\n");
      out += art + "\n";

      out += pad(formatMessage(MESSAGES.collection.caught, { count: entry.totalCaught })) + "\n";
      if (c.evolution && !entry.evolved) {
        const bar = Math.round((entry.fragments / c.evolution.fragmentCost) * 10);
        out += pad(formatMessage(MESSAGES.collection.fragProgress, { bar: `${" ".repeat(bar)}${" ".repeat(10 - bar)}`, count: entry.fragments, cost: c.evolution.fragmentCost })) + "\n";
        if (entry.fragments >= c.evolution.fragmentCost) {
          out += pad(MESSAGES.collection.evolutionReady) + "\n";
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
      return MESSAGES.inventory.empty;
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
    out += pad(MESSAGES.inventory.header) + "\n";
    out += `+----------------------------------+\n\n`;

    if (captureItems.length > 0) {
      out += `${MESSAGES.inventory.captureSection}\n`;
      for (const [itemId, count] of captureItems) {
        const item = items.get(itemId);
        if (!item) continue;
        out += `  +- ${item.name} x${count}\n`;
        out += `     ${item.description}\n`;
      }
      out += "\n";
    }

    if (catalystItems.length > 0) {
      out += `${MESSAGES.inventory.catalystSection}\n`;
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
      return MESSAGES.evolve.failed;
    }

    let out = `+==================================+\n`;
    out += padDouble(MESSAGES.evolve.successHeader) + "\n";
    out += `+==================================+\n`;
    out += padDouble(formatMessage(MESSAGES.evolve.transform, { from: result.from.name, to: result.to.name })) + "\n";
    out += `+==================================+\n`;
    const art = result.to.art.simple.map((line) => "  " + line).join("\n");
    out += art + "\n";
    out += padDouble("") + "\n";
    out += padDouble(result.to.description) + "\n";
    if (result.catalystUsed) {
      out += padDouble(formatMessage(MESSAGES.evolve.catalystUsed, { catalyst: result.catalystUsed })) + "\n";
    }
    out += `+==================================+`;
    return out;
  }

  renderStatus(result: StatusResult): string {
    const p = result.profile;
    let out = `+----------------------------------+\n`;
    out += pad(MESSAGES.status.header) + "\n";
    out += `+----------------------------------+\n`;
    out += pad(formatMessage(MESSAGES.status.level, { level: p.level })) + "\n";

    // XP progress bar
    const nextLevelXP = p.level * 100;
    const xpPercent = (p.xp / nextLevelXP) * 100;
    const xpBar = Math.round(xpPercent / 10);
    out += pad(formatMessage(MESSAGES.status.xp, { bar: `${"#".repeat(xpBar)}${"-".repeat(10 - xpBar)}`, xp: p.xp, nextXp: nextLevelXP })) + "\n";

    out += pad(formatMessage(MESSAGES.status.catches, { count: p.totalCatches })) + "\n";

    // Collection progress bar
    const collectionPercent = (result.collectionCount / result.totalCreatures) * 100;
    const collectionBar = Math.round(collectionPercent / 10);
    out += pad(formatMessage(MESSAGES.status.collection, { bar: `${"*".repeat(collectionBar)}${"-".repeat(10 - collectionBar)}`, count: result.collectionCount, total: result.totalCreatures })) + "\n";

    out += pad(formatMessage(MESSAGES.status.streak, { streak: p.currentStreak, best: p.longestStreak })) + "\n";
    out += pad(formatMessage(MESSAGES.status.nearby, { count: result.nearbyCount })) + "\n";
    out += pad(formatMessage(MESSAGES.status.ticks, { count: p.totalTicks })) + "\n";
    out += `+----------------------------------+`;
    return out;
  }

  renderNotification(notification: Notification): string {
    return notification.message;
  }
}
