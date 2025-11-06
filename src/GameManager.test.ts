/** @vitest-environment jsdom */

import { describe, it, expect, vi } from 'vitest';
import { GameManager } from './GameManager';

// --- Mocks ---
// This block is now fixed.
// We use regular "function()" instead of "() =>"
// for Stage and Layer so they can be "new"-ed.
vi.mock('konva', () => ({
  default: {
    Stage: vi.fn(function() { // <--- FIXED
      return {
        add: vi.fn(),
        width: vi.fn(() => 1920),
        height: vi.fn(() => 1080),
      };
    }),
    Layer: vi.fn(function() { // <--- FIXED
      return {
        add: vi.fn(),
        destroyChildren: vi.fn(),
      };
    }),
    Image: vi.fn(),
  }
}));

vi.mock('./config', () => ({
  ConfigManager: {
    getInstance: vi.fn(() => ({
      getConfig: vi.fn(() => ({
        startingFunds: 250,
        maxBreadCapacity: 20,
        winThreshold: 2000,
      })),
      loadConfig: vi.fn(() => Promise.resolve()),
    })),
  },
}));
// --- End Mocks ---


describe('GameManager Test', () => {

  it('should correctly calculate the cost of one cookie', () => {
    // Create a mock HTML element
    const container = document.createElement('div');
    const gameManager = new GameManager(container);
    
    // Access the private method for testing
    const cost = (gameManager as any).getCostOfOneCookie();

    
    // Flour: 3 * 0.5 = 1.5
    // Sugar: 1 * 0.75 = 0.75
    // Butter: 8 * 0.25 = 2.0
    // Chocolate: 1 * 3 = 3.0
    // Baking Soda: 2 * 0.5 = 1.0
    // Total: 1.5 + 0.75 + 2.0 + 3.0 + 1.0 = 8.25
    expect(cost).toBe(8.25);
  });

});