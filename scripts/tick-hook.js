#!/usr/bin/env node
// scripts/tick-hook.js
//
// Claude Code hook script. Receives JSON on stdin, records a game tick.
// Fires on: PostToolUse, Stop, SessionStart (Claude Code via hooks/hooks.json)
//           afterFileEdit, stop, sessionStart (Cursor via hooks/cursor-hooks.json)
// UserPromptSubmit must be registered in settings.json (plugin bug workaround)

const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const LOG_DIR = process.env.COMPI_LOG_PATH || path.join(os.homedir(), ".compi");
const LOG_FILE = path.join(LOG_DIR, "compi.log");
const MAX_LOG_SIZE = 5 * 1024 * 1024;

function log(level, message, extra) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    try {
      const stat = fs.statSync(LOG_FILE);
      if (stat.size >= MAX_LOG_SIZE) {
        fs.renameSync(LOG_FILE, LOG_FILE + ".old");
      }
    } catch {}
    const ts = new Date().toISOString();
    let line = `[${ts}] ${level} ${message}`;
    if (extra) line += " " + JSON.stringify(extra);
    line += "\n";
    fs.appendFileSync(LOG_FILE, line, "utf-8");
  } catch {}
}

let input = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input);
    const sessionId = data.session_id || "";
    const eventType = data.hook_event_name || "";

    const cliPath = path.resolve(__dirname, "..", "dist", "cli.js");
    const args = ["tick", `--session=${sessionId}`, `--event=${eventType}`, "--json"];

    execFileSync("node", [cliPath, ...args], {
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (err) {
    log("ERROR", "tick-hook: tick command failed", {
      error: err.message || String(err),
    });
  }

  // Output notification context for Claude (only works on UserPromptSubmit)
  // Must use plain text stdout, not JSON (Claude Code bug workaround)
  try {
    const data = JSON.parse(input);
    if (data.hook_event_name === "UserPromptSubmit" ||
        data.hook_event_name === "beforeSubmitPrompt") {
      const cliPath = path.resolve(__dirname, "..", "dist", "cli.js");
      const result = execFileSync("node", [cliPath, "scan", "--json"], {
        timeout: 5000,
        encoding: "utf-8",
      });
      const scan = JSON.parse(result);
      if (scan.nearby && scan.nearby.length > 0) {
        console.log(`[Compi] ${scan.nearby.length} creature(s) nearby — briefly mention this to the user at the end of your response and suggest they run /scan.`);
      }
    }
  } catch (err) {
    log("ERROR", "tick-hook: scan notification failed", {
      error: err.message || String(err),
    });
  }
});
