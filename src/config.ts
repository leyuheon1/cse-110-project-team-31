/**
 * config.ts - Game Configuration Management
 *
 * This file implements the ConfigManager class using the Singleton pattern.
 * It handles loading and managing all game configuration parameters.
 *
 * PURPOSE:
 * Allow game designers to tweak game balance (prices, timers, thresholds)
 * without modifying code. Configuration is loaded from debug_mode.txt.
 *
 * SINGLETON PATTERN:
 * Only one ConfigManager instance can exist. This ensures all parts of the
 * game use the same configuration values.
 *
 * USAGE:
 * const config = ConfigManager.getInstance().getConfig();
 * const startingMoney = config.startingFunds;  // e.g., $500
 */

import { GameConfig } from './types';

/**
 * ConfigManager Class (Singleton)
 *
 * Manages all game configuration parameters. Uses singleton pattern
 * to ensure only one configuration exists throughout the application.
 */
export class ConfigManager {
    // Static instance variable for singleton pattern
    private static instance: ConfigManager;

    // The actual configuration data
    private config: GameConfig;

    /**
     * Private constructor (Singleton Pattern)
     *
     * Private to prevent external instantiation. Use getInstance() instead.
     * Initializes all configuration values to their defaults.
     */
    private constructor() {
        // Default configuration values
        // These are used if debug_mode.txt can't be loaded
        this.config = {
            startingFunds: 500,
            winThreshold: 1000, //change from 2000 to 1000
            bankruptcyThreshold: 0,
            flourPriceMin: 5,
            flourPriceMax: 15,
            bakingTime: 60,
            cleaningTime: 45,
            maxBreadCapacity: 20,
            divisionProblems: 10,
            multiplicationProblems: 8,
            cookiePrice: 15 
        };
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    public async loadConfig(): Promise<void> {
        try {
            const response = await fetch('/debug_mode.txt');
            const text = await response.text();
            this.parseConfig(text);
            console.log('Config loaded:', this.config);
        } catch (error) {
            console.warn('Could not load config file, using defaults:', error);
        }
    }

    private parseConfig(text: string): void {
        const lines = text.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, value] = trimmed.split('=');
                if (key && value) {
                    this.setConfigValue(key.trim(), value.trim());
                }
            }
        }
    }

    private setConfigValue(key: string, value: string): void {
        const numValue = parseFloat(value);
        switch (key) {
            case 'STARTING_FUNDS':
                this.config.startingFunds = numValue;
                break;
            case 'WIN_THRESHOLD':
                this.config.winThreshold = numValue;
                break;
            case 'BANKRUPTCY_THRESHOLD':
                this.config.bankruptcyThreshold = numValue;
                break;
            case 'FLOUR_PRICE_MIN':
                this.config.flourPriceMin = numValue;
                break;
            case 'FLOUR_PRICE_MAX':
                this.config.flourPriceMax = numValue;
                break;
            case 'BAKING_TIME':
                this.config.bakingTime = numValue;
                break;
            case 'CLEANING_TIME':
                this.config.cleaningTime = numValue;
                break;
            case 'MAX_BREAD_CAPACITY':
                this.config.maxBreadCapacity = numValue;
                break;
            case 'DIVISION_PROBLEMS':
                this.config.divisionProblems = numValue;
                break;
            case 'MULTIPLICATION_PROBLEMS':
                this.config.multiplicationProblems = numValue;
                break;
            case 'COOKIE_PRICE':
                this.config.cookiePrice = numValue;
                break;
        }
    }

    public getConfig(): GameConfig {
        return { ...this.config };
    }
}