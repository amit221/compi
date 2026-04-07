#!/usr/bin/env node
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { StateManager } from "./state/state-manager";
import { GameEngine } from "./engine/game-engine";
import { SimpleTextRenderer } from "./renderers/simple-text";
import { MAX_ENERGY } from "./engine/energy";

const statePath =
  process.env.COMPI_STATE_PATH ||
  path.join(os.homedir(), ".compi", "state.json");

// Platforms that can't render ANSI in MCP text (e.g. Claude Code) set
// COMPI_DISPLAY_FILE=1 to have the server write output to a temp file.
// The platform's skill adapter can then cat it for colored terminal output.
const writeDisplayFile = process.env.COMPI_DISPLAY_FILE === "1";
const displayPath = path.join(os.tmpdir(), "compi_display.txt");

function loadEngine() {
  const stateManager = new StateManager(statePath);
  const state = stateManager.load();
  const engine = new GameEngine(state);
  return { stateManager, engine };
}

// MCP always returns full ANSI output.
// Platform-specific rendering happens at the skill/display layer.
function text(content: string) {
  if (writeDisplayFile) {
    fs.writeFileSync(displayPath, content);
  }
  return { content: [{ type: "text" as const, text: content }] };
}

const server = new McpServer({
  name: "compi",
  version: "0.2.0",
});

server.tool("scan", "Show nearby creatures that can be caught", {}, () => {
  const { stateManager, engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const result = engine.scan();
  stateManager.save(engine.getState());
  return text(renderer.renderScan(result));
});

server.tool(
  "catch",
  "Attempt to catch a nearby creature",
  { index: z.number().describe("1-indexed creature number from scan list") },
  ({ index }) => {
    const { stateManager, engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    const result = engine.catch(index - 1);
    stateManager.save(engine.getState());
    return text(renderer.renderCatch(result));
  }
);

server.tool("collection", "Browse caught creatures", {}, () => {
  const { engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  return text(renderer.renderCollection(engine.getState().collection));
});

server.tool(
  "merge",
  "Merge two creatures from your collection",
  {
    targetId: z.string().describe("ID of the creature to keep (gains traits)"),
    foodId: z.string().describe("ID of the creature to sacrifice"),
    confirm: z.boolean().optional().describe("Set to true to execute the merge after previewing"),
  },
  ({ targetId, foodId, confirm }) => {
    const { stateManager, engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    if (confirm) {
      const result = engine.mergeExecute(targetId, foodId);
      stateManager.save(engine.getState());
      return text(renderer.renderMergeResult(result));
    } else {
      const preview = engine.mergePreview(targetId, foodId);
      return text(renderer.renderMergePreview(preview));
    }
  }
);

server.tool("energy", "Show current energy level", {}, () => {
  const { engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const state = engine.getState();
  return text(renderer.renderEnergy(state.energy, MAX_ENERGY));
});

server.tool("status", "View player profile and game stats", {}, () => {
  const { engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const result = engine.status();
  return text(renderer.renderStatus(result));
});

server.tool(
  "settings",
  "View or change game settings",
  { key: z.string().optional().describe("Setting key: 'notifications'"), value: z.string().optional().describe("New value for the setting") },
  ({ key, value }) => {
    const { stateManager, engine } = loadEngine();
    const gameState = engine.getState();
    if (key && value) {
      if (key === "notifications") {
        gameState.settings.notificationLevel = value as "minimal" | "moderate" | "off";
      }
      stateManager.save(gameState);
      return text(`Settings updated: ${key} = ${value}`);
    }
    const settings = gameState.settings;
    return text(`SETTINGS\n\nNotifications: ${settings.notificationLevel}`);
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
