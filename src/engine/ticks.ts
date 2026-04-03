import { GameState, Tick, TimeOfDay } from "../types";
import { TICK_PRUNE_COUNT } from "../config/constants";

export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export function deriveStreak(
  lastActiveDate: string,
  todayDate: string,
  currentStreak: number
): number {
  if (lastActiveDate === todayDate) {
    return Math.max(currentStreak, 1);
  }

  const last = new Date(lastActiveDate + "T00:00:00");
  const today = new Date(todayDate + "T00:00:00");
  const diffDays = Math.floor(
    (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 1) {
    return currentStreak + 1;
  }
  return 1;
}

export function processNewTick(state: GameState, tick: Tick): void {
  state.profile.totalTicks++;

  state.recentTicks.push(tick);
  if (state.recentTicks.length > TICK_PRUNE_COUNT) {
    state.recentTicks = state.recentTicks.slice(-TICK_PRUNE_COUNT);
  }

  const tickDate = new Date(tick.timestamp);
  const todayStr = tickDate.toISOString().split("T")[0];

  state.profile.currentStreak = deriveStreak(
    state.profile.lastActiveDate,
    todayStr,
    state.profile.currentStreak
  );
  state.profile.longestStreak = Math.max(
    state.profile.longestStreak,
    state.profile.currentStreak
  );
  state.profile.lastActiveDate = todayStr;
}
