import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import * as http from "http";

// Set up test state BEFORE importing sidecar
const testStatePath = path.join(os.tmpdir(), `compi-sidecar-test-${Date.now()}.json`);
process.env.COMPI_STATE_PATH = testStatePath;

import { createSidecar } from "../../src/cursor-sidecar";
import { GameState } from "../../src/types";

function seedState(): void {
  const state: GameState = {
    version: 7,
    profile: {
      level: 1,
      xp: 0,
      totalCatches: 0,
      totalMerges: 0,
      totalTicks: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: "2026-01-01",
    },
    collection: [],
    energy: 20,
    lastEnergyGainAt: Date.now(),
    nearby: [
      {
        id: "test-creature-1",
        speciesId: "compi",
        name: "TestCompi",
        slots: [
          { slotId: "eyes", variantId: "eye_c01", color: "grey", rarity: 0 },
          { slotId: "mouth", variantId: "mth_c01", color: "grey", rarity: 0 },
          { slotId: "body", variantId: "bod_c01", color: "grey", rarity: 0 },
          { slotId: "tail", variantId: "tal_c01", color: "grey", rarity: 0 },
        ],
        spawnedAt: Date.now(),
      },
    ],
    batch: {
      attemptsRemaining: 5,
      failPenalty: 0,
      spawnedAt: Date.now(),
    },
    lastSpawnAt: Date.now(),
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
    discoveredSpecies: [],
    currentSessionId: "",
    speciesProgress: {},
    personalSpecies: [],
    sessionBreedCount: 0,
    breedCooldowns: {},
  };

  const dir = path.dirname(testStatePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(testStatePath, JSON.stringify(state, null, 2), "utf-8");
}

function fetch(urlStr: string): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    http.get(urlStr, (res) => {
      let body = "";
      res.on("data", (chunk: Buffer) => { body += chunk.toString(); });
      res.on("end", () => resolve({ statusCode: res.statusCode ?? 0, body }));
      res.on("error", reject);
    }).on("error", reject);
  });
}

let server: http.Server;
let port: number;

beforeAll(async () => {
  seedState();
  const result = await createSidecar();
  server = result.server;
  port = result.port;
});

afterAll((done) => {
  server.close(() => {
    try { fs.unlinkSync(testStatePath); } catch { /* ignore */ }
    done();
  });
});

describe("cursor-sidecar", () => {
  test("GET /health returns 200", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe("OK");
  });

  test("GET /action?choice=s returns HTML with game content", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/action?choice=s`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("<html");
  });

  test("GET /action with invalid choice returns 400", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/action?choice=x`);
    expect(res.statusCode).toBe(400);
  });

  test("GET /unknown returns 404", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/unknown`);
    expect(res.statusCode).toBe(404);
  });
});
