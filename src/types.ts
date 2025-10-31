export enum GamePhase {
    LOGIN, // <-- Added this phase
    HOW_TO_PLAY,
    ORDER, 
    SHOPPING,
    BAKING,
    // SELLING,
    CLEANING,
    DAY_SUMMARY,
    GAME_OVER
}

export interface Ingredient {
    name: string;
    price: number;
    quantity: number;
}

// This is the single, corrected PlayerState interface
export interface PlayerState {
    username: string; // <-- Included from your second definition
    funds: number;
    ingredients: Map<string, number>;
    breadInventory: Bread[];
    maxBreadCapacity: number;
    currentDay: number;
    dishesToClean: number;
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
    cookiePrice: number;
}

export interface MinigameResult {
    correctAnswers: number;
    totalProblems: number;
    timeRemaining: number;
}

