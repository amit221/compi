#!/usr/bin/env node
import * as path from "path";
import * as os from "os";
import { StateManager } from "./state/state-manager";
import { GameEngine } from "./engine/game-engine";
import { SimpleTextRenderer } from "./renderers/simple-text";
import { logger } from "./logger";
import { MAX_ENERGY } from "./engine/energy";
import { drawCards, playCard, skipHand } from "./engine/cards";
import { registerPersonalSpecies } from "./config/species";

const statePath =
  process.env.COMPI_STATE_PATH ||
  path.join(os.homedir(), ".compi", "state.json");

const args = process.argv.slice(2);
const command = args[0];
const jsonMode = args.includes("--json");

const stateManager = new StateManager(statePath);
const state = stateManager.load();
registerPersonalSpecies(state.personalSpecies);
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

    case "play": {
      const choice = args[1];
      const gameState = engine.getState();
      const profile = gameState.profile;

      if (!choice) {
        // No choice — draw cards
        const draw = drawCards(gameState);
        save();
        output(draw, renderer.renderCardDraw(draw, gameState.energy, MAX_ENERGY, profile));
      } else if (choice === "s") {
        // Skip hand
        const draw = skipHand(gameState);
        save();
        output(draw, renderer.renderCardDraw(draw, gameState.energy, MAX_ENERGY, profile));
      } else {
        // Play a card: a=0, b=1, c=2
        const index = choice.charCodeAt(0) - "a".charCodeAt(0);
        if (index < 0 || index > 2) {
          console.error("Usage: compi play [a|b|c|s]");
          process.exit(1);
        }
        // Handle breed pass (choice "b" on a single breed card)
        if (gameState.currentHand?.length === 1 && gameState.currentHand[0].type === "breed" && choice === "b") {
          const draw = skipHand(gameState);
          save();
          output(draw, renderer.renderCardDraw(draw, gameState.energy, MAX_ENERGY, profile));
        } else {
          const result = playCard(gameState, index);
          save();
          output(result, renderer.renderPlayResult(result, gameState.energy, MAX_ENERGY, profile));
        }
      }
      break;
    }

    default:
      console.log("Compi — Terminal Creature Collection Game\n");
      console.log("Commands:");
      console.log("  tick                    Record activity tick");
      console.log("  play                    Draw cards");
      console.log("  play [a|b|c]            Pick a card");
      console.log("  play s                  Skip hand (free redraw)");
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
