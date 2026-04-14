#!/usr/bin/env node
import * as path from "path";
import * as os from "os";
import { StateManager } from "./state/state-manager";
import { GameEngine } from "./engine/game-engine";
import { SimpleTextRenderer } from "./renderers/simple-text";
import { logger } from "./logger";
import { MAX_ENERGY } from "./engine/energy";
import { ActionMenuEntry } from "./types";

const statePath =
  process.env.COMPI_STATE_PATH ||
  path.join(os.homedir(), ".compi", "state.json");

const args = process.argv.slice(2);
const command = args[0];
const jsonMode = args.includes("--json");

const stateManager = new StateManager(statePath);
const state = stateManager.load();
const engine = new GameEngine(state);
const renderer = new SimpleTextRenderer();

function output(data: unknown, text: string): void {
  if (jsonMode) {
    console.log(JSON.stringify(data));
  } else {
    console.log(text);
  }
}

function save(): void {
  stateManager.save(engine.getState());
}

/**
 * Print the compact status bar and (in advisor mode) the action menu after a
 * state-changing command. Only shown in non-JSON mode.
 */
function printAdvisorOutput(actionType: string, result: unknown): void {
  if (jsonMode) return;
  const ctx = engine.getAdvisorContext(actionType, result);
  console.log("");
  console.log(renderer.renderStatusBar(ctx.progress));
  if (ctx.mode === "advisor" && ctx.suggestedActions.length > 0) {
    const entries: ActionMenuEntry[] = ctx.suggestedActions.map((a) => ({
      number: a.priority,
      label: a.label,
      cost: a.cost.gold
        ? `${a.cost.gold}g`
        : a.cost.energy
        ? `${a.cost.energy}⚡`
        : undefined,
    }));
    console.log(renderer.renderActionMenu(entries));
  }
}

