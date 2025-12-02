/**
 * GamePhase Enum
 *
 * This enum defines all possible phases (screens/states) in the game.
 * The GameManager uses this to track which screen is currently being displayed
 * and to control the flow of the game from login to victory/defeat.
 *
 * Flow: LOGIN → STORYLINE → HOW_TO_PLAY → ORDER → RECIPE_BOOK → SHOPPING →
 *       BAKING → POST_BAKING_ANIMATION → CLEANING → DAY_SUMMARY → NEW_DAY_ANIMATION →
 *       (back to ORDER) OR VICTORY/DEFEAT
 */
export enum GamePhase {
    LOGIN,                   // Initial screen where player enters username
    STORYLINE,              // Story introduction screen explaining Owl's situation
    HOW_TO_PLAY,            // Tutorial screen explaining game mechanics
    ORDER,                  // Shows customer orders for the day
    SHOPPING,               // Player purchases ingredients
    RECIPE_BOOK,            // Displays recipe and current ingredient inventory
    BAKING,                 // Division minigame to earn tips
    POST_BAKING_ANIMATION,  // Animation shown after baking phase
    CLEANING,               // Multiplication minigame to clean dishes
    DAY_SUMMARY,            // End of day financial summary
    NEW_DAY_ANIMATION,      // Animation shown before starting a new day
    GAME_OVER,              // Legacy/fallback game over state
    VICTORY,                // Win condition: player reaches funding goal
    DEFEAT                  // Lose condition: player goes bankrupt
}

/**
 * Ingredient Interface
 *
 * Represents a single ingredient item in the game's economy system.
 * Used primarily in the shopping screen to display available ingredients.
 *
 * Properties:
 * - name: The ingredient's display name (e.g., "Flour", "Sugar")
 * - price: Cost per unit of this ingredient
 * - quantity: How many units the player currently owns
 */
export interface Ingredient {
    name: string;      // Display name of the ingredient
    price: number;     // Cost per unit in dollars
    quantity: number;  // Current quantity owned by player
}

/**
 * PlayerState Interface
 *
 * This is the core game state object that tracks all player progress throughout the game.
 * The GameManager maintains this state and passes it between different game phases.
 *
 * Properties:
 * - username: Player's entered name from login screen
 * - funds: Current cash balance (win at $1000, lose at $0 with no ingredients)
 * - ingredients: Map of ingredient names to quantities owned
 * - breadInventory: Array of baked bread items (currently unused in gameplay)
 * - maxBreadCapacity: Maximum bread storage capacity
 * - currentDay: Current day number in the game
 * - dishesToClean: Number of dishes generated from baking (equals cookies sold)
 * - reputation: Player's reputation score (affects customer count, range 0.2-1.5)
 * - currentDayDemand: Total cookies demanded by all customers for current day
 */
export interface PlayerState {
    username: string;                    // Player's name entered at login
    funds: number;                       // Current money balance in dollars
    ingredients: Map<string, number>;    // Ingredient inventory (name → quantity)
    breadInventory: Bread[];            // Array of baked bread (legacy feature)
    maxBreadCapacity: number;           // Maximum bread storage allowed
    currentDay: number;                 // Current day number (starts at 1)
    dishesToClean: number;              // Dishes to clean (equals cookies sold)
    reputation: number;                 // Reputation score affecting customer count
    currentDayDemand: number;           // Total cookie demand for the day
}

/**
 * Bread Interface
 *
 * Represents baked bread with quality and quantity metrics.
 * This is a legacy feature that's currently not actively used in the main gameplay loop.
 *
 * Properties:
 * - quality: Quality score from 0-100 (higher is better)
 * - quantity: Number of bread units
 */
export interface Bread {
    quality: number;   // Quality rating: 0-100 scale
    quantity: number;  // Number of bread units
}

/**
 * GameConfig Interface
 *
 * Defines all configurable game parameters that can be loaded from debug_mode.txt.
 * This allows game designers to tweak difficulty and balance without changing code.
 *
 * Configuration is loaded by ConfigManager at game startup.
 *
 * Properties:
 * - startingFunds: Initial money when game begins (default: $500)
 * - winThreshold: Money needed to win the game (default: $1000)
 * - bankruptcyThreshold: Money level that triggers game over (default: $0)
 * - flourPriceMin/Max: Price range for flour (currently unused)
 * - bakingTime: Seconds allowed for baking minigame (default: 60)
 * - cleaningTime: Seconds allowed for cleaning minigame (default: 45)
 * - maxBreadCapacity: Maximum bread storage (default: 20)
 * - divisionProblems: Number of division problems in baking (default: 10)
 * - multiplicationProblems: Number of multiplication problems in cleaning (default: 8)
 * - cookiePrice: Revenue per cookie sold (default: $15)
 */
export interface GameConfig {
    startingFunds: number;           // Starting cash balance
    winThreshold: number;            // Money needed to win
    bankruptcyThreshold: number;     // Money that triggers bankruptcy
    flourPriceMin: number;          // Minimum flour price (unused)
    flourPriceMax: number;          // Maximum flour price (unused)
    bakingTime: number;             // Baking minigame time limit in seconds
    cleaningTime: number;           // Cleaning minigame time limit in seconds
    maxBreadCapacity: number;       // Maximum bread storage capacity
    divisionProblems: number;       // Number of division problems (unused)
    multiplicationProblems: number; // Number of multiplication problems (unused)
    cookiePrice: number;            // Revenue per cookie sold
}

/**
 * MinigameResult Interface
 *
 * Returned by both BakingMinigame and CleaningMinigame when they complete.
 * Contains performance metrics used to calculate rewards/penalties.
 *
 * Properties:
 * - correctAnswers: Number of problems solved correctly
 * - totalProblems: Total number of problems attempted
 * - timeRemaining: Seconds left when minigame ended (or 0 if time ran out)
 */
export interface MinigameResult {
    correctAnswers: number;   // Number of correct answers given
    totalProblems: number;    // Total problems attempted
    timeRemaining: number;    // Seconds remaining when completed
}