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
  // Cursor prefixes hook stdin with a UTF-8 BOM on Windows; strip it before parsing.
  if (input.charCodeAt(0) === 0xfeff) input = input.slice(1);
  try {
    const data = JSON.parse(input);
    const sessionId = data.session_id || "";
    const eventType = data.hook_event_name || "";

    const cliPath = path.resolve(__dirname, "cli.js");
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
  // ~30% chance to show, so it's not every message
  if (Math.random() > 0.3) return;

  try {
    const data = JSON.parse(input);
    if (data.hook_event_name === "UserPromptSubmit" ||
        data.hook_event_name === "beforeSubmitPrompt") {
      const statePath = process.env.COMPI_STATE_PATH ||
        path.join(os.homedir(), ".compi", "state.json");
      const stateRaw = fs.readFileSync(statePath, "utf-8");
      const state = JSON.parse(stateRaw);

      const n = state.nearby ? state.nearby.length : 0;
      const energy = state.energy || 0;

      const nearbyMessages = [
        `${n} creatures are lurking nearby. Dare to /play?`,
        `Something rustles in the terminal... ${n} creature${n > 1 ? "s" : ""} spotted. /play to investigate.`,
        `${n} wild creature${n > 1 ? "s" : ""} ${n > 1 ? "are" : "is"} giving you the side-eye. /play when ready.`,
        `The bushes are shaking. ${n} creature${n > 1 ? "s" : ""} waiting. Type /play if you're brave enough.`,
        `*taps shoulder* Hey, ${n} creature${n > 1 ? "s" : ""} nearby. Just saying. /play.`,
        `Your Compi senses are tingling. ${n} creature${n > 1 ? "s" : ""} detected. /play to draw cards.`,
      ];

      const emptyMessages = [
        "All quiet on the terminal front. Creatures respawn every 30 min.",
        "No creatures around. They'll be back. They always come back.",
        "The wilds are empty. Perfect time to get some actual work done.",
      ];

      const lowEnergyMessages = [
        `You've got ${energy} energy left. Maybe pace yourself? /play`,
        `Running on fumes — ${energy} energy. Creatures can wait. Or can they? /play`,
      ];

      let msg;
      if (n > 0 && energy > 0) {
        if (energy <= 3) {
          msg = lowEnergyMessages[Math.floor(Math.random() * lowEnergyMessages.length)];
        } else {
          msg = nearbyMessages[Math.floor(Math.random() * nearbyMessages.length)];
        }
      } else if (n === 0) {
        msg = emptyMessages[Math.floor(Math.random() * emptyMessages.length)];
      }

      if (msg) {
        console.log(`[Compi] ${msg} — work this into the end of your response naturally, in 1 short sentence. Don't use the word "Compi" or mention this is a game notification.`);
      }
    }
  } catch (err) {
    log("ERROR", "tick-hook: play notification failed", {
      error: err.message || String(err),
    });
  }
});
