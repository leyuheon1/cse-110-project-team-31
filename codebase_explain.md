# Codebase Explanation - Cookie Business Game

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture Overview](#architecture-overview)
3. [Game Flow](#game-flow)
4. [Core Systems](#core-systems)
5. [File Structure](#file-structure)
6. [Key Components](#key-components)
7. [Data Flow](#data-flow)
8. [Game Mechanics](#game-mechanics)

---

## Project Overview

This is a cookie baking business simulation game where the player helps "Owl" escape a trailer park by earning $1000 through baking and selling cookies. The game combines resource management, minigames (division and multiplication), and economic simulation.

**Tech Stack:**
- **TypeScript**: Primary language for type safety
- **Konva.js**: HTML5 Canvas library for 2D graphics rendering
- **Vite**: Build tool and development server
- **Vitest**: Testing framework

**Win Condition:** Reach $1000 in funds
**Lose Condition:** Go bankrupt (can't afford ingredients and can't make cookies)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                    main.ts                          │
│            (Application Entry Point)                │
└──────────────────┬──────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│              ConfigManager                           │
│         (Loads game configuration)                   │
└──────────────────┬───────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│              GameManager                             │
│         (Central Game Controller)                    │
│  • Manages game state (PlayerState)                  │
│  • Controls phase transitions                        │
│  • Orchestrates all screens                          │
│  • Handles audio/music                               │
└──────────────────┬───────────────────────────────────┘
                   │
    ┌──────────────┴──────────────┬───────────────┬────────────┬──────────────┐
    │                             │               │            │              │
    ↓                             ↓               ↓            ↓              ↓
LoginScreen                  OrderScreen    ShoppingScreen  BakingMinigame  CleaningMinigame
StoryScreen                 RecipeBookScreen               ...etc
HowToPlayScreen             DaySummaryScreen
                            VictoryScreen
                            LoseScreen
```

### Design Pattern: **State Machine**

The game uses a **Finite State Machine** pattern where:
- **States**: GamePhase enum values (LOGIN, SHOPPING, BAKING, etc.)
- **Transitions**: Player actions trigger phase changes
- **Controller**: GameManager orchestrates state transitions

---

## Game Flow

### Complete Game Loop

```
START
  ↓
[LOGIN SCREEN] ← Player enters username
  ↓
[STORYLINE] ← Shows Owl's backstory
  ↓
[HOW TO PLAY] ← Tutorial screen
  ↓
╔════════════════ DAY LOOP (Repeats until Win/Lose) ════════════════╗
║                                                                    ║
║  [ORDER SCREEN] ← See customer demands                            ║
║       ↓                                                            ║
║  [RECIPE BOOK] ← Check ingredients vs recipe                      ║
║       ↓                                                            ║
║  [SHOPPING] ← Buy ingredients                                     ║
║       ↓                                                            ║
║  [BAKING MINIGAME] ← Division problems (earn tips)                ║
║       ↓                                                            ║
║  [POST-BAKING ANIMATION] ← Visual transition                      ║
║       ↓                                                            ║
║  [CLEANING MINIGAME] ← Multiplication problems (rep management)   ║
║       ↓                                                            ║
║  [DAY SUMMARY] ← Financial summary                                ║
║       ↓                                                            ║
║  Check Win/Lose Conditions:                                       ║
║    • Funds >= $1000? → [VICTORY SCREEN]                           ║
║    • Bankrupt? → [DEFEAT SCREEN]                                  ║
║    • Else: Continue                                               ║
║       ↓                                                            ║
║  [NEW DAY ANIMATION] ← Visual transition to next day              ║
║       ↓                                                            ║
║  (Loop back to ORDER SCREEN)                                      ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

---

## Core Systems

### 1. **Game State Management** (`GameManager.ts`)

The `GameManager` class is the heart of the application:

**Key Responsibilities:**
- Maintains `PlayerState` (funds, ingredients, reputation, day number)
- Tracks current `GamePhase`
- Renders appropriate screen for each phase
- Manages phase transitions via callbacks
- Controls background music for each phase
- Handles win/lose condition checking

**Important Methods:**
- `renderCurrentPhase()`: Destroys current screen, renders new phase
- `cleanupCurrentPhase()`: Properly disposes of minigames/animations
- `updateBackgroundMusic()`: Changes music based on current phase
- `checkBankruptcy()`: Determines if player can continue
- `calculateMaxCookies()`: Checks how many cookies can be made

### 2. **Configuration System** (`config.ts`)

**ConfigManager** (Singleton Pattern):
- Loads configuration from `/debug_mode.txt`
- Provides default values if file missing
- Parses key=value format (e.g., `STARTING_FUNDS=500`)
- Allows game balance tuning without code changes

**Configurable Values:**
- Starting funds, win threshold, bankruptcy threshold
- Minigame time limits
- Cookie price, bread capacity
- Price ranges for ingredients

### 3. **Type System** (`types.ts`)

Defines all core interfaces and enums:

**GamePhase Enum**: All possible game screens/states

**PlayerState Interface**: Complete player progress
- `username`, `funds`, `currentDay`
- `ingredients` Map (name → quantity)
- `reputation` (0.2 - 1.5 range)
- `dishesToClean`, `currentDayDemand`

**GameConfig Interface**: All tunable game parameters

**MinigameResult Interface**: Minigame completion data

---

## File Structure

```
src/
├── types.ts                    # TypeScript interfaces & enums
├── config.ts                   # Configuration manager (singleton)
├── main.ts                     # Application entry point
├── GameManager.ts              # Central game controller (1000+ lines)
│
├── AnimationPlayer.ts          # Generic frame-by-frame image animator
│
├── Screen Classes:
│   ├── LoginScreen.ts          # Username input screen
│   ├── StoryScreen.ts          # Narrative introduction
│   ├── HowToPlayScreen.ts     # Tutorial/instructions
│   ├── OrderScreen.ts          # Customer order display
│   ├── RecipeBookScreen.ts    # Recipe & inventory viewer
│   ├── ShoppingScreen.ts      # Ingredient purchasing
│   ├── DaySummaryScreen.ts    # End-of-day financial summary
│   ├── VictoryScreen.ts        # Win screen with confetti
│   └── LoseScreen.ts           # Game over screen
│
├── Minigames:
│   ├── BakingMinigame.ts       # Division problems (earn tips)
│   └── CleaningMinigame.ts     # Multiplication problems (reputation)
│
└── ui/                         # Reusable UI components
    ├── ExitButton.ts           # Top-left exit button
    ├── InfoButton.ts           # Top-right info button
    ├── ShuffleButton.ts        # Minigame problem shuffle
    ├── Volumeslider.ts         # Audio volume control
    └── SavingsTracker.ts       # Displays current savings
```

---

## Key Components

### GameManager (GameManager.ts)

**Purpose**: Central orchestrator managing entire game lifecycle

**Key Properties:**
```typescript
private stage: Konva.Stage;           // Main canvas stage
private layer: Konva.Layer;           // Drawing layer
private currentPhase: GamePhase;      // Current game state
private player: PlayerState;          // Player progress data
private config: GameConfig;           // Game configuration

// Economic tracking (per day):
private daySales: number;             // Revenue from cookie sales
private dayExpenses: number;          // Ingredient costs + fines
private dayTips: number;              // Tips from baking minigame
private customerOrders: Array<...>;   // Today's customer orders

// Audio:
private bgmIntro, bgmStory, bgmMain, etc.; // Background music tracks
private winSound, loseSound;          // Sound effects
```

**Phase Rendering Pattern:**
```typescript
private renderCurrentPhase(): void {
    this.cleanupCurrentPhase();              // Destroy previous screen
    this.updateBackgroundMusic();            // Switch music

    switch (this.currentPhase) {
        case GamePhase.LOGIN:
            new LoginScreen(this.stage, this.layer, (username) => {
                this.player.username = username;
                this.currentPhase = GamePhase.STORYLINE;
                this.renderCurrentPhase();   // Transition to next phase
            });
            break;
        // ... other phases
    }
}
```

**Cookie Recipe & Pricing:**
```typescript
private cookieRecipe: Map<string, number> = new Map([
    ['Flour', 3],           // 3 cups per cookie
    ['Sugar', 1],           // 1 cup per cookie
    ['Butter', 8],          // 8 tbsp per cookie
    ['Chocolate', 1],       // 1 cup per cookie
    ['Baking Soda', 2],     // 2 tsp per cookie
]);

private ingredientPrices: Map<string, number> = new Map([
    ['Flour', 0.5],         // $0.50 per cup
    ['Sugar', 0.75],        // $0.75 per cup
    ['Butter', 0.25],       // $0.25 per tbsp
    ['Chocolate', 3],       // $3.00 per cup
    ['Baking Soda', 0.5],   // $0.50 per tsp
]);
```

**Cost of one cookie**: (3×0.5) + (1×0.75) + (8×0.25) + (1×3) + (2×0.5) = **$8.25**
**Sale price per cookie**: **$15**
**Profit per cookie** (before tips/fines): **$6.75**

---

### OrderScreen (OrderScreen.ts)

**Purpose**: Display daily customer orders

**How It Works:**
1. Generates customer count based on `reputation`:
   ```typescript
   const numCustomers = 1 + floor(reputation × 6)  // Range: 1-7 customers
   ```
2. Each customer orders cookies:
   ```typescript
   const cookieCount = max(1, floor((reputation × 4) + random(-2, 1)))
   ```
3. Displays orders on a receipt image
4. Stores `totalDemand` and passes to next screen

**Visual Elements:**
- Owl character image (left side)
- Receipt showing:
  - Day number
  - Customer list with cookie counts
  - Total demand
- Continue button (bottom)

---

### ShoppingScreen (ShoppingScreen.ts)

**Purpose**: Allow player to purchase ingredients

**UI Layout:**
- Top: Current balance + Total cost display
- Center: 5 ingredient slots with:
  - Ingredient name
  - Price tag
  - Input box for quantity
- Bottom buttons:
  - "VIEW RECIPE" → Goes back to RecipeBookScreen
  - "VIEW ORDERS" → Shows order receipt modal
  - "PURCHASE" → Completes transaction

**Input System:**
- Click to focus an ingredient input
- Type numbers (0-9)
- Backspace to delete
- Enter or click PURCHASE to buy

**Purchase Validation:**
```typescript
if (totalCost > currentFunds) {
    alert("Not enough funds!");
    return;
}
```

**Saved Input Feature:**
- When going back to RecipeBook, inputs are saved
- When returning to Shopping, previous values are restored

---

### RecipeBookScreen (RecipeBookScreen.ts)

**Purpose**: Show recipe requirements vs current inventory

**Display Format:**
```
┌────────────────────────────────────────┐
│      Owl's Top-Secret Recipe          │
├────────────────┬────────┬─────────────┤
│   GOODIES      │  NEED  │   HAVE      │
├────────────────┼────────┼─────────────┤
│ Flour (cups)   │    3   │  10 (green) │
│ Butter (tbsp)  │    8   │   5 (red)   │
│ ...            │  ...   │  ...        │
└────────────────┴────────┴─────────────┘
```

- **Green numbers**: Player has enough
- **Red numbers**: Player needs more
- **BUY INGREDIENTS button**: Returns to shopping

---

### BakingMinigame (BakingMinigame.ts)

**Purpose**: Division problem minigame to earn tips

**Game Flow:**
1. **Animation Phase**: Shows 6-frame baking animation
2. **Choice Modal**: Play (minigame) or Skip (no tips)
3. **Minigame Phase** (if Play chosen):
   - 60 seconds (configurable)
   - Division problems: `dividend ÷ divisor = ?`
   - Type answer, press Enter
   - Shuffle button: Skip current problem
   - Each correct answer: **+$5 tip**
4. **Results Screen**: Shows score and mistakes

**Problem Generation:**
```typescript
const divisor = random(2, 10);       // Numbers 2-10
const quotient = random(1, 12);      // Numbers 1-12
const dividend = divisor × quotient; // Ensures clean division
// Example: 56 ÷ 7 = 8
```

**Rewards:**
- Correct answer: +$5 added to `dayTips`
- Skip minigame: $0 tips earned

**UI Elements:**
- Problem display (large text)
- Input box (user types answer)
- Timer (changes color when < 30s, < 10s)
- Score tracker ("Tips Earned: $XX")
- Shuffle button (skip problem)
- Exit button (quit game)
- Info button (game rules)

---

### CleaningMinigame (CleaningMinigame.ts)

**Purpose**: Multiplication problem minigame for reputation management

**Game Flow:**
1. **Choice Modal**: Play or Skip
2. **Minigame Phase** (if Play chosen):
   - 45 seconds (configurable)
   - Multiplication problems: `num1 × num2 = ?`
   - Must solve exactly **5 problems correctly** to complete
   - Can solve more than 5 (if fast enough)
3. **Results Screen**: Shows dishes cleaned

**Problem Generation:**
```typescript
const num1 = random(1, 12);  // Numbers 1-12
const num2 = random(1, 12);  // Numbers 1-12
// Example: 7 × 8 = 56
```

**Reputation System:**
```typescript
if (skipped) {
    reputation -= 0.2;         // Penalty for skipping
    funds -= $50;              // Fine for dirty dishes
} else {
    reputation += 0.05;        // Bonus for playing

    // Penalty for uncleaned dishes:
    const leftover = dishesToClean - correctAnswers;
    if (leftover > 0) {
        funds -= (leftover × $10);  // $10 per dirty dish
    }
}

// Clamp reputation to valid range:
reputation = clamp(reputation, 0.2, 1.5);
```

**Important**: Even if you don't finish all dishes, you still get reputation boost for trying!

---

### DaySummaryScreen (DaySummaryScreen.ts)

**Purpose**: Show end-of-day financial summary

**Display Information:**
```
┌──────────────────────────────────────┐
│           DAY X                      │
├──────────────────────────────────────┤
│ Sales (Cookies Sold):    +$XXX.XX   │  (green)
│ Tips Earned:             +$XX.XX    │  (gold)
│ Expenses (Ingredients):  -$XXX.XX   │  (red)
│ Combined Profit & Loss:  ±$XXX.XX   │  (green/red)
│ Current Funds:           $XXX.XX    │  (blue)
└──────────────────────────────────────┘
```

**Calculations:**
- `daySales` = cookies sold × $15
- `dayTips` = correct baking answers × $5
- `dayExpenses` = ingredient costs + cleaning fines
- `netChange` = daySales + dayTips - dayExpenses
- `currentFunds` = previous funds + netChange

**After Summary:**
- Check if `funds >= $1000` → VICTORY
- Check if `bankrupt` → DEFEAT
- Otherwise → NEW_DAY_ANIMATION → next day

---

### AnimationPlayer (AnimationPlayer.ts)

**Purpose**: Generic frame-by-frame image animator

**Usage:**
```typescript
const player = new AnimationPlayer(
    layer,                    // Konva layer to draw on
    imagePaths,               // Array of image URLs
    frameRate,                // Frames per second
    x, y, width, height,      // Position and size
    loop,                     // true = loop forever
    onComplete                // Callback when finished
);

await player.load();          // Load all images
player.start();               // Begin animation
```

**Used For:**
- Post-baking animation (12 frames)
- New day animation (15 frames)
- Baking minigame intro (6 frames)

**Features:**
- Preloads all images before playing
- Interval-based frame advancing
- Supports looping or one-shot playback
- Cleanup method to prevent memory leaks

---

## Data Flow

### Money Flow

```
[START: $500]
    ↓
SHOPPING: -$XX.XX (ingredient purchases) → dayExpenses
    ↓
BAKING: Sell cookies → daySales = cookiesSold × $15
        +Tips → dayTips = correctAnswers × $5
    ↓
CLEANING: Penalties → dayExpenses += fines
    ↓
DAY SUMMARY: funds += (daySales + dayTips - dayExpenses)
    ↓
[NEXT DAY]
```

### Reputation Flow

```
[START: 1.0 reputation]
    ↓
ORDER: reputation determines # of customers (1-7)
    ↓
CLEANING MINIGAME:
    • Skip → reputation -= 0.2
    • Play → reputation += 0.05
    ↓
reputation = clamp(reputation, 0.2, 1.5)
    ↓
[NEXT DAY: more/less customers]
```

### Ingredient Flow

```
RECIPE BOOK: Check current inventory
    ↓
SHOPPING: Purchase ingredients
    • ingredients[name] += quantity purchased
    ↓
BAKING: Consume ingredients
    • For each cookie made:
        ingredients[name] -= recipe[name]
    ↓
[Remaining inventory carries to next day]
```

---

## Game Mechanics

### Win/Lose Conditions

**Victory** (`checkBankruptcy()` in GameManager):
```typescript
if (funds >= winThreshold) {
    // Default: $1000
    currentPhase = GamePhase.VICTORY;
}
```

**Defeat** (Bankruptcy Check):
```typescript
function checkBankruptcy(): boolean {
    // Can still make cookies? → Not bankrupt
    if (canMakeCookies()) return false;

    // Can afford to buy one cookie's worth of ingredients? → Not bankrupt
    if (funds >= costOfOneCookie) return false;  // $8.25

    // Can't make cookies AND can't afford ingredients → Bankrupt!
    return true;
}
```

### Cookie Production Calculation

```typescript
function calculateMaxCookies(): number {
    let maxCookies = Infinity;

    // Check each ingredient
    cookieRecipe.forEach((needed, ingredient) => {
        const has = player.ingredients.get(ingredient) || 0;
        const canMake = floor(has / needed);

        if (canMake < maxCookies) {
            maxCookies = canMake;  // Bottleneck ingredient
        }
    });

    return maxCookies === Infinity ? 0 : maxCookies;
}
```

**Example:**
- Recipe needs: Flour(3), Sugar(1), Butter(8), Chocolate(1), Baking Soda(2)
- Inventory: Flour(10), Sugar(5), Butter(16), Chocolate(2), Baking Soda(8)
- Calculations:
  - Flour: 10/3 = 3 cookies
  - Sugar: 5/1 = 5 cookies
  - Butter: 16/8 = 2 cookies ← **Bottleneck!**
  - Chocolate: 2/1 = 2 cookies
  - Baking Soda: 8/2 = 4 cookies
- **Max cookies = 2** (limited by Butter)

### Baking Phase Execution

```typescript
// 1. Calculate how many cookies can be made
const maxCookies = calculateMaxCookies();

// 2. Determine how many to sell (limited by demand)
const cookiesSold = min(maxCookies, player.currentDayDemand);

// 3. Deduct ingredients
if (cookiesSold > 0) {
    cookieRecipe.forEach((needed, ingredient) => {
        const totalNeeded = needed × cookiesSold;
        ingredients[ingredient] -= totalNeeded;
    });

    // 4. Add sales revenue
    const revenue = cookiesSold × $15;
    funds += revenue;
    daySales = revenue;

    // 5. Set dishes to clean
    dishesToClean = cookiesSold;
}

// 6. Launch baking minigame to earn tips
```

### Reputation Impact

Reputation affects customer count exponentially:

| Reputation | Customer Count | Average Demand |
|------------|----------------|----------------|
| 0.2 (min)  | 1-2            | 1-2 cookies    |
| 0.5        | 3-4            | 2-3 cookies    |
| 1.0        | 4-5            | 4-5 cookies    |
| 1.5 (max)  | 6-7            | 6-8 cookies    |

### Audio System

**Background Music Tracks:**
- **Intro BGM**: Login, How To Play screens
- **Story BGM**: Storyline screen
- **Main BGM**: Order, Recipe, Shopping, Cleaning screens
- **Animation BGM**: Post-baking, New Day animations
- **End Day BGM**: Day Summary screen
- **Baking BGM**: Baking minigame

**Volume Control:**
- VolumeSlider component in multiple screens
- Global volume stored in GameManager (`bgmVolume`)
- Changes propagate via window events:
  ```typescript
  window.dispatchEvent(new CustomEvent('bgm-volume-change', { detail: volume }));
  ```

**Audio Unlocking:**
- Browsers require user interaction before playing audio
- Game waits for first `pointerdown` or `keydown` event
- Sets `audioUnlocked = true`, then plays music

---

## Special Features

### Resize Handling

Many screens implement resize handlers to maintain responsiveness:
```typescript
private handleResize(): void {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    animationFrameId = requestAnimationFrame(() => {
        this.layer.destroyChildren();  // Clear current UI
        this.setupUI();                 // Redraw at new size
    });
}
```

**Pattern used in:**
- LoginScreen
- StoryScreen
- HowToPlayScreen
- ShoppingScreen
- DaySummaryScreen

### Cleanup Pattern

All screens implement a `cleanup()` method:
```typescript
public cleanup(): void {
    // Remove event listeners
    window.removeEventListener('keydown', this.keyboardHandler);
    window.removeEventListener('resize', this.resizeHandler);

    // Stop intervals/animations
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.animation) this.animation.stop();

    // Destroy Konva nodes
    this.layer.destroyChildren();
}
```

**Why**: Prevents memory leaks when transitioning between screens.

---

## Development Notes

### Debug Configuration

Create `public/debug_mode.txt` to override defaults:
```
STARTING_FUNDS=1000
WIN_THRESHOLD=500
BAKING_TIME=120
CLEANING_TIME=60
COOKIE_PRICE=20
```

### Common Pitfalls

1. **Forgetting to call `cleanup()`**: Leads to multiple event listeners
2. **Not checking `isActive` flag**: Causes async operations on destroyed screens
3. **Direct player state mutation**: Always use GameManager methods
4. **Missing `batchDraw()` after changes**: UI doesn't update

### Performance Considerations

- **Image caching**: ShoppingScreen caches price tag image
- **Batch drawing**: Use `layer.batchDraw()` instead of `layer.draw()`
- **Animation frame limiting**: Resize handlers use `requestAnimationFrame`
- **Cleanup on transition**: Destroy Konva nodes to free memory

---

## Summary

This codebase implements a complete game loop with:
- **12+ game screens** with smooth transitions
- **2 educational minigames** (math practice)
- **Economic simulation** (ingredient costs, cookie sales, tips, fines)
- **Reputation system** affecting difficulty
- **Configuration system** for game balance
- **Responsive UI** with resize handling
- **Audio system** with multiple tracks
- **Win/lose conditions** with victory/defeat screens

**Key takeaway**: The `GameManager` is the central hub. It maintains `PlayerState`, orchestrates screen transitions via `GamePhase`, and enforces game rules through its helper methods. Each screen is a self-contained class that accepts callbacks to trigger phase transitions when complete.
