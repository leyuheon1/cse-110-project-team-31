// src/config.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigManager } from './config';

describe('ConfigManager', () => {
  
  beforeEach(() => {
    // Reset the singleton instance before each test
    // This uses a TypeScript hack to access private static property
    (ConfigManager as any).instance = undefined;
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = ConfigManager.getInstance();
      const instance2 = ConfigManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Default Configuration', () => {
    it('should have correct default startingFunds', () => {
      const configManager = ConfigManager.getInstance();
      const config = configManager.getConfig();
      
      expect(config.startingFunds).toBe(500);
    });

    it('should have all default values set correctly', () => {
      const configManager = ConfigManager.getInstance();
      const config = configManager.getConfig();
      
      expect(config.startingFunds).toBe(500);
      expect(config.winThreshold).toBe(1000);
      expect(config.bankruptcyThreshold).toBe(0);
      expect(config.flourPriceMin).toBe(5);
      expect(config.flourPriceMax).toBe(15);
      expect(config.bakingTime).toBe(60);
      expect(config.cleaningTime).toBe(45);
      expect(config.maxBreadCapacity).toBe(20);
      expect(config.divisionProblems).toBe(10);
      expect(config.multiplicationProblems).toBe(8);
      expect(config.cookiePrice).toBe(20);
    });

    it('should return a copy of config, not the original', () => {
      const configManager = ConfigManager.getInstance();
      const config1 = configManager.getConfig();
      const config2 = configManager.getConfig();
      
      // They should have the same values
      expect(config1).toEqual(config2);
      
      // But should be different objects (spread operator creates copy)
      expect(config1).not.toBe(config2);
      
      // Modifying one should not affect the other
      config1.startingFunds = 999;
      expect(config2.startingFunds).toBe(500);
    });
  });

  describe('loadConfig - Successful Loading', () => {
    it('should load and parse config from file successfully', async () => {
      const mockConfigText = `
# This is a comment
STARTING_FUNDS=500
WIN_THRESHOLD=3000
BANKRUPTCY_THRESHOLD=-100
FLOUR_PRICE_MIN=8
FLOUR_PRICE_MAX=20
BAKING_TIME=90
CLEANING_TIME=60
MAX_BREAD_CAPACITY=30
DIVISION_PROBLEMS=15
MULTIPLICATION_PROBLEMS=12
COOKIE_PRICE=25
`;

      global.fetch = vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(mockConfigText)
      });

      const configManager = ConfigManager.getInstance();
      await configManager.loadConfig();
      
      const config = configManager.getConfig();
      
      expect(config.startingFunds).toBe(500);
      expect(config.winThreshold).toBe(3000);
      expect(config.bankruptcyThreshold).toBe(-100);
      expect(config.flourPriceMin).toBe(8);
      expect(config.flourPriceMax).toBe(20);
      expect(config.bakingTime).toBe(90);
      expect(config.cleaningTime).toBe(60);
      expect(config.maxBreadCapacity).toBe(30);
      expect(config.divisionProblems).toBe(15);
      expect(config.multiplicationProblems).toBe(12);
      expect(config.cookiePrice).toBe(25);
    });

    it('should handle config with only some values', async () => {
      const mockConfigText = `
STARTING_FUNDS=1000
BAKING_TIME=120
`;

      global.fetch = vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(mockConfigText)
      });

      const configManager = ConfigManager.getInstance();
      await configManager.loadConfig();
      
      const config = configManager.getConfig();
      
      expect(config.startingFunds).toBe(1000);
      expect(config.bakingTime).toBe(120);
      // Other values should remain at defaults
      expect(config.winThreshold).toBe(1000);
      expect(config.cleaningTime).toBe(45);
    });

    it('should handle empty lines and comments', async () => {
      const mockConfigText = `
# Comment line
STARTING_FUNDS=300

# Another comment
   
BAKING_TIME=75
  # Indented comment
`;

      global.fetch = vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(mockConfigText)
      });

      const configManager = ConfigManager.getInstance();
      await configManager.loadConfig();
      
      const config = configManager.getConfig();
      
      expect(config.startingFunds).toBe(300);
      expect(config.bakingTime).toBe(75);
    });

    it('should handle whitespace around keys and values', async () => {
      const mockConfigText = `
  STARTING_FUNDS  =  400  
BAKING_TIME=   80   
`;

      global.fetch = vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(mockConfigText)
      });

      const configManager = ConfigManager.getInstance();
      await configManager.loadConfig();
      
      const config = configManager.getConfig();
      
      expect(config.startingFunds).toBe(400);
      expect(config.bakingTime).toBe(80);
    });

    it('should handle decimal values', async () => {
      const mockConfigText = `
FLOUR_PRICE_MIN=7.5
FLOUR_PRICE_MAX=18.75
`;

      global.fetch = vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(mockConfigText)
      });

      const configManager = ConfigManager.getInstance();
      await configManager.loadConfig();
      
      const config = configManager.getConfig();
      
      expect(config.flourPriceMin).toBe(7.5);
      expect(config.flourPriceMax).toBe(18.75);
    });
  });

  describe('loadConfig - Error Handling', () => {
    it('should use default values if fetch fails', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      global.fetch = vi.fn().mockRejectedValue(new Error('File not found'));

      const configManager = ConfigManager.getInstance();
      await configManager.loadConfig();
      
      const config = configManager.getConfig();
      
      // Should still have default values
      expect(config.startingFunds).toBe(500);
      expect(config.winThreshold).toBe(1000);
      
      // Should have logged a warning
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Could not load config file, using defaults:',
        expect.any(Error)
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should log config when successfully loaded', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const mockConfigText = 'STARTING_FUNDS=500';
      
      global.fetch = vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(mockConfigText)
      });

      const configManager = ConfigManager.getInstance();
      await configManager.loadConfig();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Config loaded:',
        expect.objectContaining({ startingFunds: 500 })
      );
      
      consoleLogSpy.mockRestore();
    });
  });

  describe('parseConfig Edge Cases', () => {
    it('should ignore lines without equals sign', async () => {
      const mockConfigText = `
STARTING_FUNDS=500
INVALID_LINE_NO_EQUALS
BAKING_TIME=90
`;

      global.fetch = vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(mockConfigText)
      });

      const configManager = ConfigManager.getInstance();
      await configManager.loadConfig();
      
      const config = configManager.getConfig();
      
      expect(config.startingFunds).toBe(500);
      expect(config.bakingTime).toBe(90);
    });

    it('should ignore lines with empty key or value', async () => {
      const mockConfigText = `
STARTING_FUNDS=500
=300
EMPTY_VALUE=
BAKING_TIME=90
`;

      global.fetch = vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(mockConfigText)
      });

      const configManager = ConfigManager.getInstance();
      await configManager.loadConfig();
      
      const config = configManager.getConfig();
      
      expect(config.startingFunds).toBe(500);
      expect(config.bakingTime).toBe(90);
    });

    it('should handle unknown config keys gracefully', async () => {
      const mockConfigText = `
STARTING_FUNDS=500
UNKNOWN_KEY=999
INVALID_CONFIG=abc
BAKING_TIME=90
`;

      global.fetch = vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(mockConfigText)
      });

      const configManager = ConfigManager.getInstance();
      await configManager.loadConfig();
      
      const config = configManager.getConfig();
      
      // Known keys should be set
      expect(config.startingFunds).toBe(500);
      expect(config.bakingTime).toBe(90);
      
      // Config should not have unknown properties
      expect((config as any).UNKNOWN_KEY).toBeUndefined();
    });
  });

  describe('setConfigValue - All Config Keys', () => {
    it('should set STARTING_FUNDS', async () => {
      const mockConfigText = 'STARTING_FUNDS=777';
      
      global.fetch = vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(mockConfigText)
      });

      const configManager = ConfigManager.getInstance();
      await configManager.loadConfig();
      
      expect(configManager.getConfig().startingFunds).toBe(777);
    });

    it('should set WIN_THRESHOLD', async () => {
      const mockConfigText = 'WIN_THRESHOLD=5000';
      
      global.fetch = vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(mockConfigText)
      });

      const configManager = ConfigManager.getInstance();
      await configManager.loadConfig();
      
      expect(configManager.getConfig().winThreshold).toBe(5000);
    });

    it('should set BANKRUPTCY_THRESHOLD', async () => {
      const mockConfigText = 'BANKRUPTCY_THRESHOLD=-50';
      
      global.fetch = vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(mockConfigText)
      });

      const configManager = ConfigManager.getInstance();
      await configManager.loadConfig();
      
      expect(configManager.getConfig().bankruptcyThreshold).toBe(-50);
    });

    it('should set FLOUR_PRICE_MIN', async () => {
      const mockConfigText = 'FLOUR_PRICE_MIN=10';
      
      global.fetch = vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(mockConfigText)
      });

      const configManager = ConfigManager.getInstance();
      await configManager.loadConfig();
      
      expect(configManager.getConfig().flourPriceMin).toBe(10);
    });

    it('should set FLOUR_PRICE_MAX', async () => {
      const mockConfigText = 'FLOUR_PRICE_MAX=25';
      
      global.fetch = vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(mockConfigText)
      });

      const configManager = ConfigManager.getInstance();
      await configManager.loadConfig();
      
      expect(configManager.getConfig().flourPriceMax).toBe(25);
    });

    it('should set BAKING_TIME', async () => {
      const mockConfigText = 'BAKING_TIME=100';
      
      global.fetch = vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(mockConfigText)
      });

      const configManager = ConfigManager.getInstance();
      await configManager.loadConfig();
      
      expect(configManager.getConfig().bakingTime).toBe(100);
    });

    it('should set CLEANING_TIME', async () => {
      const mockConfigText = 'CLEANING_TIME=70';
      
      global.fetch = vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(mockConfigText)
      });

      const configManager = ConfigManager.getInstance();
      await configManager.loadConfig();
      
      expect(configManager.getConfig().cleaningTime).toBe(70);
    });

    it('should set MAX_BREAD_CAPACITY', async () => {
      const mockConfigText = 'MAX_BREAD_CAPACITY=50';
      
      global.fetch = vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(mockConfigText)
      });

      const configManager = ConfigManager.getInstance();
      await configManager.loadConfig();
      
      expect(configManager.getConfig().maxBreadCapacity).toBe(50);
    });

    it('should set DIVISION_PROBLEMS', async () => {
      const mockConfigText = 'DIVISION_PROBLEMS=20';
      
      global.fetch = vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(mockConfigText)
      });

      const configManager = ConfigManager.getInstance();
      await configManager.loadConfig();
      
      expect(configManager.getConfig().divisionProblems).toBe(20);
    });

    it('should set MULTIPLICATION_PROBLEMS', async () => {
      const mockConfigText = 'MULTIPLICATION_PROBLEMS=15';
      
      global.fetch = vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(mockConfigText)
      });

      const configManager = ConfigManager.getInstance();
      await configManager.loadConfig();
      
      expect(configManager.getConfig().multiplicationProblems).toBe(15);
    });

    it('should set COOKIE_PRICE', async () => {
      const mockConfigText = 'COOKIE_PRICE=30';
      
      global.fetch = vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(mockConfigText)
      });

      const configManager = ConfigManager.getInstance();
      await configManager.loadConfig();
      
      expect(configManager.getConfig().cookiePrice).toBe(30);
    });
  });

  describe('Integration Tests', () => {
    it('should handle a realistic config file', async () => {
      const mockConfigText = `
# Game Configuration File
# Adjust these values to modify game behavior

# Starting conditions
STARTING_FUNDS=350
WIN_THRESHOLD=2500
BANKRUPTCY_THRESHOLD=-50

# Market prices
FLOUR_PRICE_MIN=6
FLOUR_PRICE_MAX=18

# Time settings (in seconds)
BAKING_TIME=75
CLEANING_TIME=50

# Capacity limits
MAX_BREAD_CAPACITY=25

# Minigame difficulty
DIVISION_PROBLEMS=12
MULTIPLICATION_PROBLEMS=10

# Special items
COOKIE_PRICE=22
`;

      global.fetch = vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(mockConfigText)
      });

      const configManager = ConfigManager.getInstance();
      await configManager.loadConfig();
      
      const config = configManager.getConfig();
      
      expect(config.startingFunds).toBe(350);
      expect(config.winThreshold).toBe(2500);
      expect(config.bankruptcyThreshold).toBe(-50);
      expect(config.flourPriceMin).toBe(6);
      expect(config.flourPriceMax).toBe(18);
      expect(config.bakingTime).toBe(75);
      expect(config.cleaningTime).toBe(50);
      expect(config.maxBreadCapacity).toBe(25);
      expect(config.divisionProblems).toBe(12);
      expect(config.multiplicationProblems).toBe(10);
      expect(config.cookiePrice).toBe(22);
    });
  });
});
