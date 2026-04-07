#!/usr/bin/env node
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } = require("@modelcontextprotocol/ext-apps/server") as {
  registerAppTool: (server: any, name: string, opts: any, handler: any) => void;
  registerAppResource: (server: any, name: string, uri: string, opts: any, handler: any) => void;
  RESOURCE_MIME_TYPE: string;
};
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
const writeDisplayFile = process.env.COMPI_DISPLAY_FILE === "1";
const displayPath = path.join(os.tmpdir(), "compi_display.txt");

// COMPI_RENDER_MODE=app enables MCP Apps (HTML rendering in IDE chat)
const renderMode = process.env.COMPI_RENDER_MODE || "ansi";

// Load the MCP App HTML template once at startup
const appHtmlPath = path.resolve(__dirname, "..", "src", "mcp-app.html");
let appHtml = "";
try {
  appHtml = fs.readFileSync(appHtmlPath, "utf-8");
} catch {
  // Fallback: try dist-relative path
  try {
    appHtml = fs.readFileSync(path.resolve(__dirname, "mcp-app.html"), "utf-8");
  } catch {}
}

function loadEngine() {
  const stateManager = new StateManager(statePath);
  const state = stateManager.load();
  const engine = new GameEngine(state);
  return { stateManager, engine };
}

function text(content: string) {
  if (writeDisplayFile) {
    fs.writeFileSync(displayPath, content);
  }
  return { content: [{ type: "text" as const, text: content }] };
}

const server = new McpServer({
  name: "compi",
  version: "0.3.0",
});

// --- MCP App resource (shared by all tools) ---
const appResourceUri = "ui://compi/display.html";

if (renderMode === "app" && appHtml) {
  registerAppResource(
    server,
    appResourceUri,
    appResourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => ({
      contents: [{ uri: appResourceUri, mimeType: RESOURCE_MIME_TYPE, text: appHtml }],
    })
  );
}

// Helper: register tool with or without MCP App UI
function registerTool(
  name: string,
  description: string,
  schema: Record<string, any>,
  handler: (args: any) => { content: Array<{ type: "text"; text: string }> }
) {
  if (renderMode === "app" && appHtml) {
    registerAppTool(
      server,
      name,
      {
        title: name.charAt(0).toUpperCase() + name.slice(1),
        description,
        inputSchema: schema,
        _meta: { ui: { resourceUri: appResourceUri } },
      },
      async (args: any) => handler(args)
    );
  } else {
    if (Object.keys(schema).length > 0) {
      // Convert plain schema to zod for McpServer.tool
      const zodSchema: Record<string, any> = {};
      for (const [key, val] of Object.entries(schema)) {
        const v = val as any;
        if (v.type === "number") zodSchema[key] = z.number().describe(v.description || "");
        else if (v.type === "boolean") zodSchema[key] = z.boolean().optional().describe(v.description || "");
        else zodSchema[key] = z.string().optional().describe(v.description || "");
      }
      server.tool(name, description, zodSchema, (args: any) => handler(args));
    } else {
      server.tool(name, description, {}, () => handler({}));
    }
  }
}

// --- Tools ---

registerTool("scan", "Show nearby creatures that can be caught", {}, () => {
  const { stateManager, engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const result = engine.scan();
  stateManager.save(engine.getState());
  return text(renderer.renderScan(result));
});

registerTool(
  "catch",
  "Attempt to catch a nearby creature",
  { index: { type: "number", description: "1-indexed creature number from scan list" } },
  ({ index }: { index: number }) => {
    const { stateManager, engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    const result = engine.catch(index - 1);
    stateManager.save(engine.getState());
    return text(renderer.renderCatch(result));
  }
);

registerTool("collection", "Browse caught creatures", {}, () => {
  const { engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  return text(renderer.renderCollection(engine.getState().collection));
});

registerTool(
  "merge",
  "Merge two creatures from your collection",
  {
    targetId: { type: "string", description: "ID of the creature to keep (gains traits)" },
    foodId: { type: "string", description: "ID of the creature to sacrifice" },
    confirm: { type: "boolean", description: "Set to true to execute the merge after previewing" },
  },
  ({ targetId, foodId, confirm }: { targetId: string; foodId: string; confirm?: boolean }) => {
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

registerTool("energy", "Show current energy level", {}, () => {
  const { engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const state = engine.getState();
  return text(renderer.renderEnergy(state.energy, MAX_ENERGY));
});

registerTool("status", "View player profile and game stats", {}, () => {
  const { engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const result = engine.status();
  return text(renderer.renderStatus(result));
});

registerTool(
  "settings",
  "View or change game settings",
  {
    key: { type: "string", description: "Setting key: 'notifications'" },
    value: { type: "string", description: "New value for the setting" },
  },
  ({ key, value }: { key?: string; value?: string }) => {
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
