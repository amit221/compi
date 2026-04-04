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
import { getRarityIcon, getCatchRateIcon, getAttemptsIcon } from "../config/icons";

function stars(rarity: string): string {
  const count = RARITY_STARS[rarity as keyof typeof RARITY_STARS] || 1;
  return "*".repeat(count) + "-".repeat(5 - count);
}

function rarityLabel(rarity: string): string {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

// Helper: Expand braille art by ~30% using spacing
function expandBrailleArt(artLines: string[], expandFactor: number = 1.3): string[] {
  return artLines.map((line) => {
    // Add spacing between characters: each char becomes char + space
    const expanded = line.split("").join(" ");
    // Add leading/trailing spaces to center
    const padding = Math.floor((line.length * (expandFactor - 1)) / 2);
    return " ".repeat(padding) + expanded + " ".repeat(padding);
  });
}

// Helper: Center content within terminal width (assume 80 chars)
function centerLine(content: string, width: number = 80): string {
  const padding = Math.max(0, Math.floor((width - content.length) / 2));
  return " ".repeat(padding) + content;
}

export class SimpleTextRenderer implements Renderer {
  renderScan(result: ScanResult): string {
    if (result.nearby.length === 0) {
      return "No signals detected — nothing nearby right now.";
    }

    let out = `Creatures nearby: ${result.nearby.length}\n`;
    if (result.totalCatchItems !== undefined) {
      out += `Catch items: ${result.totalCatchItems}\n\n`;
    }

    for (const entry of result.nearby) {
      const c = entry.creature;

      // Expand art by 30%
      const expandedArt = expandBrailleArt(c.art.simple);
      const artBlock = expandedArt.map((line) => centerLine(line)).join("\n");

      // Build icon line
      const rarityIcon = getRarityIcon(c.rarity);
      const catchIcon = getCatchRateIcon(entry.catchRate);
      const attemptsIcon = getAttemptsIcon(
        entry.attemptsRemaining !== undefined ? entry.attemptsRemaining : 3
      );

      out += `[${entry.index + 1}] ${c.name}\n`;
      out += artBlock + "\n";
      out += centerLine(`${rarityIcon}  ${catchIcon}  ${attemptsIcon}`) + "\n\n";
    }

    out += centerLine("Use /catch [number] to attempt capture");
    return out;
  }

  renderCatch(result: CatchResult): string {
    const c = result.creature;

    if (result.success) {
      let out = centerLine("✓ CAUGHT! ✓") + "\n";
      out += centerLine(`${c.name} captured with ${result.itemUsed.name}`) + "\n\n";
      out += centerLine(`+${result.xpEarned} XP`) + "\n";

      if (c.evolution) {
        const bar = Math.round((result.totalFragments / c.evolution.fragmentCost) * 10);
        out += centerLine(`Fragments: [${" ".repeat(bar)}${" ".repeat(10 - bar)}] ${result.totalFragments}/${c.evolution.fragmentCost}`) + "\n";
      } else {
        out += centerLine(`Fragment: ${result.totalFragments}`) + "\n";
      }

      if (result.evolutionReady) {
        out += centerLine("[Ready to evolve!]") + "\n";
      }
      if (result.bonusItem) {
        out += centerLine(`Bonus: +${result.bonusItem.count}x ${result.bonusItem.item.name}`) + "\n";
      }
      return out.trimEnd();
    }

    if (result.fled) {
      let out = centerLine("✗ FLED! ✗") + "\n";
      out += centerLine(`${c.name} slipped away for good.`) + "\n";
      out += centerLine(`The ${result.itemUsed.name} was used.`) + "\n";
      return out.trimEnd();
    }

    let out = centerLine("✗ ESCAPED ✗") + "\n";
    out += centerLine(`${c.name} broke free!`) + "\n";
    out += centerLine(`Try again with another ${result.itemUsed.name}`) + "\n";
    return out.trimEnd();
  }

  renderCollection(
    collection: CollectionEntry[],
    creatures: Map<string, CreatureDefinition>
  ): string {
    if (collection.length === 0) {
      return "Your collection is empty. Use /scan to find creatures nearby.";
    }

    let out = `Your collection: ${collection.length} creatures\n\n`;

    for (const entry of collection) {
      const c = creatures.get(entry.creatureId);
      if (!c) continue;

      const evolvedLabel = entry.evolved ? " [EVOLVED]" : "";

      // Expand art by 30%
      const expandedArt = expandBrailleArt(c.art.simple);
      const artBlock = expandedArt.map((line) => centerLine(line)).join("\n");

      // Build icon line
      const rarityIcon = getRarityIcon(c.rarity);

      out += centerLine(`${c.name}${evolvedLabel}`) + "\n";
      out += artBlock + "\n";
      out += centerLine(`${rarityIcon} × ${entry.totalCaught}`) + "\n\n";
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

    let out = centerLine("INVENTORY") + "\n\n";

    if (captureItems.length > 0) {
      out += centerLine("CAPTURE DEVICES") + "\n";
      for (const [itemId, count] of captureItems) {
        const item = items.get(itemId);
        if (!item) continue;
        out += centerLine(`${item.name} ×${count}`) + "\n";
      }
      out += "\n";
    }

    if (catalystItems.length > 0) {
      out += centerLine("EVOLUTION CATALYSTS") + "\n";
      for (const [itemId, count] of catalystItems) {
        const item = items.get(itemId);
        if (!item) continue;
        out += centerLine(`${item.name} ×${count}`) + "\n";
      }
      out += "\n";
    }

    return out.trimEnd();
  }

  renderEvolve(result: EvolveResult): string {
    if (!result.success) {
      return "Evolution failed.";
    }

    let out = centerLine("✨ EVOLUTION COMPLETE! ✨") + "\n";
    out += centerLine(`${result.from.name} -> ${result.to.name}`) + "\n\n";

    // Expand and center evolved creature art
    const expandedArt = expandBrailleArt(result.to.art.simple);
    const artBlock = expandedArt.map((line) => centerLine(line)).join("\n");
    out += artBlock + "\n\n";

    out += centerLine(result.to.description) + "\n";
    if (result.catalystUsed) {
      out += centerLine(`(Used: ${result.catalystUsed})`) + "\n";
    }
    return out.trimEnd();
  }

  renderStatus(result: StatusResult): string {
    const p = result.profile;
    let out = centerLine("STATUS") + "\n\n";
    out += centerLine(`Level ${p.level}`) + "\n";

    // XP progress bar
    const nextLevelXP = p.level * 100;
    const xpPercent = (p.xp / nextLevelXP) * 100;
    const xpBar = Math.round(xpPercent / 10);
    out += centerLine(`XP: ${"#".repeat(xpBar)}${"-".repeat(10 - xpBar)} ${p.xp}/${nextLevelXP}`) + "\n";

    out += centerLine(`Total catches: ${p.totalCatches}`) + "\n";

    // Collection progress bar
    const collectionPercent = (result.collectionCount / result.totalCreatures) * 100;
    const collectionBar = Math.round(collectionPercent / 10);
    out += centerLine(`Collection: ${"*".repeat(collectionBar)}${"-".repeat(10 - collectionBar)} ${result.collectionCount}/${result.totalCreatures}`) + "\n";

    out += centerLine(`Streak: ${p.currentStreak} days (best: ${p.longestStreak})`) + "\n";
    out += centerLine(`Nearby: ${result.nearbyCount} creatures`) + "\n";
    out += centerLine(`Total ticks: ${p.totalTicks}`) + "\n";
    return out.trimEnd();
  }

  renderNotification(notification: Notification): string {
    return notification.message;
  }
}
