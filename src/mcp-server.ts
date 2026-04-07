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
import { SvgRenderer } from "./renderers/svg-renderer";
import { Resvg } from "@resvg/resvg-js";
import { MAX_ENERGY } from "./engine/energy";
import { Renderer } from "./types";

const statePath =
  process.env.COMPI_STATE_PATH ||
  path.join(os.homedir(), ".compi", "state.json");

// COMPI_RENDER_MODE controls output format:
//   "ansi" (default) — ANSI colored text for terminal display
//   "svg"            — SVG image returned as base64 for IDE chat (e.g. Cursor)
const renderMode = process.env.COMPI_RENDER_MODE || "ansi";

// Platforms that can't render ANSI in MCP text (e.g. Claude Code) set
// COMPI_DISPLAY_FILE=1 to have the server write output to a temp file.
const writeDisplayFile = process.env.COMPI_DISPLAY_FILE === "1";
const displayPath = path.join(os.tmpdir(), "compi_display.txt");

function createRenderer(): Renderer {
  return renderMode === "svg" ? new SvgRenderer() : new SimpleTextRenderer();
}

function loadEngine() {
  const stateManager = new StateManager(statePath);
  const state = stateManager.load();
  const engine = new GameEngine(state);
  return { stateManager, engine };
}

function svgToPngBase64(svg: string): string {
  const resvg = new Resvg(svg, { fitTo: { mode: "width" as const, value: 1000 } });
  const rendered = resvg.render();
  return rendered.asPng().toString("base64");
}

function output(content: string) {
  if (renderMode === "svg") {
    const pngBase64 = svgToPngBase64(content);
    return { content: [{ type: "image" as const, data: pngBase64, mimeType: "image/png" }] };
  }
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
  const renderer = createRenderer();
  const result = engine.scan();
  stateManager.save(engine.getState());
  return output(renderer.renderScan(result));
});

server.tool(
  "catch",
  "Attempt to catch a nearby creature",
  { index: z.number().describe("1-indexed creature number from scan list") },
  ({ index }) => {
    const { stateManager, engine } = loadEngine();
    const renderer = createRenderer();
    const result = engine.catch(index - 1);
    stateManager.save(engine.getState());
    return output(renderer.renderCatch(result));
  }
);

server.tool("collection", "Browse caught creatures", {}, () => {
  const { engine } = loadEngine();
  const renderer = createRenderer();
  return output(renderer.renderCollection(engine.getState().collection));
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
    const renderer = createRenderer();
    if (confirm) {
      const result = engine.mergeExecute(targetId, foodId);
      stateManager.save(engine.getState());
      return output(renderer.renderMergeResult(result));
    } else {
      const preview = engine.mergePreview(targetId, foodId);
      return output(renderer.renderMergePreview(preview));
    }
  }
);

server.tool("energy", "Show current energy level", {}, () => {
  const { engine } = loadEngine();
  const renderer = createRenderer();
  const state = engine.getState();
  return output(renderer.renderEnergy(state.energy, MAX_ENERGY));
});

server.tool("status", "View player profile and game stats", {}, () => {
  const { engine } = loadEngine();
  const renderer = createRenderer();
  const result = engine.status();
  return output(renderer.renderStatus(result));
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
      return output(`Settings updated: ${key} = ${value}`);
    }
    const settings = gameState.settings;
    return output(`SETTINGS\n\nNotifications: ${settings.notificationLevel}`);
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
