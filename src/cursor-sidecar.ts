/**
 * cursor-sidecar.ts — Lightweight HTTP server for Cursor MCP App iframe interactivity.
 *
 * The iframe renders clickable cards that fetch() back to this sidecar
 * to execute game actions (catch, breed, skip) without typing in chat.
 */

import * as http from "http";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { StateManager } from "./state/state-manager";
import { GameEngine } from "./engine/game-engine";
import { HtmlAppRenderer } from "./renderers/html-app";
import { drawCards, playCard, skipHand } from "./engine/cards";
import { MAX_ENERGY } from "./engine/energy";
import { registerPersonalSpecies } from "./config/species";

const PORT_FILE = path.join(os.homedir(), ".compi", "cursor-port");

/** Start the sidecar HTTP server. Returns server + port. */
export function createSidecar(): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // CORS headers on every response
      res.setHeader("Access-Control-Allow-Origin", "*");

      const reqUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      const pathname = reqUrl.pathname;

      if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "*");
        res.writeHead(204);
        res.end();
        return;
      }

      if (pathname === "/health") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("OK");
        return;
      }

      if (pathname === "/action") {
        handleAction(reqUrl.searchParams, res, server);
        return;
      }

      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("Failed to get server address"));
        return;
      }
      const port = addr.port;

      // Write port file
      try {
        const dir = path.dirname(PORT_FILE);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(PORT_FILE, String(port), "utf-8");
      } catch {
        // Non-fatal — sidecar still works, just not discoverable
      }

      resolve({ server, port });
    });

    server.on("error", reject);
  });
}

function handleAction(
  params: URLSearchParams,
  res: http.ServerResponse,
  server: http.Server,
): void {
  try {
    const choice = (params.get("choice") ?? "").toLowerCase();
    if (!["a", "b", "c", "s"].includes(choice)) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Bad Request: choice must be a, b, c, or s");
      return;
    }

    const statePath =
      process.env.COMPI_STATE_PATH ??
      path.join(os.homedir(), ".compi", "state.json");

    const sm = new StateManager(statePath);
    const state = sm.load();

    // Process a tick so energy regen / spawns happen
    const engine = new GameEngine(state);
    engine.processTick({ timestamp: Date.now() }, Math.random);

    // Register personal species so hybrid art renders
    registerPersonalSpecies(state.personalSpecies);

    const addr = server.address();
    const sidecarPort = addr && typeof addr !== "string" ? addr.port : null;
    const renderer = new HtmlAppRenderer(sidecarPort);

    let html: string;

    if (choice === "s") {
      const draw = drawCards(state, Math.random);
      html = renderer.renderCardDraw(draw, state.energy, MAX_ENERGY, state.profile);
    } else if (
      choice === "b" &&
      state.currentHand &&
      state.currentHand.length === 1 &&
      state.currentHand[0].type === "breed"
    ) {
      // "b" on a breed card means pass/skip
      const draw = skipHand(state, Math.random);
      html = renderer.renderCardDraw(draw, state.energy, MAX_ENERGY, state.profile);
    } else {
      const choiceIndex = choice.charCodeAt(0) - "a".charCodeAt(0);
      const result = playCard(state, choiceIndex, Math.random);
      html = renderer.renderPlayResult(result, state.energy, MAX_ENERGY, state.profile);
    }

    sm.save(state);

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end(`Internal Server Error: ${msg}`);
  }
}

/** Read the sidecar port from ~/.compi/cursor-port, or null if not running */
export function readSidecarPort(): number | null {
  try {
    const raw = fs.readFileSync(PORT_FILE, "utf-8").trim();
    const port = parseInt(raw, 10);
    return Number.isFinite(port) && port > 0 ? port : null;
  } catch {
    return null;
  }
}

/** Delete the port file */
export function cleanupPortFile(): void {
  try {
    fs.unlinkSync(PORT_FILE);
  } catch {
    // ignore — file may not exist
  }
}
