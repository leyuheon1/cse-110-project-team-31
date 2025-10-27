import { ConfigManager } from './config';
import { GameManager } from './GameManager';

async function init() {
    // Load config first
    const configManager = ConfigManager.getInstance();
    await configManager.loadConfig();

    // Start game
    const container = document.getElementById('game-container') as HTMLDivElement;
    new GameManager(container);
}

init();