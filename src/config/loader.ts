import balanceData from "../../config/balance.json";
import { BalanceConfig, MilestoneCondition } from "../types";

export function loadConfig(): BalanceConfig {
  return balanceData as unknown as BalanceConfig;
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
