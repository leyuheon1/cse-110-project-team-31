export enum GamePhase {
    HOW_TO_PLAY,
    ORDER, 
    SHOPPING,
    BAKING,
    SELLING,
    CLEANING,
    GAME_OVER
}

export interface PlayerState {
    funds: number;
    flourInventory: number;
    breadInventory: Bread[];
    maxBreadCapacity: number;
    currentDay: number;
}

export interface Bread {
    quality: number; // 0-100
    quantity: number;
}

export interface GameConfig {
    startingFunds: number;
    winThreshold: number;
    bankruptcyThreshold: number;
    flourPriceMin: number;
    flourPriceMax: number;
    bakingTime: number;
    cleaningTime: number;
    maxBreadCapacity: number;
    divisionProblems: number;
    multiplicationProblems: number;
}

export interface MinigameResult {
    correctAnswers: number;
    totalProblems: number;
    timeRemaining: number;
}