try {
  switch (command) {
    case "tick": {
      const sessionId = args.find((a) => a.startsWith("--session="))?.split("=")[1];
      const eventType = args.find((a) => a.startsWith("--event="))?.split("=")[1];
      const result = engine.processTick({
        timestamp: Date.now(),
        sessionId,
        eventType,
      });
      save();
      output(result, result.notifications.map((n) => renderer.renderNotification(n)).join("\n"));
      break;
    }

    case "scan": {
      const result = engine.scan();
      save();
      output(result, renderer.renderScan(result));
      break;
    }

    case "catch": {
      const index = parseInt(args[1], 10) - 1;
      if (isNaN(index)) {
        console.error("Usage: compi catch [number]");
        process.exit(1);
      }
      const result = engine.catch(index);
      save();
      output(result, renderer.renderCatch(result));
      printAdvisorOutput("catch", result);
      break;
    }

    case "collection": {
      const collection = engine.getState().collection;
      output(collection, renderer.renderCollection(collection));
      break;
    }

    case "breed":
    case "merge": {
      const argA = args[1];
      const argB = args[2];
      const confirm = args.includes("--confirm");
      if (!argA || !argB) {
        // No args: show breed table
        const breedTable = engine.buildBreedTable();
        output(breedTable, renderer.renderBreedTable(breedTable));
        break;
      }
      // Support both indexes (numbers) and creature IDs (strings)
      let parentAId = argA;
      let parentBId = argB;
      const indexA = parseInt(argA, 10);
      const indexB = parseInt(argB, 10);
      if (!isNaN(indexA) && !isNaN(indexB)) {
        const collection = engine.getState().collection;
        if (indexA < 1 || indexA > collection.length) {
          console.error(`No creature at index ${indexA}. You have ${collection.length} creatures.`);
          process.exit(1);
        }
        if (indexB < 1 || indexB > collection.length) {
          console.error(`No creature at index ${indexB}. You have ${collection.length} creatures.`);
          process.exit(1);
        }
        parentAId = collection[indexA - 1].id;
        parentBId = collection[indexB - 1].id;
      }
      if (confirm) {
        const result = engine.breedExecute(parentAId, parentBId);
        save();
        output(result, renderer.renderBreedResult(result));
        printAdvisorOutput("breed", result);
      } else {
        const preview = engine.breedPreview(parentAId, parentBId);
        output(preview, renderer.renderBreedPreview(preview));
      }
      break;
    }

    case "archive": {
      const creatureId = args[1];
      if (creatureId) {
        const result = engine.archive(creatureId);
        save();
        output(result, `Archived ${result.creature.name}.`);
      } else {
        const archive = engine.getState().archive;
        output(archive, renderer.renderArchive(archive));
      }
      break;
    }

    case "release": {
      const creatureId = args[1];
      if (!creatureId) {
        console.error("Usage: compi release <id>");
        process.exit(1);
      }
      engine.release(creatureId);
      save();
      output({ released: creatureId }, `Released creature ${creatureId}.`);
      break;
    }

    case "energy": {
      const currentState = engine.getState();
      const energyText = renderer.renderEnergy(currentState.energy, MAX_ENERGY);
      output({ energy: currentState.energy, maxEnergy: MAX_ENERGY }, energyText);
      break;
    }

    case "status": {
      const result = engine.status();
      output(result, renderer.renderStatus(result));
      break;
    }

    case "settings": {
      const setting = args[1];
      const value = args[2];
      if (setting && value) {
        const gameState = engine.getState();
        if (setting === "notifications") {
          gameState.settings.notificationLevel = value as "minimal" | "moderate" | "off";
        }
        save();
        output(gameState.settings, `Settings updated: ${setting} = ${value}`);
      } else {
        const settings = engine.getState().settings;
        output(settings, `SETTINGS\n\nNotifications: ${settings.notificationLevel}`);
      }
      break;
    }

    case "upgrade": {
      const creatureIndex = parseInt(args[1], 10);
      const slotId = args[2] as import("./types").SlotId;
      if (isNaN(creatureIndex) || !slotId) {
        console.error("Usage: compi upgrade <creatureIndex> <slotId>");
        console.error("  creatureIndex: 1-indexed position in your collection");
        console.error("  slotId: eyes | mouth | body | tail");
        process.exit(1);
      }
      const collection = engine.getState().collection;
      if (creatureIndex < 1 || creatureIndex > collection.length) {
        console.error(`No creature at index ${creatureIndex}. You have ${collection.length} creatures.`);
        process.exit(1);
      }
      const creatureId = collection[creatureIndex - 1].id;
      const result = engine.upgrade(creatureId, slotId);
      save();
      output(result, renderer.renderUpgradeResult(result));
      printAdvisorOutput("upgrade", result);
      break;
    }

    case "quest": {
      const subCmd = args[1];
      if (subCmd === "start") {
        const rawArgs = args.slice(2).filter(a => !a.startsWith("--"));
        if (rawArgs.length === 0) {
          console.error("Usage: compi quest start <index1> [index2] [index3]");
          process.exit(1);
        }
        // Support both indexes (numbers) and creature IDs (strings)
        const collection = engine.getState().collection;
        const creatureIds = rawArgs.map(a => {
          const idx = parseInt(a, 10);
          if (!isNaN(idx) && idx >= 1 && idx <= collection.length) {
            return collection[idx - 1].id;
          }
          return a;
        });
        const result = engine.questStart(creatureIds);
        save();
        output(result, renderer.renderQuestStart(result));
        printAdvisorOutput("quest", result);
      } else if (subCmd === "check") {
        const result = engine.questCheck();
        save();
        if (result) {
          output(result, renderer.renderQuestComplete(result));
          printAdvisorOutput("quest_complete", result);
        } else {
          const activeQuest = engine.getState().activeQuest;
          if (activeQuest) {
            output(activeQuest, `Quest in progress. ${activeQuest.sessionsRemaining} sessions remaining.`);
          } else {
            output(null, "No active quest. Use: compi quest start <creatureId1> [creatureId2] [creatureId3]");
          }
        }
      } else {
        console.error("Usage:");
        console.error("  compi quest start <creatureId1> [creatureId2] [creatureId3]");
        console.error("  compi quest check");
        process.exit(1);
      }
      break;
    }

    case "gold": {
      const gold = engine.getGold();
      output({ gold }, `Gold: ${gold} 🪙`);
      break;
    }

    default:
      console.log("Compi — Terminal Creature Collection Game\n");
      console.log("Commands:");
      console.log("  tick                    Record activity tick");
      console.log("  scan                    Show nearby creatures");
      console.log("  catch [n]               Catch creature #n");
      console.log("  collection              View your creatures");
      console.log("  breed [N] [M] [--confirm]  Show breed table, preview, or execute");
      console.log("  archive [id]            View archive or archive a creature");
      console.log("  release <id>            Permanently release a creature");
      console.log("  energy                  Show current energy");
      console.log("  status                  Your profile");
      console.log("  settings [key] [value]  View/change settings");
      console.log("  upgrade <index> <slot>  Upgrade a creature's trait (slot: eyes/mouth/body/tail)");
      console.log("  quest start <n...>      Send creatures on a quest (by index)");
      console.log("  quest check             Check if active quest is complete");
      console.log("  gold                    Show current gold balance");
      console.log("\nAdd --json for machine-readable output.");
      break;
  }
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  logger.error(`Command "${command}" failed`, {
    args: args.join(" "),
    error: message,
    stack: err instanceof Error ? err.stack : undefined,
  });
  if (jsonMode) {
    console.log(JSON.stringify({ error: message }));
  } else {
    console.error(`Error: ${message}`);
  }
  process.exit(1);
}
