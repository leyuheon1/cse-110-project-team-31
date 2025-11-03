# Technical Architecture & Configuration

## Overview
This document details the core technical structure of **Cookie Trailer Tycoon** and its configurable parameters.  
The project is developed in **TypeScript** with **Vite** for bundling and **Konva.js** for rendering interactive visual elements.

---

## TypeScript File Structure

| File | Description |
|------|--------------|
| **GameManager.ts** | Main game controller that manages the entire gameplay flow by handling all pahses from Login, How-To-Play, Order, Shopping, Recipe Book, Baking, Cleaning, Day summary, and Game Over. It maintains player state such as funds, ingredients, and progress and coordinates transitions between screens, tracks daily sales and expendses, and eforces game logic such as win/loss conditions.|
| **LoginScreen.ts** | Implements the player login interface where users enter their name to begin the game. Has responsive UI with a blinking cursor, live text inout, and a "Start Game" button. Handles keyboard input for typing  and validation, ensuring a name is entered before continuing. Cleans up event listeners and itervals on completion.|
| **HowToPlayScreen.ts** | Displays an instruction screen explaining game mechanics. It loads and renders text from /howtoplay.txt. Includes a "Start Game" button that transitions to ga,eplay when clicked, featuring hover effects and fallback text if instructions fail to load.|
| **OrderScreen.ts** | Displays current day's customer orders with a placeholder anf owl image, generates random orders, displays the total number of ordered cookies, and provides has a "Continue" button to proceed to the next game phase.|
| **ShoppingScreen.ts** | Displays a shopping interface for the player to purchase ingredients, allowing numeric inout for quantities, dynamically updating the total cost, enforcing available funds, has "Purhcase" button to confirm ourchases, and a "View Recipe" button view cookie recipe. |
| **RecipeBookScreen.ts** | Displays the cookie recipe with required ingredients per cookie and the player's current inventory. Provides a "Back" button to return to the previous screen. |
| **BakingMinigame.ts** | Implements the math-based baking minigame where players solve division problems to speed up baking process that will earn them tips. Handles UI setup, keyboard input, problem generation, timing, scoring, and transitions between an baking animation and the interctive gameplay phase.|
| **CleaningMinigame.ts** | Implements the cleaning-themed multiplication minigame where players solve math problems to clean dishes and affect next day's demand. Manages UI rendering, poblem generation, timer countdown, scoring, and dish progress tracking, ending when time runs out or all dishes are cleaned.|
| **DaySummaryScreen.ts** | Displays an intercative End-Of-Day summary screen using Konva. It shows th eplayer's daily sales, expenses, profit, and remaining funds, along with a "Continue" button to proceed. Handles UI layout scaling based on screen size and provides simple visual feedbacks such as color cahanges and hover effects for the button.|
| **config.ts** | Manages all configurable game parameters such as time limits, prices, and win/loss thresholds. SUpports loading and parsing an external configuration file (debug_mode.txt) to override default settings fro debugging or balancing gamepplay.|
| **types.ts** | Defines enums, and interfaces for the game, including GamePhase for tracking the current phase, Ingredient and Bread structures, GameCofing for game settings and MinigameResult for minigame outcomes. |
| **main.ts** | Entry point of the game. Initializes configuration settings via ConfigManager, then creates and launches the main GameManager instance inside the HTML element with ID game-controller, starting the full game flow. |

---

## Configuration Settings

All adjustable game parameters are stored in **`debug_mode.txt`** for testing, debugging, and balancing gameplay.

| Parameter | Description |
|------------|--------------|
| **STARTING_FUNDS** | Player’s initial amount of money at the start of the game. |
| **WIN_THRESHOLD** | Target cash balance required for the player to win. |
| **BANKRUPTCY_THRESHOLD** | Balance limit that triggers game over or loss. |
| **FLOUR_PRICE_MIN / MAX** | Randomized daily price range for flour. |
| **BAKING_TIME** | Duration of the baking animation/process (in seconds).|
| **CLEANING_TIME** | Duration of the cleaning minigame (in seconds). |
| **MAX_COOKIE_CAPACITY** | Maximum number of cookies that can be baked per batch. |
| **COOKIE_PRICE** | Sale price of a single cookie. |

### Notes
- Modify **`debug_mode.txt`** for quick iteration and testing.  
- Keep configuration values balanced to ensure fair gameplay progression.  
- The **config.ts** file loads these values asynchronously and propagates them across the game’s systems.

---

## Technical Notes
- **Game Flow Management:** Controlled by `GameManager.ts`, which coordinates screen transitions and day cycles.  
- **UI System:** All screens (homepage, order, shopping, etc.) are modular and responsive.  
- **Input System:** Keyboard and mouse interactions are handled with real-time visual feedback.  
- **Rendering:** Konva.js is used for layered animations and sprite management.  
- **Data Handling:** Financial and ingredient tracking handled via in-memory state objects.  
- **Scalability:** New minigames or screens can be added easily through the modular screen architecture.

---

## Future Technical Improvements
- Integrate persistent storage (local or cloud save).  
- Add audio and background music system.  
- Improve UI responsiveness for mobile devices.  
- Refactor configuration loader to support JSON format.  
