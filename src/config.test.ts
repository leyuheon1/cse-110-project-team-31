// src/config.test.ts

import { describe, it, expect } from 'vitest';
import { ConfigManager } from './config';

describe('ConfigManager Trivial Test', () => {

  it('should be a singleton', () => {
    const instance1 = ConfigManager.getInstance();
    const instance2 = ConfigManager.getInstance();
    
    // Test that getInstance() always returns the same object
    expect(instance1).toBe(instance2);
  });

  it('should have the correct default starting funds', () => {
    const configManager = ConfigManager.getInstance();
    const config = configManager.getConfig();
    
    // This tests the default value set in the constructor
    // before any async loading happens.
    expect(config.startingFunds).toBe(250);
  });

});