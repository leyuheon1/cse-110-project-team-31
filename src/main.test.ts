// Layout note: mock ConfigManager and GameManager first, set up a fake DOM container, then import main.ts to let its init run and assert the mocked collaborators were used.
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"; // vitest utilities

// Spies stored outside to assert after import.
const loadConfigSpy = vi.fn().mockResolvedValue(undefined); // tracks config loading calls
const gameManagerSpy = vi.fn(); // tracks GameManager construction

// Mock ConfigManager module before importing main.
vi.mock("./config", () => ({
  ConfigManager: {
    getInstance: () => ({
      loadConfig: loadConfigSpy, // return spy so we can assert the init sequence
    }),
  },
}));

// Mock GameManager to prevent real game setup while counting invocations.
vi.mock("./GameManager", () => {
  class FakeGameManager {
    constructor(container: HTMLElement) {
      gameManagerSpy(container); // forward the container argument into a spy
    }
  }
  return { GameManager: FakeGameManager };
});

describe("main.ts bootstrap", () => {
  beforeEach(() => {
    loadConfigSpy.mockReset(); // clear call counts between tests
    gameManagerSpy.mockReset(); // clear constructor spy
    document.body.innerHTML = '<div id="game-container"></div>'; // provide expected container element
  });

  it("loads config then creates GameManager with the DOM container", async () => {
    await import("./main"); // importing triggers init immediately
    await Promise.resolve(); // let async loadConfig resolve
    expect(loadConfigSpy).toHaveBeenCalledTimes(1); // verify config load happened
    const container = document.getElementById("game-container"); // fetch the DOM node used
    expect(gameManagerSpy).toHaveBeenCalledWith(container); // GameManager receives the container
  });
});
