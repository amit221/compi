#!/usr/bin/env node
import * as path from "path";
import * as os from "os";
import { StateManager } from "./state/state-manager";
import { GameEngine } from "./engine/game-engine";
import { SimpleTextRenderer } from "./renderers/simple-text";
import { logger } from "./logger";
import { MAX_ENERGY } from "./engine/energy";
import { ActionMenuEntry, SlotId, SpeciesDefinition } from "./types";

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
      cost: a.cost.energy
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
        const archive = (engine.getState() as any).archive ?? [];
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

    case "species": {
      const currentState = engine.getState();
      const speciesText = renderer.renderSpeciesIndex(currentState.speciesProgress);
      output(engine.species(), speciesText);
      break;
    }

    case "register-hybrid": {
      // For testing — normally called by AI automatically during breed
      const speciesId = args[1];
      const name = args[2];
      const art = args[3]; // newline-separated art lines
      const description = args[4];
      if (!speciesId || !name || !art || !description) {
        console.error("Usage: compi register-hybrid <speciesId> <name> <art> <description>");
        process.exit(1);
      }
      const currentState = engine.getState();
      if (currentState.personalSpecies.find(s => s.id === speciesId)) {
        output({ registered: false }, `Hybrid species "${name}" (${speciesId}) is already registered.`);
        break;
      }
      const artLines = art.split("\\n");
      const species: SpeciesDefinition = {
        id: speciesId,
        name,
        description,
        spawnWeight: 0,
        art: artLines,
        zones: ["eyes", "mouth", "body", "tail"] as SlotId[],
        traitPools: {},
      };
      currentState.personalSpecies.push(species);
      save();
      output({ registered: true, speciesId, name }, `★ Hybrid species "${name}" registered!\n\n${artLines.join("\n")}\n\n"${description}"`);
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
      console.log("  species                 Show species index");
      console.log("  register-hybrid <id> <name> <art> <desc>  Register a hybrid species (for testing)");
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
