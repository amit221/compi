#!/usr/bin/env node
/**
 * HTTP MCP server for Cursor -- supports MCP Apps (HTML iframes).
 * Cursor connects via URL: http://localhost:3456/mcp
 *
 * Usage: node dist/mcp-http-server.js
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import cors from "cors";
import { registerTools } from "./mcp-tools";
import { ansiToHtml } from "./renderers/ansi-to-html";

const PORT = parseInt(process.env.COMPI_PORT || "3456", 10);

const appUri = "ui://compi/display.html";
const APP_MIME = "text/html;profile=mcp-app";
let latestOutput = "";
let outputVersion = 0;
let waitForOutput: ((version: number) => Promise<string>) | null = null;

// Creates a promise that resolves when latestOutput is updated
function createOutputWaiter() {
  let currentVersion = outputVersion;
  return new Promise<string>((resolve) => {
    // If already updated since we started waiting, resolve immediately
    const check = () => {
      if (outputVersion > currentVersion) {
        resolve(latestOutput);
      } else {
        setTimeout(check, 50);
      }
    };
    // Wait up to 3 seconds, then return whatever we have
    setTimeout(() => resolve(latestOutput), 3000);
    check();
  });
}

function buildHtml(ansiContent: string): string {
  const body = ansiContent ? ansiToHtml(ansiContent) : "";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#000;color:#e0e0e0;font-family:'Cascadia Code','Fira Code',Consolas,monospace;font-size:14px;padding:16px;line-height:1.5}
pre{white-space:pre-wrap;word-wrap:break-word}
</style></head><body><pre>${body}</pre></body></html>`;
}

function createServer(): McpServer {
  const server = new McpServer({
    name: "compi",
    version: "0.3.0",
  });

  server.registerResource(appUri, appUri, { mimeType: APP_MIME }, async () => {
    // Wait for the tool to finish and set latestOutput
    const content = await createOutputWaiter();
    return { contents: [{ uri: appUri, mimeType: APP_MIME, text: buildHtml(content) }] };
  });

  const appMeta = { ui: { resourceUri: appUri }, "ui/resourceUri": appUri };

  registerTools(server, {
    appMeta,
    onOutput: (content) => { latestOutput = content; outputVersion++; },
    renderHtml: buildHtml,
  });

  return server;
}

// Warm up latestOutput so first iframe render has data
import { loadEngine } from "./mcp-tools";
(() => {
  const { engine } = loadEngine();
  const renderer = new (require("./renderers/simple-text").SimpleTextRenderer)();
  const result = engine.scan();
  latestOutput = renderer.renderScan(result);
})();

// --- HTTP transport ---

const app = express();
app.use(cors());
app.use(express.json());

// API endpoint for the MCP App iframe to fetch latest output
app.get("/api/latest-output", (_req: express.Request, res: express.Response) => {
  res.json({ text: latestOutput });
});

app.all("/mcp", async (req: express.Request, res: express.Response) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on("close", () => {
    transport.close().catch(() => {});
    server.close().catch(() => {});
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Compi MCP server listening on http://localhost:${PORT}/mcp`);
});
