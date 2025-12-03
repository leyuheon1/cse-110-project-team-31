// Layout note: import the enum and interfaces module, assert enum ordering/names, and exercise a couple of typed objects so every export has a story I can recount.
import { describe, it, expect } from "vitest"; // vitest helpers
import { GamePhase, type PlayerState, type GameConfig, type MinigameResult } from "./types"; // imports under test

describe("types module", () => {
  it("exposes GamePhase enum with stable ordering", () => {
    expect(GamePhase.LOGIN).toBe(0); // first entry should be zero
    expect(GamePhase.VICTORY).toBeGreaterThan(GamePhase.LOGIN); // later phases increment
    expect(GamePhase[GamePhase.CLEANING]).toBe("CLEANING"); // reverse mapping works for runtime checks
  });

  it("allows constructing typed records for player, config, and results", () => {
    const player: PlayerState = {
      username: "Tester", // username value for state tracking
      funds: 100, // starting funds sample
      ingredients: new Map(), // inventory map
      breadInventory: [], // bread list sample
      maxBreadCapacity: 10, // capacity bound
      currentDay: 1, // day marker
      dishesToClean: 0, // chores count
      reputation: 1, // reputation score
      currentDayDemand: 0, // demand placeholder
    };

    const config: GameConfig = {
      startingFunds: 100, // budget baseline
      winThreshold: 200, // win condition
      bankruptcyThreshold: -50, // loss threshold
      flourPriceMin: 1, // config entry example
      flourPriceMax: 2, // price ceiling
      bakingTime: 10, // timers example
      cleaningTime: 5, // cleaning duration
      maxBreadCapacity: 10, // capacity in config
      divisionProblems: 3, // math count
      multiplicationProblems: 2, // math count
      cookiePrice: 5, // cookie price
    };

    const result: MinigameResult = {
      correctAnswers: 3, // successes
      totalProblems: 4, // attempts
      timeRemaining: 10, // leftover time
    };

    expect(player.username).toBe("Tester"); // assert data stuck
    expect(config.winThreshold).toBe(200); // confirm config data shape
    expect(result.totalProblems).toBe(4); // confirm result shape
  });
});
