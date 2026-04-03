#!/usr/bin/env node
// scripts/tick-hook.js
//
// Claude Code hook script. Receives JSON on stdin, records a game tick.
// Configured to fire on: PostToolUse, UserPromptSubmit, Stop, SessionStart

const { execFileSync } = require("child_process");
const path = require("path");

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
  } catch {
    // Silent failure — never interrupt the user's workflow
  }

  // Output notification context for Claude
  try {
    const data = JSON.parse(input);
    if (data.hook_event_name === "PostToolUse" || data.hook_event_name === "Stop") {
      const cliPath = path.resolve(__dirname, "..", "dist", "cli.js");
      const result = execFileSync("node", [cliPath, "scan", "--json"], {
        timeout: 5000,
        encoding: "utf-8",
      });
      const scan = JSON.parse(result);
      if (scan.nearby && scan.nearby.length > 0) {
        const notification = {
          additionalContext: `[Termomon] ${scan.nearby.length} creature(s) nearby. The user can run /scan to see them.`,
        };
        process.stdout.write(JSON.stringify(notification));
      }
    }
  } catch {
    // Silent failure
  }
});
