# Cookie Trailer Tycoon

## Oct 28, 2025 - Yuheon Joh Report

**I have implemented all game logic and systems documented below from scratch.** This includes complete architecture design, all TypeScript files, and full game functionality.

### Game Logic Overview (Implemented by Yuheon Joh)

**Cookie Trailer Tycoon** is an educational bakery management game where players run a cookie business through daily cycles of purchasing ingredients, baking cookies by solving math problems, and cleaning dishes.

#### Core Game Loop

1. **How to Play Screen** - Introduction and instructions loaded from `howtoplay.txt`

2. **Today's Orders** - Display customer orders (3 customers ordering 50-99 cookies each randomly)

3. **Shopping Phase** - Purchase ingredients with current funds:
   - Flour: $1
   - Butter: $2
   - Sugar: $3
   - Chocolate Chips: $4
   - Baking Soda: $5
   - Players input custom quantities for each ingredient with visual cursor feedback
   - Cannot proceed if insufficient funds

4. **Baking Phase** - Solve division problems to make cookies:
   - Each correct answer = 1 cookie made
   - Consumes 1 unit of each ingredient per cookie in real-time
   - Time limit: configurable via debug_mode.txt
   - Stops automatically when ingredients run out
   - Each cookie sells for $15 (configurable via debug_mode.txt)

5. **Cleaning Phase** - Solve multiplication problems to clean dishes:
   - Number of dishes = number of cookies baked
   - Each correct answer = 1 dish cleaned
   - Time limit: configurable via debug_mode.txt
   - Ends early if all dishes cleaned
   - Penalty: $10 per uncleaned dish

6. **Day Summary** - Shows financial results:
   - Total sales
   - Total expenses (ingredients + penalties)
   - Profit/Loss
   - Remaining funds

7. **Win/Loss Conditions**:
   - Victory: Reach $5000+ (configurable via debug_mode.txt)
   - Defeat: Funds reach $0 (configurable via debug_mode.txt)

---

### Technical Architecture (Authored by Yuheon Joh)

#### Files Created by Yuheon Joh

**All TypeScript files written from scratch:**
- `GameManager.ts` - Main game controller, phase management (~350 lines)
- `HowToPlayScreen.ts` - Tutorial screen (~150 lines)
- `OrderScreen.ts` - Daily order display (~200 lines)
- `ShoppingScreen.ts` - Ingredient purchasing with input system (~300 lines)
- `BakingMinigame.ts` - Division problem minigame (~250 lines)
- `CleaningMinigame.ts` - Multiplication problem minigame (~250 lines)
- `DaySummaryScreen.ts` - End-of-day financial summary (~150 lines)
- `config.ts` - Configuration manager (~100 lines)
- `types.ts` - TypeScript interfaces and enums (~50 lines)
- `main.ts` - Application entry point (~20 lines)

**Total: ~1800 lines of code**

#### Key Features Implemented

- Fully responsive UI that scales with browser window
- Background image system with transparency
- Keyboard input handling with visual cursor feedback
- Async configuration loading from text files
- Real-time ingredient tracking and consumption
- Financial tracking (sales, expenses, profit)

---

### Configuration

All game parameters are configurable via `debug_mode.txt`:
```
STARTING_FUNDS=1000
WIN_THRESHOLD=5000
BANKRUPTCY_THRESHOLD=0
FLOUR_PRICE_MIN=5
FLOUR_PRICE_MAX=15
BAKING_TIME=60
CLEANING_TIME=45
MAX_BREAD_CAPACITY=20
COOKIE_PRICE=15
```

---

## How to Install
```bash
git clone [repository-url]
npm install konva
npm install --save-dev typescript vite
```
*(node_modules not uploaded to git)*

## How to Run
```bash
npm run dev
```

---

## My Implementation Details

### Features Added by Yuheon Joh
- Complete game loop implementation from scratch (shopping → baking → cleaning → summary)
- How to Play screen with async text loading
- Shopping phase with custom ingredient input system
- Real-time ingredient consumption during baking
- Dynamic dish cleaning system
- Day summary financial tracking
- Responsive UI across all screens
- Background image integration
- Win/loss condition logic

### Bug Fixes
- Fixed background image not showing on minigame screens
- Fixed purchase button not working in shopping phase
- Fixed cursor cleanup memory leaks
- Fixed ingredient checking logic

### Technical Improvements
- Made all screens responsive (works across display sizes)
- Added visual cursor feedback for text inputs
- Implemented proper event listener cleanup
- Created modular screen architecture

---

## Known Issues & Future Work

### Bugs to Fix
- Display resizing during baking phase causes game reset
- Text clipping in How to Play screen with very long content
- Image sizing/placement needs adjustment on Order Screen

### Planned Features
- Small display optimization (currently optimized for laptop+)
- Help button system
- User database for persistence
- Login page
- Audio system (victory/defeat music)
- Cookie recipe screen
- Owl speech bubble on Order Screen

---

## Development Log

### Oct 26, 2025 - Initial Design
- Designed game architecture
- Created barebone structure
- Planned game loop phases

### Oct 28, 2025 - Full Implementation
- Implemented all 10 TypeScript files
- Created complete game flow
- Added responsive UI system
- Integrated all game phases