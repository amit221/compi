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

// COMPI_DISPLAY_FILE=1: Claude Code mode — write ANSI to temp file for cat display
const writeDisplayFile = process.env.COMPI_DISPLAY_FILE === "1";
const displayPath = path.join(os.tmpdir(), "compi_display.txt");

// When not in Claude Code, use MCP Apps for HTML rendering
const useMcpApps = !writeDisplayFile;

// Server-side ANSI → HTML conversion for MCP Apps
const ANSI_TO_CSS: Record<string, string> = {
  "30": "#1a1a2e", "31": "#ff1744", "32": "#00e676", "33": "#ffea00",
  "34": "#448aff", "35": "#d500f9", "36": "#00e5ff", "37": "#e0e0e0",
  "90": "#9e9e9e", "91": "#ff1744", "92": "#00e676", "93": "#ffea00",
  "94": "#448aff", "95": "#d500f9", "96": "#00e5ff", "97": "#ffffff",
};

function ansiToHtml(text: string): string {
  let html = "";
  let openSpans = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\x1b" && text[i + 1] === "[") {
      const end = text.indexOf("m", i + 2);
      if (end === -1) { html += text[i]; continue; }
      const codes = text.slice(i + 2, end).split(";");
      i = end;
      const styles: string[] = [];
      for (const code of codes) {
        if (code === "0" || code === "") {
          while (openSpans > 0) { html += "</span>"; openSpans--; }
        } else if (code === "1") {
          styles.push("font-weight:bold");
        } else if (code === "2") {
          styles.push("opacity:0.6");
        } else if (ANSI_TO_CSS[code]) {
          styles.push("color:" + ANSI_TO_CSS[code]);
        }
      }
      if (styles.length > 0) {
        html += `<span style="${styles.join(";")}">`;
        openSpans++;
      }
    } else if (text[i] === "<") {
      html += "&lt;";
    } else if (text[i] === ">") {
      html += "&gt;";
    } else if (text[i] === "&") {
      html += "&amp;";
    } else {
      html += text[i];
    }
  }
  while (openSpans > 0) { html += "</span>"; openSpans--; }
  return html;
}

function buildAppHtml(ansiContent: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#1a1a2e;color:#e0e0e0;font-family:'Cascadia Code','Fira Code',Consolas,monospace;font-size:14px;padding:16px;line-height:1.5}
pre{white-space:pre-wrap;word-wrap:break-word}
</style></head><body><pre>${ansiToHtml(ansiContent)}</pre></body></html>`;
}

// Latest tool output — resource handler reads this to generate HTML
let latestOutput = "";

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
  if (useMcpApps) {
    latestOutput = content;
  }
  return { content: [{ type: "text" as const, text: content }] };
}

const server = new McpServer({
  name: "compi",
  version: "0.3.0",
});

// MCP App resource — shared HTML template for all tools
const appUri = "ui://compi/display.html";
const APP_MIME = "text/html;profile=mcp-app";

if (useMcpApps) {
  server.registerResource(appUri, appUri, { mimeType: APP_MIME }, async () => ({
    contents: [{ uri: appUri, mimeType: APP_MIME, text: buildAppHtml(latestOutput) }],
  }));
}

// Tool metadata for MCP Apps — links each tool to the shared UI resource
const appMeta = useMcpApps
  ? { ui: { resourceUri: appUri }, "ui/resourceUri": appUri }
  : undefined;

// --- Tools ---
// Use registerTool (not server.tool) so we can pass _meta for MCP Apps

server.registerTool("scan", {
  description: "Show nearby creatures that can be caught",
  inputSchema: z.object({}),
  _meta: appMeta,
}, async () => {
  const { stateManager, engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const result = engine.scan();
  stateManager.save(engine.getState());
  return text(renderer.renderScan(result));
});

server.registerTool("catch", {
  description: "Attempt to catch a nearby creature",
  inputSchema: z.object({
    index: z.number().describe("1-indexed creature number from scan list"),
  }),
  _meta: appMeta,
}, async ({ index }: { index: number }) => {
  const { stateManager, engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const result = engine.catch(index - 1);
  stateManager.save(engine.getState());
  return text(renderer.renderCatch(result));
});

server.registerTool("collection", {
  description: "Browse caught creatures",
  inputSchema: z.object({}),
  _meta: appMeta,
}, async () => {
  const { engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  return text(renderer.renderCollection(engine.getState().collection));
});

server.registerTool("merge", {
  description: "Merge two creatures from your collection",
  inputSchema: z.object({
    targetId: z.string().describe("ID of the creature to keep (gains traits)"),
    foodId: z.string().describe("ID of the creature to sacrifice"),
    confirm: z.boolean().optional().describe("Set to true to execute the merge after previewing"),
  }),
  _meta: appMeta,
}, async ({ targetId, foodId, confirm }: { targetId: string; foodId: string; confirm?: boolean }) => {
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
});

server.registerTool("energy", {
  description: "Show current energy level",
  inputSchema: z.object({}),
  _meta: appMeta,
}, async () => {
  const { engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const state = engine.getState();
  return text(renderer.renderEnergy(state.energy, MAX_ENERGY));
});

server.registerTool("status", {
  description: "View player profile and game stats",
  inputSchema: z.object({}),
  _meta: appMeta,
}, async () => {
  const { engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const result = engine.status();
  return text(renderer.renderStatus(result));
});

server.registerTool("settings", {
  description: "View or change game settings",
  inputSchema: z.object({
    key: z.string().optional().describe("Setting key: 'notifications'"),
    value: z.string().optional().describe("New value for the setting"),
  }),
  _meta: appMeta,
}, async ({ key, value }: { key?: string; value?: string }) => {
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
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
