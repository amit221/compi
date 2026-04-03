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

    let out = `NEARBY SIGNALS — ${result.nearby.length} detected\n\n`;

    for (const entry of result.nearby) {
      const c = entry.creature;
      const art = c.art.simple.map((line) => "    " + line).join("\n");
      out += `[${entry.index + 1}] ${c.name}\n`;
      out += art + "\n";
      out += `    ${stars(c.rarity)} ${rarityLabel(c.rarity)}\n`;
      out += `    Catch rate: ${Math.round(entry.catchRate * 100)}%\n\n`;
    }

    out += "Use /catch [number] to attempt capture";
    return out;
  }

  renderCatch(result: CatchResult): string {
    const c = result.creature;

    if (result.success) {
      let out = `Caught! ${c.name} captured with ${result.itemUsed.name}.\n`;
      out += `+${result.xpEarned} XP | Fragments: ${result.totalFragments}`;
      if (c.evolution) {
        out += `/${c.evolution.fragmentCost}`;
      }
      if (result.evolutionReady) {
        out += ` — Ready to evolve!`;
      }
      if (result.bonusItem) {
        out += `\nBonus: +${result.bonusItem.count}x ${result.bonusItem.item.name}`;
      }
      return out;
    }

    if (result.fled) {
      return `${c.name} fled! The ${result.itemUsed.name} was used but ${c.name} got away for good.`;
    }

    return `${c.name} escaped the ${result.itemUsed.name}! It's still nearby — try again.`;
  }

  renderCollection(
    collection: CollectionEntry[],
    creatures: Map<string, CreatureDefinition>
  ): string {
    if (collection.length === 0) {
      return "Your collection is empty. Use /scan to find creatures nearby.";
    }

    let out = `COLLECTION — ${collection.length} creatures\n\n`;

    for (const entry of collection) {
      const c = creatures.get(entry.creatureId);
      if (!c) continue;

      const evolvedLabel = entry.evolved ? " [EVOLVED]" : "";
      out += `${c.name}${evolvedLabel}  ${stars(c.rarity)}\n`;
      out += `  Caught: ${entry.totalCaught}x`;
      if (c.evolution && !entry.evolved) {
        out += ` | Fragments: ${entry.fragments}/${c.evolution.fragmentCost}`;
        if (entry.fragments >= c.evolution.fragmentCost) {
          out += ` — Ready to evolve!`;
        }
      }
      out += "\n\n";
    }

    return out.trimEnd();
  }

  renderInventory(
    inventory: Record<string, number>,
    items: Map<string, ItemDefinition>
  ): string {
    const entries = Object.entries(inventory).filter(([, count]) => count > 0);

    if (entries.length === 0) {
      return "Inventory is empty.";
    }

    let out = "INVENTORY\n\n";
    for (const [itemId, count] of entries) {
      const item = items.get(itemId);
      if (!item) continue;
      out += `${item.name} x${count}\n`;
      out += `  ${item.description}\n\n`;
    }

    return out.trimEnd();
  }

  renderEvolve(result: EvolveResult): string {
    if (!result.success) {
      return "Evolution failed.";
    }

    let out = `${result.from.name} evolved into ${result.to.name}!\n\n`;
    const art = result.to.art.simple.map((line) => "  " + line).join("\n");
    out += art + "\n\n";
    out += result.to.description;
    if (result.catalystUsed) {
      out += `\n(Used: ${result.catalystUsed})`;
    }
    return out;
  }

  renderStatus(result: StatusResult): string {
    const p = result.profile;
    let out = "STATUS\n\n";
    out += `Level ${p.level} (${p.xp} XP)\n`;
    out += `Total catches: ${p.totalCatches}\n`;
    out += `Collection: ${result.collectionCount}/${result.totalCreatures}\n`;
    out += `Streak: ${p.currentStreak} days (best: ${p.longestStreak})\n`;
    out += `Nearby: ${result.nearbyCount} creatures\n`;
    out += `Total ticks: ${p.totalTicks}`;
    return out;
  }

  renderNotification(notification: Notification): string {
    return notification.message;
  }
}
