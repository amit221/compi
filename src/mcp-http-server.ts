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

function buildHtml(ansiContent: string): string {
  const body = ansiContent ? ansiToHtml(ansiContent) : "";
  // If empty, auto-reload after 500ms (resource fetched before tool finished)
  const reloadScript = !ansiContent
    ? `<script>setTimeout(function(){window.location.reload()},500)</script>`
    : "";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#000;color:#e0e0e0;font-family:'Cascadia Code','Fira Code',Consolas,monospace;font-size:14px;padding:16px;line-height:1.5}
pre{white-space:pre-wrap;word-wrap:break-word}
</style></head><body><pre>${body}</pre>${reloadScript}</body></html>`;
}

function createServer(): McpServer {
  const server = new McpServer({
    name: "compi",
    version: "0.3.0",
  });

  // MCP App resource — pre-rendered HTML, auto-reloads if empty
  server.registerResource(appUri, appUri, { mimeType: APP_MIME }, async () => ({
    contents: [{ uri: appUri, mimeType: APP_MIME, text: buildHtml(latestOutput) }],
  }));

  const appMeta = { ui: { resourceUri: appUri }, "ui/resourceUri": appUri };

  registerTools(server, {
    appMeta: {
      ...appMeta,
      ui: { ...appMeta.ui, csp: { connectDomains: [`http://localhost:${PORT}`] } },
    },
    onOutput: (content) => { latestOutput = content; },
  });

  return server;
}

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
