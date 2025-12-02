/**
 * main.ts - Application Entry Point
 *
 * This is the entry point for the entire cookie business game application.
 * It handles the initialization sequence and bootstraps the game.
 *
 * EXECUTION ORDER:
 * 1. Load game configuration from debug_mode.txt (if exists)
 * 2. Initialize the GameManager with the game container
 * 3. GameManager takes over and starts the game loop
 *
 * WHY THIS PATTERN?
 * - Configuration must load BEFORE game starts (affects initial values)
 * - Async/await ensures config loads completely before proceeding
 * - Clean separation: config → game initialization
 *
 * HTML REQUIREMENT:
 * The HTML file must have a div with id="game-container" where the
 * Konva canvas will be rendered.
 */

import { ConfigManager } from './config';
import { GameManager } from './GameManager';

/**
 * Main initialization function
 *
 * This async function orchestrates the game startup sequence.
 * It's marked async because we need to wait for configuration
 * to load from the server before starting the game.
 */
async function init() {
    // Step 1: Get the singleton ConfigManager instance
    // ConfigManager uses singleton pattern to ensure only one config exists
    const configManager = ConfigManager.getInstance();

    // Step 2: Load configuration from /debug_mode.txt
    // This is async - it fetches from server and parses the file
    // Falls back to default values if file missing/invalid
    await configManager.loadConfig();

    // Step 3: Get the DOM container where the game will render
    // This div must exist in index.html
    const container = document.getElementById('game-container') as HTMLDivElement;

    // Step 4: Create GameManager - this starts the game!
    // GameManager constructor:
    // - Creates Konva Stage and Layer
    // - Sets initial game phase to LOGIN
    // - Renders the login screen
    // - Sets up audio system
    new GameManager(container);
}

// Execute initialization when this file loads
// This kicks off the entire application
init();