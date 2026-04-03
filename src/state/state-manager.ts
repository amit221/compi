import * as fs from "fs";
import * as path from "path";
import { GameState } from "../types";

function defaultState(): GameState {
  const today = new Date().toISOString().split("T")[0];
  return {
    version: 1,
    profile: {
      level: 1,
      xp: 0,
      totalCatches: 0,
      totalTicks: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: today,
    },
    collection: [],
    inventory: { bytetrap: 5 },
    nearby: [],
    recentTicks: [],
    claimedMilestones: [],
    settings: {
      renderer: "simple",
      notificationLevel: "moderate",
    },
  };
}

export class StateManager {
  constructor(private filePath: string) {}

  load(): GameState {
    try {
      const data = fs.readFileSync(this.filePath, "utf-8");
      return JSON.parse(data) as GameState;
    } catch {
      return defaultState();
    }
  }

  save(state: GameState): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = this.filePath + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf-8");
    fs.renameSync(tmp, this.filePath);
  }
}
