import * as fs from "fs";
import * as path from "path";
import { BalanceConfig, MilestoneCondition } from "../types";

let cached: BalanceConfig | null = null;

export function loadConfig(): BalanceConfig {
  if (cached) return cached;

  const configPath = path.resolve(__dirname, "../../config/balance.json");
  const raw = fs.readFileSync(configPath, "utf-8");
  cached = JSON.parse(raw) as BalanceConfig;
  return cached;
}

export function formatMessage(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return key in vars ? String(vars[key]) : match;
  });
}

export function buildMilestoneCondition(
  condition: MilestoneCondition
): (profile: { totalCatches: number; currentStreak: number; totalTicks: number }) => boolean {
  return (profile) => {
    const value = profile[condition.type];
    return value >= condition.threshold;
  };
}
