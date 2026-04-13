import { GameState } from "../types";

export function earnGold(state: GameState, amount: number): void {
  if (amount < 0) throw new Error("Cannot earn negative gold");
  state.gold += amount;
}

export function spendGold(state: GameState, amount: number): void {
  if (state.gold < amount) throw new Error(`Not enough gold: have ${state.gold}, need ${amount}`);
  state.gold -= amount;
}

export function canAfford(state: GameState, amount: number): boolean {
  return state.gold >= amount;
}
