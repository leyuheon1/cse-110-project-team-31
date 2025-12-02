# Testing Pipeline Explanation

## Table of Contents
1. [Overview](#overview)
2. [Testing Framework: Vitest](#testing-framework-vitest)
3. [Running Tests](#running-tests)
4. [Test Configuration](#test-configuration)
5. [Test Files Structure](#test-files-structure)
6. [Testing Patterns](#testing-patterns)
7. [Coverage Reports](#coverage-reports)
8. [CI/CD Integration](#cicd-integration)
9. [Test Categories](#test-categories)
10. [How to Explain Tests to TA](#how-to-explain-tests-to-ta)

---

## Overview

This project uses **Vitest** as its testing framework. Vitest is a fast, modern test runner built for Vite projects, providing:
- **Fast execution** with smart parallelization
- **Jest-compatible API** (describe, test, expect, etc.)
- **Built-in code coverage** using V8 provider
- **TypeScript support** out of the box
- **DOM testing** via jsdom environment

**Testing Philosophy:**
- Unit tests for individual components/functions
- Integration tests for screen interactions
- Coverage-driven development (aim for high coverage)

---

## Testing Framework: Vitest

### Why Vitest?

1. **Native Vite Integration**: Works seamlessly with our Vite build setup
2. **Speed**: Up to 10x faster than Jest for Vite projects
3. **Modern**: ESM support, TypeScript, top-level await
4. **Familiar API**: Drop-in replacement for Jest

### Key Dependencies

From `package.json`:
```json
{
  "devDependencies": {
    "@vitest/coverage-v8": "^4.0.8",  // Code coverage provider
    "vitest": "^4.0.7",                // Test runner
    "jsdom": "^27.1.0",                // DOM simulation for browser APIs
    "canvas": "^3.2.0"                 // Canvas API for Konva.js tests
  }
}
```

---

## Running Tests

### Available npm Scripts

From `package.json`:
```json
{
  "scripts": {
    "test": "vitest run",              // Run all tests once
    "test:coverage": "vitest run --coverage"  // Run with coverage report
  }
}
```

### Command Breakdown

#### 1. `npm test`
```bash
npm test
```

**What it does:**
- Runs `vitest run` command
- Executes all `*.test.ts` files in `src/`
- Runs tests **once** and exits (CI-friendly)
- Displays pass/fail summary

**Output example:**
```
✓ src/AnimationPlayer.test.ts (8 tests)
✓ src/BakingMinigame.test.ts (12 tests)
✓ src/CleaningMinigame.test.ts (10 tests)
...

Test Files  24 passed (24)
     Tests  156 passed (156)
  Start at  10:23:45
  Duration  3.42s
```

#### 2. `npm run test:coverage`
```bash
npm run test:coverage
```

**What it does:**
- Runs all tests
- Generates code coverage report
- Creates `coverage/` directory with:
  - `coverage/index.html` (interactive HTML report)
  - Coverage percentages for each file
- Shows coverage summary in terminal

**Output example:**
```
 % Coverage report from v8
-------------------|---------|----------|---------|---------|
File               | % Stmts | % Branch | % Funcs | % Lines |
-------------------|---------|----------|---------|---------|
All files          |   85.32 |    76.45 |   82.18 |   85.32 |
 AnimationPlayer   |   92.50 |    85.71 |   90.00 |   92.50 |
 BakingMinigame    |   88.24 |    80.00 |   85.00 |   88.24 |
 GameManager       |   78.45 |    65.22 |   75.00 |   78.45 |
 ...
-------------------|---------|----------|---------|---------|
```

**Coverage Metrics Explained:**
- **% Stmts** (Statements): Percentage of code lines executed
- **% Branch**: Percentage of if/else branches tested
- **% Funcs**: Percentage of functions called
- **% Lines**: Percentage of source lines covered

---

## Test Configuration

### vitest.config.mjs

Located at project root, this configures how tests run:

```javascript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    maxWorkers: 1,      // Use only 1 worker thread
    minWorkers: 1,      // Minimum 1 worker
    pool: "forks",      // Use fork pool (isolates tests)
    poolOptions: {
      forks: {
        singleFork: true,  // Force single process execution
      },
    },
    coverage: {
      provider: "v8",              // V8 coverage engine (faster than Istanbul)
      reporter: ["text", "html"],  // Output formats
      reportsDirectory: "./coverage",  // Where to save reports
    },
  },
});
```

### Configuration Explanation

**Why `singleFork: true`?**
- Konva.js canvas tests can have conflicts when running in parallel
- Single fork ensures tests run sequentially
- Prevents race conditions in DOM manipulation

**Coverage Providers:**
- **V8**: Native V8 engine coverage (faster, more accurate)
- **Istanbul**: Alternative provider (more features but slower)

**Reporters:**
- **text**: Terminal output (shown when you run tests)
- **html**: Interactive web page (`coverage/index.html`)

---

## Test Files Structure

### Naming Convention

All test files follow the pattern: `<ComponentName>.test.ts`

Examples:
- `AnimationPlayer.test.ts` → Tests for `AnimationPlayer.ts`
- `BakingMinigame.test.ts` → Tests for `BakingMinigame.ts`
- `GameManager.test.ts` → Tests for `GameManager.ts`

### Test File Count

Total test files in `src/`:
```
src/
├── AnimationPlayer.test.ts
├── BakingMinigame.test.ts
├── CleaningMinigame.test.ts
├── config.test.ts
├── DaySummaryScreen.test.ts
├── GameManager.test.ts
├── GameManager.coverage.test.ts  ← Additional coverage tests
├── HowToPlayScreen.test.ts
├── LoginScreen.test.ts
├── LoseScreen.test.ts
├── main.test.ts
├── OrderScreen.test.ts
├── RecipeBookScreen.test.ts
├── SavingsTracker.test.ts
├── ShoppingScreen.test.ts
├── ShoppingScreen2.test.ts
├── StoryScreen.test.ts
├── types.test.ts
├── VictoryScreen.test.ts
├── uiCoverage.test.ts             ← UI components coverage
└── ui/
    ├── ExitButton.test.ts
    ├── InfoButton.test.ts
    ├── ShuffleButton.test.ts
    └── Volumeslider.test.ts
```

**Total**: ~24 test files covering all major components

---

## Testing Patterns

### 1. Basic Test Structure

Every test file follows this pattern:

```typescript
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
    // Setup before each test
    beforeEach(() => {
        // Initialize DOM, create mocks, etc.
    });

    // Cleanup after each test
    afterEach(() => {
        // Clear mocks, destroy DOM, etc.
    });

    test('should do something specific', () => {
        // Arrange: Set up test data
        const input = ...;

        // Act: Execute code under test
        const result = component.method(input);

        // Assert: Verify expected outcome
        expect(result).toBe(expectedValue);
    });
});
```

### 2. DOM Setup for Konva Tests

Many tests need to set up a canvas environment:

```typescript
beforeEach(() => {
    // Create container div for Konva stage
    const container = document.createElement('div');
    container.id = 'game-container';
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    // Create Konva Stage
    stage = new Konva.Stage({
        container: 'game-container',
        width: 800,
        height: 600,
    });

    layer = new Konva.Layer();
    stage.add(layer);
});

afterEach(() => {
    // Cleanup
    stage.destroy();
    document.body.innerHTML = '';
});
```

DOM : 
The Document Object Model (DOM) connects web pages to scripts or programming languages by representing the structure of a document—such as the HTML representing a web page—in memory. Usually it refers to JavaScript, even though modeling HTML, SVG, or XML documents as objects are not part of the core JavaScript language.

The DOM represents a document with a logical tree. Each branch of the tree ends in a node, and each node contains objects. DOM methods allow programmatic access to the tree. With them, you can change the document's structure, style, or content.

Nodes can also have event handlers attached to them. Once an event is triggered, the event handlers get executed.


### 3. Callback Testing Pattern

Used for testing screen transitions:

```typescript
test('should call onComplete callback when button clicked', () => {
    // Create mock callback
    const mockCallback = vi.fn();

    // Create screen with callback
    new LoginScreen(stage, layer, mockCallback);

    // Find and click button
    const button = layer.findOne('.login-button');
    button.fire('click');

    // Verify callback was called
    expect(mockCallback).toHaveBeenCalled();
});
```

vi.fn :
Creates a spy on a function, but can also be initiated without one. Every time a function is invoked, it stores its call arguments, returns, and instances. Additionally, you can manipulate its behavior with methods. If no function is given, mock will return undefined when invoked.

callback : 
A callback function is a function passed into another function as an argument, which is then invoked inside the outer function to complete some kind of routine or action.

### 4. Timer/Animation Testing

Testing time-dependent code:

```typescript
import { vi } from 'vitest';

test('should update timer every second', () => {
    // Use fake timers
    vi.useFakeTimers();

    const minigame = new BakingMinigame(stage, layer, 10, vi.fn());

    // Advance time by 1 second
    vi.advanceTimersByTime(1000);

    // Check timer updated
    expect(minigame.getTimeRemaining()).toBe(59);

    // Cleanup
    vi.useRealTimers();
});
```

### 5. Event Simulation

Testing keyboard/mouse interactions:

```typescript
test('should handle keyboard input', () => {
    const screen = new ShoppingScreen(...);

    // Simulate typing '5'
    const event = new KeyboardEvent('keydown', { key: '5' });
    window.dispatchEvent(event);

    // Verify input updated
    const inputText = layer.findOne('.input-text');
    expect(inputText.text()).toBe('5');
});
```

---

## Coverage Reports

### Viewing Coverage Reports

After running `npm run test:coverage`:

1. **Terminal Output**: Shows coverage summary immediately
2. **HTML Report**: Open `coverage/index.html` in browser

### HTML Report Features

The `coverage/index.html` provides:
- **File explorer**: Click through your source files
- **Line-by-line coverage**: See which lines were executed
- **Color coding**:
  - **Green**: Lines covered by tests
  - **Red**: Lines NOT covered
  - **Yellow**: Partially covered branches
- **Coverage percentages** for each file
- **Drill-down**: Click any file to see detailed coverage

### Example Coverage View

```
coverage/
├── index.html                    ← Main report (start here)
├── AnimationPlayer.ts.html       ← Detailed coverage for this file
├── BakingMinigame.ts.html
├── GameManager.ts.html
└── ...
```

**To view:**
```bash
npm run test:coverage
# Wait for tests to complete
# Then open coverage/index.html in your browser
```

---

## CI/CD Integration

### GitHub Actions Workflow

File: `.github/workflows/ci.yml`

This file defines automated testing that runs on GitHub:

```yaml
name: Run Trivial Tests

on:
  # Trigger 1: Run on pushes to main branch
  push:
    branches: [ "main" ]

  # Trigger 2: Allow manual runs from Actions tab
  workflow_dispatch:

jobs:
  build-and-test:
    runs-on: ubuntu-latest  # Run on Ubuntu Linux VM

    steps:
      # Step 1: Download repository code
      - name: Checkout code
        uses: actions/checkout@v4

      # Step 2: Install Node.js v20
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      # Step 3: Install project dependencies
      - name: Install dependencies
        run: npm install

      # Step 4: Run tests
      - name: Run tests
        run: npm test
```

### How CI Works

**Workflow:**
```
1. Developer pushes code to main branch
       ↓
2. GitHub detects push event
       ↓
3. Workflow starts on Ubuntu VM
       ↓
4. VM checks out repository code
       ↓
5. VM installs Node.js v20
       ↓
6. VM runs `npm install` (installs dependencies)
       ↓
7. VM runs `npm test` (executes all tests)
       ↓
8. If tests PASS → Green checkmark ✅
   If tests FAIL → Red X ❌
       ↓
9. Results visible on GitHub commit/PR
```

### Viewing CI Results

On GitHub:
1. Go to repository
2. Click "Actions" tab
3. See all workflow runs
4. Click any run to see detailed logs
5. Green ✅ = All tests passed
6. Red ❌ = Some tests failed (expand to see which)

---

## Test Categories

### 1. Unit Tests (Component Logic)

**Purpose**: Test individual components in isolation

**Example: `AnimationPlayer.test.ts`**
```typescript
test('should load images correctly', async () => {
    const player = new AnimationPlayer(layer, imagePaths, 2, 0, 0, 800, 600);
    await player.load();
    expect(player.getIsLoaded()).toBe(true);
});

test('should advance frames at correct rate', () => {
    vi.useFakeTimers();
    const player = new AnimationPlayer(layer, imagePaths, 2, 0, 0, 800, 600);
    player.start();

    vi.advanceTimersByTime(500);  // Half a second
    expect(player.getCurrentFrame()).toBe(1);

    vi.useRealTimers();
});
```

**Tests:**
- Frame loading
- Animation playback
- Loop functionality
- Cleanup/destruction

### 2. Screen Tests (UI Rendering)

**Purpose**: Verify screens render correctly and handle interactions

**Example: `LoginScreen.test.ts`**
```typescript
test('should render input box and button', () => {
    new LoginScreen(stage, layer, vi.fn());

    const inputBox = layer.findOne('Rect');
    const button = layer.findOne('Group');

    expect(inputBox).toBeDefined();
    expect(button).toBeDefined();
});

test('should call callback with username on submit', () => {
    const mockCallback = vi.fn();
    new LoginScreen(stage, layer, mockCallback);

    // Simulate typing 'Alice'
    // ... keyboard events ...

    // Click submit button
    const button = layer.findOne('.start-button');
    button.fire('click');

    expect(mockCallback).toHaveBeenCalledWith('Alice');
});
```

**Tests:**
- UI elements render
- User input handling
- Callback execution
- Cleanup on transition

### 3. Minigame Tests (Game Logic)

**Purpose**: Verify minigame mechanics, scoring, timers

**Example: `BakingMinigame.test.ts`**
```typescript
test('should generate correct division problems', () => {
    const minigame = new BakingMinigame(stage, layer, 10, vi.fn());
    const problem = minigame.getCurrentProblem();

    // Problem should be valid division
    expect(problem.question).toMatch(/\d+ ÷ \d+/);
    expect(problem.answer).toBeGreaterThan(0);
});

test('should award $5 per correct answer', () => {
    const callback = vi.fn();
    const minigame = new BakingMinigame(stage, layer, 10, callback);

    // Solve 3 problems correctly
    minigame.submitAnswer(correctAnswer1);
    minigame.submitAnswer(correctAnswer2);
    minigame.submitAnswer(correctAnswer3);

    minigame.endGame();

    // Should have earned $15 in tips
    expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ correctAnswers: 3 }),
        false
    );
    // Tips = 3 × $5 = $15 (calculated in GameManager)
});
```

**Tests:**
- Problem generation
- Answer validation
- Score tracking
- Timer functionality
- Skip/play choice

### 4. Integration Tests (GameManager)

**Purpose**: Test component interactions and game flow

**Example: `GameManager.test.ts`**
```typescript
test('should calculate cookie cost correctly', () => {
    const manager = new GameManager(container);

    // Cost = (Flour 3×$0.5) + (Sugar 1×$0.75) + (Butter 8×$0.25)
    //        + (Chocolate 1×$3) + (Baking Soda 2×$0.5)
    //      = $1.5 + $0.75 + $2 + $3 + $1 = $8.25

    const cost = manager['getCostOfOneCookie']();
    expect(cost).toBe(8.25);
});

test('should transition from LOGIN to STORYLINE', () => {
    const manager = new GameManager(container);

    expect(manager['currentPhase']).toBe(GamePhase.LOGIN);

    // Simulate login completion
    manager['player'].username = 'TestUser';
    manager['currentPhase'] = GamePhase.STORYLINE;

    expect(manager['currentPhase']).toBe(GamePhase.STORYLINE);
});
```

**Tests:**
- Phase transitions
- Economic calculations
- Bankruptcy detection
- Win/lose conditions
- Audio system

### 5. Configuration Tests

**Example: `config.test.ts`**
```typescript
test('should load config from file', async () => {
    // Mock fetch to return config
    global.fetch = vi.fn().mockResolvedValue({
        text: () => Promise.resolve('STARTING_FUNDS=1000\nWIN_THRESHOLD=500')
    });

    const manager = ConfigManager.getInstance();
    await manager.loadConfig();
    const config = manager.getConfig();

    expect(config.startingFunds).toBe(1000);
    expect(config.winThreshold).toBe(500);
});

test('should use defaults if config file missing', async () => {
    // Mock fetch failure
    global.fetch = vi.fn().mockRejectedValue(new Error('Not found'));

    const manager = ConfigManager.getInstance();
    await manager.loadConfig();
    const config = manager.getConfig();

    expect(config.startingFunds).toBe(500);  // Default value
});
```

**Tests:**
- Config file parsing
- Default value fallback
- Singleton pattern
- Value validation

### 6. Type Tests

**Example: `types.test.ts`**
```typescript
test('GamePhase enum should have correct values', () => {
    expect(GamePhase.LOGIN).toBe(0);
    expect(GamePhase.STORYLINE).toBe(1);
    expect(GamePhase.VICTORY).toBe(13);
});

test('PlayerState interface should be valid', () => {
    const player: PlayerState = {
        username: 'Test',
        funds: 500,
        ingredients: new Map(),
        breadInventory: [],
        maxBreadCapacity: 20,
        currentDay: 1,
        dishesToClean: 0,
        reputation: 1.0,
        currentDayDemand: 0,
    };

    expect(player.username).toBe('Test');
    expect(player.funds).toBe(500);
});
```

**Tests:**
- Enum values
- Interface structure
- Type compatibility

---

## How to Explain Tests to TA

### 1. **Show the Test Command**

**Demo:**
```bash
# In terminal, run:
npm test
```

**Explain:**
> "This command runs our entire test suite using Vitest. Vitest is a modern testing framework that's optimized for Vite projects. It executes all `*.test.ts` files in our `src/` folder and shows us which tests pass or fail."

### 2. **Show Coverage Report**

**Demo:**
```bash
# Run coverage:
npm run test:coverage

# Then open the HTML report:
# On Windows: start coverage/index.html
# On Mac: open coverage/index.html
# On Linux: xdg-open coverage/index.html
```

**Explain:**
> "Code coverage tells us what percentage of our code is tested. The HTML report lets us drill down into each file to see exactly which lines are covered (green) and which aren't (red). Higher coverage means we've tested more of our code paths."

### 3. **Walk Through a Test File**

**Pick a simple example**: `AnimationPlayer.test.ts`

**Show structure:**
```typescript
describe('AnimationPlayer', () => {
    // This groups all AnimationPlayer tests together

    beforeEach(() => {
        // Setup: Create DOM and Konva stage before each test
    });

    test('should load images successfully', async () => {
        // Arrange: Create animation player
        const player = new AnimationPlayer(...);

        // Act: Load images
        await player.load();

        // Assert: Verify images loaded
        expect(player.getIsLoaded()).toBe(true);
    });
});
```

**Explain:**
> "Each test file has a `describe` block that groups related tests. `beforeEach` runs setup code before every test. Each `test` follows the Arrange-Act-Assert pattern: set up data, execute the code, then verify the result with `expect`."

### 4. **Explain Testing Patterns**

**Pattern 1: Callback Testing**
```typescript
test('should call onComplete when finished', () => {
    const mockCallback = vi.fn();  // Create mock function
    const screen = new LoginScreen(stage, layer, mockCallback);

    // Trigger completion
    screen.finishLogin();

    expect(mockCallback).toHaveBeenCalled();
});
```
> "We use `vi.fn()` to create mock functions. This lets us verify that callbacks are called correctly when events happen."

**Pattern 2: Timer Testing**
```typescript
test('should countdown timer', () => {
    vi.useFakeTimers();  // Replace real timers with fake ones
    const minigame = new BakingMinigame(...);

    vi.advanceTimersByTime(1000);  // Simulate 1 second passing

    expect(minigame.getTimeRemaining()).toBe(59);
    vi.useRealTimers();
});
```
> "We use fake timers to test time-dependent code without actually waiting. `advanceTimersByTime` instantly jumps forward in time."

### 5. **Explain CI/CD Integration**

**Show GitHub Actions:**
> "Every time we push code to the main branch, GitHub automatically runs our tests. You can see the results in the 'Actions' tab. Green checkmarks mean all tests passed; red X's mean something broke. This ensures we don't merge broken code."

**Show `.github/workflows/ci.yml`:**
> "This YAML file tells GitHub what to do: check out code, install Node.js, install dependencies, and run tests. It's like having a robot teammate that tests every change automatically."

### 6. **Coverage Metrics Explained**

When TA asks "What does 85% coverage mean?":

> "Coverage has four metrics:
> - **Statements**: 85% of our code lines were executed during tests
> - **Branches**: 76% of if/else paths were tested
> - **Functions**: 82% of functions were called
> - **Lines**: 85% of lines (same as statements but excludes comments)
>
> Higher is better, but 100% isn't always necessary. We focus on critical paths like game logic, state management, and user interactions."

### 7. **Demo a Test Failure**

**Temporarily break a test:**
```typescript
// Change this:
expect(cost).toBe(8.25);

// To this:
expect(cost).toBe(10.00);  // Wrong value
```

**Run tests:**
```bash
npm test
```

**Show failure output:**
```
FAIL src/GameManager.test.ts
  ✕ should calculate cookie cost correctly (2ms)

  Expected: 10.00
  Received: 8.25
```

**Explain:**
> "When a test fails, Vitest shows exactly what went wrong: which test failed, what value we expected, and what we actually got. This helps us quickly identify and fix bugs."

---

## Summary for TA Presentation

### Key Points to Cover

1. **Testing Framework**: "We use Vitest, a modern test runner built for Vite projects."

2. **Test Commands**:
   - `npm test` → Run all tests
   - `npm run test:coverage` → Run tests + generate coverage report

3. **Test Structure**: "Each component has a corresponding `.test.ts` file testing its functionality."

4. **Coverage**: "We track code coverage to ensure our tests exercise most of our code. The HTML report shows exactly which lines are tested."

5. **CI/CD**: "GitHub Actions automatically runs tests on every push, preventing broken code from being merged."

6. **Testing Patterns**: "We use mocks for callbacks, fake timers for time-dependent code, and DOM simulation for UI testing."

### Quick Demo Script

1. Open terminal
2. Run `npm test` → Show all tests passing
3. Run `npm run test:coverage` → Show coverage summary
4. Open `coverage/index.html` → Navigate through files
5. Open `.github/workflows/ci.yml` → Explain automation
6. Open a test file (e.g., `LoginScreen.test.ts`) → Walk through structure
7. Show GitHub Actions tab → Point out automated runs

**Time**: ~5-7 minutes

---

## Conclusion

The testing pipeline provides:
- **Automated testing** via `npm test`
- **Coverage tracking** via `npm run test:coverage`
- **CI/CD integration** via GitHub Actions
- **Comprehensive test suite** covering all major components

This ensures code quality, catches bugs early, and maintains confidence when making changes.
