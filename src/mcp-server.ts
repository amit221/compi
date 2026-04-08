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

// eslint-disable-next-line @typescript-eslint/no-var-requires
const extApps = require("@modelcontextprotocol/ext-apps/server") as {
  registerAppTool: (server: any, name: string, opts: any, handler: (...args: any[]) => any) => void;
  registerAppResource: (server: any, name: string, uri: string, opts: any, handler: () => any) => void;
  RESOURCE_MIME_TYPE: string;
};

const statePath =
  process.env.COMPI_STATE_PATH ||
  path.join(os.homedir(), ".compi", "state.json");

// COMPI_DISPLAY_FILE=1: Claude Code mode — write ANSI to temp file
const writeDisplayFile = process.env.COMPI_DISPLAY_FILE === "1";
const displayPath = path.join(os.tmpdir(), "compi_display.txt");

// When not in Claude Code, use MCP Apps for rich HTML rendering
const useMcpApps = !writeDisplayFile;

// Self-contained HTML template — receives ANSI text via postMessage, converts to colored HTML
const APP_HTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#1a1a2e;color:#e0e0e0;font-family:'Cascadia Code','Fira Code',Consolas,monospace;font-size:14px;padding:16px;line-height:1.5}
pre{white-space:pre-wrap;word-wrap:break-word}
</style></head><body><pre id="o">Loading...</pre><script>
var C={'30':'#1a1a2e','31':'#ff1744','32':'#00e676','33':'#ffea00','34':'#448aff','35':'#d500f9','36':'#00e5ff','37':'#e0e0e0','90':'#9e9e9e','91':'#ff1744','92':'#00e676','93':'#ffea00','94':'#448aff','95':'#d500f9','96':'#00e5ff','97':'#ffffff'};
function a2h(t){var h='',o=0,i=0;while(i<t.length){if(t[i]==='\\x1b'&&t[i+1]==='['){var e=t.indexOf('m',i+2);if(e===-1){h+=t[i];i++;continue}var c=t.slice(i+2,e).split(';');i=e+1;var s=[];for(var j=0;j<c.length;j++){if(c[j]==='0'||c[j]===''){while(o>0){h+='</span>';o--}}else if(c[j]==='1')s.push('font-weight:bold');else if(c[j]==='2')s.push('opacity:0.6');else if(C[c[j]])s.push('color:'+C[c[j]])}if(s.length>0){h+='<span style="'+s.join(';')+'">';o++}}else if(t[i]==='<'){h+='&lt;';i++}else if(t[i]==='>'){h+='&gt;';i++}else if(t[i]==='&'){h+='&amp;';i++}else{h+=t[i];i++}}while(o>0){h+='</span>';o--}return h}
window.addEventListener('message',function(e){var m=e.data;if(!m||!m.jsonrpc)return;if(m.method==='ui/initialize'){window.parent.postMessage({jsonrpc:'2.0',id:m.id,result:{protocolVersion:'2026-06-17',capabilities:{}}},e.origin);return}if(m.method==='ui/toolResult'){var c=m.params&&m.params.result&&m.params.result.content;if(c){for(var i=0;i<c.length;i++){if(c[i].type==='text'){document.getElementById('o').innerHTML=a2h(c[i].text);break}}}if(m.id)window.parent.postMessage({jsonrpc:'2.0',id:m.id,result:{}},e.origin);return}if(m.id)window.parent.postMessage({jsonrpc:'2.0',id:m.id,result:{}},e.origin)});
</script></body></html>`;

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

// --- Register MCP App resource (shared by all tools) ---
const appUri = "ui://compi/display.html";

if (useMcpApps) {
  extApps.registerAppResource(
    server,
    appUri,
    appUri,
    { mimeType: extApps.RESOURCE_MIME_TYPE },
    async () => ({
      contents: [{ uri: appUri, mimeType: extApps.RESOURCE_MIME_TYPE, text: APP_HTML }],
    })
  );
}

// --- Helper to register tool for both modes ---
type ToolHandler = (args: any) => { content: Array<{ type: "text"; text: string }> };

function tool(name: string, description: string, schema: Record<string, z.ZodType>, handler: ToolHandler) {
  if (useMcpApps) {
    // MCP Apps mode: tool includes UI metadata, host renders HTML
    extApps.registerAppTool(
      server,
      name,
      {
        title: name.charAt(0).toUpperCase() + name.slice(1),
        description,
        inputSchema: schemaToJsonSchema(schema),
        _meta: { ui: { resourceUri: appUri } },
      },
      async (args: any) => handler(args.arguments || args)
    );
  } else {
    // Claude Code mode: regular tool registration
    if (Object.keys(schema).length > 0) {
      server.tool(name, description, schema, (args: any) => handler(args));
    } else {
      server.tool(name, description, {}, () => handler({}));
    }
  }
}

function schemaToJsonSchema(schema: Record<string, z.ZodType>): object {
  if (Object.keys(schema).length === 0) {
    return { type: "object", properties: {}, additionalProperties: false };
  }
  const properties: Record<string, any> = {};
  const required: string[] = [];
  for (const [key, val] of Object.entries(schema)) {
    const desc = (val as any)._def?.description || "";
    if (val instanceof z.ZodNumber) {
      properties[key] = { type: "number", description: desc };
      required.push(key);
    } else if (val instanceof z.ZodOptional) {
      const inner = (val as any)._def?.innerType;
      if (inner instanceof z.ZodBoolean) {
        properties[key] = { type: "boolean", description: desc };
      } else {
        properties[key] = { type: "string", description: desc };
      }
    } else {
      properties[key] = { type: "string", description: desc };
      required.push(key);
    }
  }
  return { type: "object", properties, required: required.length > 0 ? required : undefined };
}

// --- Tools ---

tool("scan", "Show nearby creatures that can be caught", {}, () => {
  const { stateManager, engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const result = engine.scan();
  stateManager.save(engine.getState());
  return text(renderer.renderScan(result));
});

tool(
  "catch",
  "Attempt to catch a nearby creature",
  { index: z.number().describe("1-indexed creature number from scan list") },
  ({ index }: { index: number }) => {
    const { stateManager, engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    const result = engine.catch(index - 1);
    stateManager.save(engine.getState());
    return text(renderer.renderCatch(result));
  }
);

tool("collection", "Browse caught creatures", {}, () => {
  const { engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  return text(renderer.renderCollection(engine.getState().collection));
});

tool(
  "merge",
  "Merge two creatures from your collection",
  {
    targetId: z.string().describe("ID of the creature to keep (gains traits)"),
    foodId: z.string().describe("ID of the creature to sacrifice"),
    confirm: z.boolean().optional().describe("Set to true to execute the merge after previewing"),
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

tool("energy", "Show current energy level", {}, () => {
  const { engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const state = engine.getState();
  return text(renderer.renderEnergy(state.energy, MAX_ENERGY));
});

tool("status", "View player profile and game stats", {}, () => {
  const { engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const result = engine.status();
  return text(renderer.renderStatus(result));
});

tool(
  "settings",
  "View or change game settings",
  {
    key: z.string().optional().describe("Setting key: 'notifications'"),
    value: z.string().optional().describe("New value for the setting"),
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
