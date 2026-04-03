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

export class SimpleTextRenderer implements Renderer {
  renderScan(result: ScanResult): string {
    if (result.nearby.length === 0) {
      return "No signals detected — nothing nearby right now.";
    }

    let out = `┌──────────────────────────────────┐\n`;
    out += `│ NEARBY SIGNALS — ${result.nearby.length} detected${" ".repeat(Math.max(0, 12 - result.nearby.length.toString().length))}│\n`;
    if (result.totalCatchItems !== undefined) {
      out += `│ Catch items: ${result.totalCatchItems}${" ".repeat(Math.max(0, 18 - result.totalCatchItems.toString().length))}│\n`;
    }
    out += `└──────────────────────────────────┘\n\n`;

    for (const entry of result.nearby) {
      const c = entry.creature;
      const art = c.art.simple.map((line) => "    " + line).join("\n");
      out += `┌─ [${entry.index + 1}] ${c.name}${"─".repeat(Math.max(0, 22 - entry.index.toString().length - c.name.length))}┐\n`;
      out += art + "\n";
      out += `│ ${stars(c.rarity)} ${rarityLabel(c.rarity)}${" ".repeat(Math.max(0, 28 - rarityLabel(c.rarity).length))}│\n`;
      out += `│ Catch rate: ${Math.round(entry.catchRate * 100)}%${" ".repeat(Math.max(0, 19 - Math.round(entry.catchRate * 100).toString().length))}│\n`;
      if (entry.attemptsRemaining !== undefined) {
        out += `│ Attempts: ${entry.attemptsRemaining}/${MAX_CATCH_ATTEMPTS}${" ".repeat(Math.max(0, 20 - entry.attemptsRemaining.toString().length - MAX_CATCH_ATTEMPTS.toString().length))}│\n`;
      }
      out += `└──────────────────────────────────┘\n\n`;
    }

    out += "Use /catch [number] to attempt capture";
    return out;
  }

  renderCatch(result: CatchResult): string {
    const c = result.creature;

    if (result.success) {
      let out = `╔════════════════════════════════╗\n`;
      out += `║ ✓✓✓ CAUGHT! ✓✓✓${" ".repeat(Math.max(0, 14))}║\n`;
      out += `╠════════════════════════════════╣\n`;
      out += `║ ${c.name} captured with ${result.itemUsed.name}${" ".repeat(Math.max(0, 30 - c.name.length - result.itemUsed.name.length))}║\n`;
      out += `╠════════════════════════════════╣\n`;
      out += `║ +${result.xpEarned} XP${" ".repeat(Math.max(0, 26 - result.xpEarned.toString().length))}║\n`;
      out += `║ Fragments: ${result.totalFragments}`;
      if (c.evolution) {
        out += `/${c.evolution.fragmentCost}`;
      }
      out += `${" ".repeat(Math.max(0, 18 - result.totalFragments.toString().length - (c.evolution ? c.evolution.fragmentCost.toString().length + 1 : 0)))}║\n`;

      if (result.evolutionReady) {
        out += `║ ★ Ready to evolve!${" ".repeat(Math.max(0, 12))}║\n`;
      }
      if (result.bonusItem) {
        out += `║ Bonus: +${result.bonusItem.count}x ${result.bonusItem.item.name}${" ".repeat(Math.max(0, 21 - result.bonusItem.count.toString().length - result.bonusItem.item.name.length))}║\n`;
      }
      out += `╚════════════════════════════════╝`;
      return out;
    }

    if (result.fled) {
      let out = `╔════════════════════════════════╗\n`;
      out += `║ ✕ FLED!${" ".repeat(Math.max(0, 22))}║\n`;
      out += `╠════════════════════════════════╣\n`;
      out += `║ ${c.name} slipped away for good.${" ".repeat(Math.max(0, 30 - c.name.length - 22))}║\n`;
      out += `║ The ${result.itemUsed.name} was used.${" ".repeat(Math.max(0, 30 - result.itemUsed.name.length - 14))}║\n`;
      out += `╚════════════════════════════════╝`;
      return out;
    }

    let out = `╔════════════════════════════════╗\n`;
    out += `║ ✗ ESCAPED${" ".repeat(Math.max(0, 21))}║\n`;
    out += `╠════════════════════════════════╣\n`;
    out += `║ ${c.name} broke free!${" ".repeat(Math.max(0, 30 - c.name.length - 11))}║\n`;
    out += `║ Try again with another ${result.itemUsed.name}${" ".repeat(Math.max(0, 30 - result.itemUsed.name.length - 24))}║\n`;
    out += `╚════════════════════════════════╝`;
    return out;
  }

