#!/usr/bin/env node
/**
 * Stdio MCP server for Cursor with interactive HTML UI.
 *
 * Uses HtmlAppRenderer for native HTML rendering (no ANSI-to-HTML conversion)
 * and a local HTTP sidecar for serving static assets (creature art images).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadEngine, registerTools } from "./mcp-tools";
import { HtmlAppRenderer } from "./renderers/html-app";
import { createSidecar, cleanupPortFile } from "./cursor-sidecar";

const APP_URI = "ui://compi/display.html";
const APP_MIME = "text/html;profile=mcp-app";

let latestOutput = "";
let outputVersion = 0;

function createOutputWaiter(): Promise<string> {
  const startVersion = outputVersion;
  return new Promise<string>((resolve) => {
    const deadline = Date.now() + 3000;
    const check = () => {
      if (outputVersion > startVersion) {
        resolve(latestOutput);
      } else if (Date.now() >= deadline) {
        resolve(latestOutput);
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
}

const server = new McpServer({
  name: "compi",
  version: "0.4.0",
});

server.registerResource(
  APP_URI,
  APP_URI,
  { mimeType: APP_MIME },
  async () => {
    const content = await createOutputWaiter();
    return {
      contents: [{ uri: APP_URI, mimeType: APP_MIME, text: content }],
    };
  }
);

const appMeta = {
  ui: { resourceUri: APP_URI },
  "ui/resourceUri": APP_URI,
};

async function main() {
  let sidecarPort: number | null = null;
  try {
    const sidecar = await createSidecar();
    sidecarPort = sidecar.port;
    process.on("exit", () => { cleanupPortFile(); sidecar.server.close(); });
    process.on("SIGTERM", () => process.exit(0));
    process.on("SIGINT", () => process.exit(0));
  } catch (err) {
    console.error("Sidecar failed:", err);
  }

  const renderer = new HtmlAppRenderer(sidecarPort);

  registerTools(server, {
    appMeta,
    renderer,
    onOutput: (content) => {
      latestOutput = content;
      outputVersion++;
    },
  });

  // Warm up
  try {
    const { engine } = loadEngine();
    const warmup = renderer.renderScan(engine.scan());
    latestOutput = warmup;
    outputVersion++;
  } catch {}

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
