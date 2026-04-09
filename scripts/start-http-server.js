#!/usr/bin/env node
/**
 * Starts the Compi HTTP MCP server if not already running.
 * Called from Cursor sessionStart hook.
 */
const { execFile } = require("child_process");
const http = require("http");
const path = require("path");

const PORT = process.env.COMPI_PORT || 3456;

// Check if server is already running
const req = http.request({ hostname: "127.0.0.1", port: PORT, path: "/api/latest-output", method: "GET", timeout: 1000 }, (res) => {
  // Server already running
  res.resume();
});

req.on("error", () => {
  // Server not running — start it
  const serverPath = path.resolve(__dirname, "..", "dist", "mcp-http-server.js");
  const child = execFile("node", [serverPath], {
    detached: true,
    stdio: "ignore",
    env: { ...process.env, COMPI_PORT: String(PORT) },
  });
  child.unref();
});

req.end();