  renderCollection(
    collection: CollectionEntry[],
    creatures: Map<string, CreatureDefinition>
  ): string {
    if (collection.length === 0) {
      return "Your collection is empty. Use /scan to find creatures nearby.";
    }

    let out = `┌──────────────────────────────────┐\n`;
    out += `│ COLLECTION — ${collection.length} creatures${" ".repeat(Math.max(0, 14 - collection.length.toString().length))}│\n`;
    out += `└──────────────────────────────────┘\n\n`;

    for (const entry of collection) {
      const c = creatures.get(entry.creatureId);
      if (!c) continue;

      const evolvedLabel = entry.evolved ? " [EVOLVED]" : "";
      out += `┌─ ${c.name}${evolvedLabel}${" ".repeat(Math.max(0, 26 - c.name.length - (entry.evolved ? 9 : 0)))}┐\n`;
      out += `│ ${stars(c.rarity)}${" ".repeat(Math.max(0, 30 - stars(c.rarity).length))}│\n`;

      // Display creature art
      const art = c.art.simple.map((line) => "  " + line).join("\n");
      out += art + "\n";

      out += `│ Caught: ${entry.totalCaught}x${" ".repeat(Math.max(0, 24 - entry.totalCaught.toString().length))}│\n`;
      if (c.evolution && !entry.evolved) {
        out += `│ Fragments: ${entry.fragments}/${c.evolution.fragmentCost}${" ".repeat(Math.max(0, 18 - entry.fragments.toString().length - c.evolution.fragmentCost.toString().length))}│\n`;
        if (entry.fragments >= c.evolution.fragmentCost) {
          out += `│ ✓ Ready to evolve!${" ".repeat(Math.max(0, 12))}│\n`;
        }
      }
      out += `└──────────────────────────────────┘\n\n`;
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

    let out = `┌──────────────────────────────────┐\n`;
    out += `│ INVENTORY${" ".repeat(24)}│\n`;
    out += `└──────────────────────────────────┘\n\n`;

    if (captureItems.length > 0) {
      out += `CAPTURE DEVICES\n`;
      for (const [itemId, count] of captureItems) {
        const item = items.get(itemId);
        if (!item) continue;
        out += `  ├─ ${item.name} x${count}\n`;
        out += `  │  ${item.description}\n`;
      }
      out += "\n";
    }

    if (catalystItems.length > 0) {
      out += `EVOLUTION CATALYSTS\n`;
      for (const [itemId, count] of catalystItems) {
        const item = items.get(itemId);
        if (!item) continue;
        out += `  ├─ ${item.name} x${count}\n`;
        out += `  │  ${item.description}\n`;
      }
      out += "\n";
    }

    return out.trimEnd();
  }

  renderEvolve(result: EvolveResult): string {
    if (!result.success) {
      return "Evolution failed.";
    }

    let out = `╔════════════════════════════════╗\n`;
    out += `║ ★ EVOLUTION COMPLETE! ★${" ".repeat(Math.max(0, 7))}║\n`;
    out += `╠════════════════════════════════╣\n`;
    out += `║ ${result.from.name} → ${result.to.name}${" ".repeat(Math.max(0, 28 - result.from.name.length - result.to.name.length - 3))}║\n`;
    out += `╠════════════════════════════════╣\n`;
    const art = result.to.art.simple.map((line) => "  " + line).join("\n");
    out += art + "\n";
    out += `║${" ".repeat(32)}║\n`;
    out += `║ ${result.to.description}${" ".repeat(Math.max(0, 30 - result.to.description.length))}║\n`;
    if (result.catalystUsed) {
      out += `║ (Used: ${result.catalystUsed})${" ".repeat(Math.max(0, 24 - result.catalystUsed.length))}║\n`;
    }
    out += `╚════════════════════════════════╝`;
    return out;
  }

  renderStatus(result: StatusResult): string {
    const p = result.profile;
    let out = `┌──────────────────────────────────┐\n`;
    out += `│ STATUS${" ".repeat(27)}│\n`;
    out += `├──────────────────────────────────┤\n`;
    out += `│ Level ${p.level}${" ".repeat(Math.max(0, 26 - p.level.toString().length))}│\n`;
    out += `│ XP: ${p.xp}${" ".repeat(Math.max(0, 26 - p.xp.toString().length))}│\n`;
    out += `│ Total catches: ${p.totalCatches}${" ".repeat(Math.max(0, 17 - p.totalCatches.toString().length))}│\n`;
    out += `│ Collection: ${result.collectionCount}/${result.totalCreatures}${" ".repeat(Math.max(0, 18 - result.collectionCount.toString().length - result.totalCreatures.toString().length))}│\n`;
    out += `│ Streak: ${p.currentStreak} days (best: ${p.longestStreak})${" ".repeat(Math.max(0, 11 - p.currentStreak.toString().length - p.longestStreak.toString().length))}│\n`;
    out += `│ Nearby: ${result.nearbyCount} creatures${" ".repeat(Math.max(0, 21 - result.nearbyCount.toString().length))}│\n`;
    out += `│ Total ticks: ${p.totalTicks}${" ".repeat(Math.max(0, 18 - p.totalTicks.toString().length))}│\n`;
    out += `└──────────────────────────────────┘`;
    return out;
  }

  renderNotification(notification: Notification): string {
    return notification.message;
  }
}
