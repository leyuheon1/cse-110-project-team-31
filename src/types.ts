export enum GamePhase {
    LOGIN,
    HOW_TO_PLAY,
    ORDER, 
    SHOPPING,
    RECIPE_BOOK,
    BAKING,
    POST_BAKING_ANIMATION,
    CLEANING,
    DAY_SUMMARY,
    GAME_OVER,
    VICTORY,
    DEFEAT
}

export interface Ingredient {
    name: string;
    price: number;
    quantity: number;
}

export interface PlayerState {
    username: string;
    funds: number;
    ingredients: Map<string, number>;
    breadInventory: Bread[]; 
    maxBreadCapacity: number;
    currentDay: number;
    dishesToClean: number;
    reputation: number;
    currentDayDemand: number; // <-- ADDED THIS
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