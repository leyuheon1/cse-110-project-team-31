/**
 * CleaningMinigame.ts - Multiplication Problem Minigame for Reputation Management
 *
 * PURPOSE:
 * An interactive math minigame where players solve multiplication problems to clean dirty dishes.
 * Part of the CLEANING phase in the game loop. Performance affects reputation and incurs fines.
 *
 * VISUAL APPEARANCE:
 * 1. CHOICE MODAL: "Would you like to play?" with PLAY/SKIP buttons
 * 2. MINIGAME UI:
 *    - Title: "Cleaning Minigame - Solve Problems to Clean!"
 *    - Timer: Countdown in seconds (changes color when low)
 *    - Problem: Large multiplication equation (e.g., "7 × 8")
 *    - Input Box: Player types answer
 *    - Score: "Dishes Cleaned: X / 5"
 *    - Shuffle Button: Skip current problem
 *    - Exit/Info Buttons: Quit or view instructions
 * 3. RESULTS POPUP: Shows dishes cleaned and mistakes
 *
 * GAME MECHANICS:
 * - Time Limit: 60 seconds (configurable via config.cleaningTime)
 * - Problem Type: Multiplication (num1 × num2 = product)
 * - Target: Clean 5 dishes (fixed, regardless of actual dirty dishes)
 * - Reward for Playing: +0.05 reputation (even if not all dishes cleaned)
 * - Penalty for Skipping: -0.2 reputation + $50 fine
 * - Fines: $10 per leftover dirty dish (originalDishes - correctAnswers)
 * - Auto-Complete: Minigame ends when 5 dishes cleaned (even if time remains)
 *
 * PROBLEM GENERATION ALGORITHM:
 * 1. Choose random num1 (1-12)
 * 2. Choose random num2 (1-12)
 * 3. Calculate product = num1 × num2
 * 4. Display: "num1 × num2 = ?"
 * Example: num1=7, num2=8 → "7 × 8 = ?" (answer: 56)
 *
 * DISH CLEANING SYSTEM:
 * - originalTotalDishes: Actual dishes from cookies sold (e.g., 7)
 * - totalDishesToClean: Fixed target of 5 (TARGET_DISHES constant)
 * - dishesCleaned: Counter incremented on correct answer
 * - If player completes 5 dishes, report originalTotalDishes as cleaned
 * - If player fails/skips, report actual dishesCleaned count
 *
 * REPUTATION & FINES (handled in GameManager):
 * - SKIP: reputation -0.2, fine $50
 * - PLAY: reputation +0.05, fine $10 × leftover dishes
 *
 * USAGE:
 * const minigame = new CleaningMinigame(stage, layer, dishesToClean, (result, skipped) => {
 *     console.log(`Cleaned ${result.correctAnswers} dishes!`);
 *     // Update reputation, apply fines, transition to next phase
 * });
 *
 * FLOW:
 * 1. Constructor → Show Play/Skip choice immediately (no intro animation)
 * 2a. Player clicks PLAY → Show minigame UI, start timer
 * 2b. Player clicks SKIP → End minigame with 0 dishes cleaned
 * 3. Player solves problems until 5 dishes cleaned OR time expires
 * 4. Show results popup with dishes cleaned and mistakes
 * 5. Player clicks CONTINUE → Call onComplete callback
 *
 * NOTE: No intro animation (unlike BakingMinigame which has 6-frame animation)
 */

import Konva from 'konva';
import { MinigameResult } from './types';
import { ConfigManager } from './config';
import { ExitButton } from './ui/ExitButton';
import { InfoButton } from './ui/InfoButton';
import { ShuffleButton } from './ui/ShuffleButton';

/**
 * Mistake Interface
 *
 * Tracks incorrect answers to display in results popup.
 */
interface Mistake {
    question: string;        // The multiplication problem (e.g., "7 × 8")
    userAnswer: string;      // What the player typed
    correctAnswer: number;   // The correct answer
}

/**
 * CleaningMinigame Class
 *
 * Interactive multiplication problem minigame for cleaning dishes and managing reputation.
 * Manages UI, timer, problem generation, and dish cleaning progress.
 */
export class CleaningMinigame {
    // ==============================
    // KONVA RENDERING
    // ==============================

    /** Konva layer where all UI elements are drawn */
    private layer: Konva.Layer;

    /** Konva stage (canvas) */
    private stage: Konva.Stage;

    /** Game configuration (contains cleaningTime, etc.) */
    private config = ConfigManager.getInstance().getConfig();

    // ==============================
    // GAME STATE
    // ==============================

    /** Time remaining in seconds (counts down from config.cleaningTime, default 60) */
    private timeRemaining: number;

    /** Current multiplication problem being displayed */
    private currentProblem!: { question: string; answer: number };

    /** Number of correct answers (dishes cleaned) */
    private correctAnswers: number = 0;

    /** Total problems attempted (correct + incorrect) */
    private totalProblems: number = 0;

    /** Array of incorrect answers to display in results popup */
    private mistakes: Mistake[] = [];

    // ==============================
    // UI GROUPS & ELEMENTS
    // ==============================

    /** Konva Group containing the main minigame UI (problem, input, timer, etc.) */
    private minigameUIGroup: Konva.Group;

    /** Konva Group containing the Play/Skip choice modal */
    private choiceUIGroup: Konva.Group;

    /** Konva Group containing the results popup (created when time expires or target reached) */
    private resultsUIGroup: Konva.Group | null = null;

    /** Timer text (changes color when time is low) */
    private timerText!: Konva.Text;

    /** Problem text (large multiplication equation like "7 × 8") */
    private problemText!: Konva.Text;

    /** Score text ("Dishes Cleaned: X / 5") */
    private scoreText!: Konva.Text;

    /** Feedback text ("Clean! +1 Dish ✓" or "Still Dirty! ✗") */
    private feedbackText!: Konva.Text;

    /** Input text (displays what player has typed) */
    private inputText!: Konva.Text;

    /** Shuffle button (allows skipping current problem) */
    private shuffleButton!: ShuffleButton;

    // ==============================
    // INPUT & EVENT HANDLING
    // ==============================

    /** Current user input (player's typed answer) */
    private userInput: string = '';

    /** Timer interval ID (used to clear interval on cleanup) */
    private timerInterval: number | null = null;

    /** Callback function called when minigame ends (play or skip) */
    private onComplete: (result: MinigameResult, skipped: boolean) => void;

    /** Reference to keyboard handler (for cleanup) */
    private keyboardHandler: (e: KeyboardEvent) => void;

    // ==============================
    // DISH CLEANING TRACKING
    // ==============================

    /**
     * Target number of dishes to clean in minigame (always 5)
     * This is the goal the player must reach to complete the minigame
     */
    private totalDishesToClean: number;

    /**
     * Original number of dirty dishes from cookies sold
     * Used for fine calculation if player doesn't complete minigame
     * Example: Player sold 7 cookies → 7 dishes dirty
     */
    private originalTotalDishes: number;

    /**
     * Number of dishes cleaned so far (incremented on correct answer)
     * When this reaches TARGET_DISHES (5), minigame ends successfully
     */
    private dishesCleaned: number = 0;

    /**
     * Fixed target for dish cleaning (always 5 dishes)
     * Simplifies minigame - player always cleans 5 dishes regardless of actual amount
     */
    private readonly TARGET_DISHES = 5;

    /**
     * Constructor
     *
     * Initializes the cleaning minigame and shows Play/Skip choice modal.
     * Unlike BakingMinigame, there is NO intro animation.
     *
     * INITIALIZATION STEPS:
     * 1. Store references to stage, layer
     * 2. Set original dishes count (for fine calculation)
     * 3. Set target dishes to 5 (fixed goal)
     * 4. Set time remaining from config
     * 5. Create UI groups (initially hidden)
     * 6. Show Play/Skip choice modal immediately
     *
     * DISH CLEANING LOGIC:
     * - originalTotalDishes: Actual dishes (e.g., 7 from cookies sold)
     * - totalDishesToClean: Always 5 (TARGET_DISHES)
     * - If player cleans 5 dishes → report originalTotalDishes as cleaned
     * - If player fails → report actual dishesCleaned count
     *
     * @param stage - Konva Stage (canvas)
     * @param layer - Konva Layer to add UI to
     * @param totalDishesToClean - Original number of dirty dishes (from cookies sold)
     * @param onComplete - Callback when minigame ends (result, skipped)
     */
    constructor(
        stage: Konva.Stage,
        layer: Konva.Layer,
        totalDishesToClean: number,
        onComplete: (result: MinigameResult, skipped: boolean) => void
    ) {
        // Store constructor parameters
        this.stage = stage;
        this.layer = layer;

        // =============================
        // DISH TRACKING SETUP
        // =============================

        // Save original dishes count (for fine calculation)
        // Example: 7 cookies sold → 7 dishes dirty
        this.originalTotalDishes = totalDishesToClean;

        // Set target to fixed value (always clean 5 dishes)
        // Simplifies gameplay - consistent difficulty
        this.totalDishesToClean = this.TARGET_DISHES;

        // =============================
        // CALLBACK & TIMER SETUP
        // =============================

        // Store completion callback
        this.onComplete = onComplete;

        // Set initial time from config (default 60 seconds)
        this.timeRemaining = this.config.cleaningTime;

        // Bind keyboard handler to this instance (for cleanup)
        this.keyboardHandler = this.handleKeyPress.bind(this);

        // =============================
        // CREATE UI GROUPS (HIDDEN)
        // =============================

        // Create minigame UI group (hidden until player clicks PLAY)
        this.minigameUIGroup = new Konva.Group({ visible: false, name: 'minigameUI' });

        // Create choice UI group (hidden initially, shown in next step)
        this.choiceUIGroup = new Konva.Group({ visible: false, name: 'choiceUI' });

        // Add groups to layer
        this.layer.add(this.minigameUIGroup);
        this.layer.add(this.choiceUIGroup);

        // =============================
        // SHOW PLAY/SKIP CHOICE
        // =============================

        // Show choice modal immediately (no intro animation like BakingMinigame)
        this.showPlaySkipChoice();
    }

    /**
     * Show Play/Skip Choice Modal
     *
     * Displays a modal asking "Would you like to play?"
     * Player can click PLAY to start minigame or SKIP to incur penalty.
     *
     * MODAL CONTENTS:
     * - Title: "CLEAN UP TIME!"
     * - Subtitle: "Minigame"
     * - Explanation: Dish count, reputation system, skip penalty
     * - PLAY button (green): Start minigame
     * - SKIP button (red): Skip minigame (reputation -0.2, fine $50)
     *
     * REPUTATION EXPLANATION:
     * - PLAY: Boosts reputation (+0.05), clean 5 dishes to finish
     * - SKIP: Hurts reputation (-0.2), customers get sick, $50 fine
     *
     * ACTIONS:
     * 1. Clear any existing children from choice UI group
     * 2. Create modal background and text
     * 3. Create PLAY and SKIP buttons with hover effects
     * 4. Show choice UI and redraw
     */
    private showPlaySkipChoice(): void {
        // Clear any existing children from choice UI group
        this.choiceUIGroup.destroyChildren();

        // =============================
        // MODAL DIMENSIONS
        // =============================

        // Get stage dimensions
        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        // Calculate modal size (70% of screen)
        const modalWidth = stageWidth * 0.7;
        const modalHeight = stageHeight * 0.7;

        // Center modal on screen
        const modalX = (stageWidth - modalWidth) / 2;
        const modalY = (stageHeight - modalHeight) / 2;

        // =============================
        // MODAL BACKGROUND
        // =============================

        // White rounded rectangle with red border and shadow
        const modalBg = new Konva.Rect({
            x: modalX,
            y: modalY,
            width: modalWidth,
            height: modalHeight,
            fill: '#FFFFFF',                             // White background
            cornerRadius: 15,                            // Rounded corners
            stroke: '#da5552',                           // Red border
            strokeWidth: 4,
            shadowColor: 'black',                        // Drop shadow for depth
            shadowBlur: 10,
            shadowOpacity: 0.3,
            shadowOffset: {x: 3, y: 3}
        });
        this.choiceUIGroup.add(modalBg);

        // =============================
        // TITLE TEXT
        // =============================

        // "CLEAN UP TIME!" in gold/orange with red stroke
        const titleText = new Konva.Text({
            x: modalX,
            y: modalY + modalHeight * 0.1,               // 10% from top of modal
            width: modalWidth,
            text: 'CLEAN UP TIME!',
            fontSize: Math.min(stageWidth * 0.035, 36),
            fontFamily: '"Press Start 2P"',              // Retro font
            fill: '#F39C12',                             // Gold/orange (matches Baking)
            align: 'center',
            stroke: '#da5552',                           // Red stroke outline
            strokeWidth: 2,
            shadowColor: 'black',                        // Text shadow
            shadowBlur: 2,
            shadowOffset: {x: 1, y: 1}
        });
        this.choiceUIGroup.add(titleText);

        // =============================
        // SUBTITLE TEXT
        // =============================

        // "Minigame" in smaller orange text
        const subTitle = new Konva.Text({
            x: modalX,
            y: titleText.y() + titleText.height() + 5,   // Below title
            width: modalWidth,
            text: 'Minigame',
            fontSize: Math.min(stageWidth * 0.015, 18),
            fontFamily: '"Press Start 2P"',
            fill: '#E67E22',                             // Darker orange
            align: 'center'
        });
        this.choiceUIGroup.add(subTitle);

        // =============================
        // EXPLANATION TEXT
        // =============================

        // Explanation of minigame mechanics, reputation system, and skip penalty
        const explainText = new Konva.Text({
            x: modalX + modalWidth * 0.1,                // 10% margin
            y: subTitle.y() + subTitle.height() + modalHeight * 0.05,
            width: modalWidth * 0.8,                     // 80% of modal width
            text: `You have ${this.originalTotalDishes} dishes to clean.\n\nPLAY: Cleaning boosts your reputation. Solve 5 problems to finish!\n\nSKIP: Customers get sick! This hurts your reputation and causes a fine.`,
            fontSize: Math.min(stageWidth * 0.022, 24),
            fill: '#333',                                // Dark gray
            align: 'center',
            lineHeight: 1.6,                             // Spacing between lines
            fontFamily: '"Nunito"',
            fontStyle: 'bold'
        });
        this.choiceUIGroup.add(explainText);

        // =============================
        // PROMPT TEXT
        // =============================

        // "Would you like to play?"
        const promptText = new Konva.Text({
            x: modalX,
            y: explainText.y() + explainText.height() + modalHeight * 0.04,
            width: modalWidth,
            text: 'Would you like to play?',
            fontSize: Math.min(stageWidth * 0.022, 22),
            fill: '#E67E22',                             // Orange
            align: 'center',
            fontFamily: '"Nunito"',
            fontStyle: 'bold'
        });
        this.choiceUIGroup.add(promptText);

        // =============================
        // BUTTON LAYOUT CALCULATION
        // =============================

        // Button dimensions (matches BakingMinigame layout)
        const buttonWidth = modalWidth * 0.2;
        const buttonHeight = modalHeight * 0.15;
        const buttonGap = modalWidth * 0.2;              // Space between buttons

        // Button Y position (near bottom of modal)
        const buttonY = modalY + modalHeight - buttonHeight - 40;

        // Calculate X positions relative to center of modal
        const modalCenterX = modalX + (modalWidth / 2);

        // Play button to the left of center
        const playButtonX = modalCenterX - buttonWidth - (buttonGap / 2);

        // Skip button to the right of center
        const skipButtonX = modalCenterX + (buttonGap / 2);

        // =============================
        // PLAY BUTTON (GREEN)
        // =============================

        // Green "PLAY" button
        const playButtonGroup = new Konva.Group({ x: playButtonX, y: buttonY });

        // Button rectangle (green background)
        const playRect = new Konva.Rect({
            width: buttonWidth,
            height: buttonHeight,
            fill: '#4CAF50',                             // Green
            cornerRadius: 10,                            // Rounded corners
            shadowColor: 'black',                        // Drop shadow
            shadowBlur: 5,
            shadowOpacity: 0.2,
            shadowOffset: {x: 2, y: 2}
        });

        // Button text ("PLAY")
        const playText = new Konva.Text({
            width: buttonWidth,
            height: buttonHeight,
            text: 'PLAY',
            fontSize: Math.min(stageWidth * 0.08, 24),
            fill: 'white',                               // White text
            align: 'center',
            verticalAlign: 'middle',                     // Center vertically
            fontFamily: '"Press Start 2P"',
            listening: false                             // Don't capture events (let rect handle)
        });

        // Add rect and text to button group
        playButtonGroup.add(playRect, playText);
        this.choiceUIGroup.add(playButtonGroup);

        // PLAY BUTTON CLICK EVENT: Start minigame
        playButtonGroup.on('click tap', (evt) => {
            evt.cancelBubble = true;                     // Prevent event propagation
            this.choiceUIGroup.visible(false);           // Hide choice modal
            this.showMinigameUI();                        // Show minigame UI and start game
        });

        // PLAY BUTTON HOVER EFFECT: Darken color
        playButtonGroup.on('mouseenter', () => {
            this.stage.container().style.cursor = 'pointer';  // Show pointer cursor
            playRect.fill('#45a049');                    // Darker green on hover
            this.layer.batchDraw();
        });

        // PLAY BUTTON LEAVE EFFECT: Restore color
        playButtonGroup.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';  // Restore default cursor
            playRect.fill('#4CAF50');                    // Restore original green
            this.layer.batchDraw();
        });

        // =============================
        // SKIP BUTTON (RED)
        // =============================

        // Red "SKIP" button
        const skipButtonGroup = new Konva.Group({ x: skipButtonX, y: buttonY });

        // Button rectangle (red background)
        const skipRect = new Konva.Rect({
            width: buttonWidth,
            height: buttonHeight,
            fill: '#e74c3c',                             // Red
            cornerRadius: 10,                            // Rounded corners
            shadowColor: 'black',                        // Drop shadow
            shadowBlur: 5,
            shadowOpacity: 0.2,
            shadowOffset: {x: 2, y: 2}
        });

        // Button text ("SKIP")
        const skipText = new Konva.Text({
            width: buttonWidth,
            height: buttonHeight,
            text: 'SKIP',
            fontSize: Math.min(stageWidth * 0.08, 24),
            fill: 'white',                               // White text
            align: 'center',
            verticalAlign: 'middle',                     // Center vertically
            fontFamily: '"Press Start 2P"',
            listening: false                             // Don't capture events (let rect handle)
        });

        // Add rect and text to button group
        skipButtonGroup.add(skipRect, skipText);
        this.choiceUIGroup.add(skipButtonGroup);

        // SKIP BUTTON CLICK EVENT: End minigame with 0 dishes cleaned
        skipButtonGroup.on('click tap', (evt) => {
            evt.cancelBubble = true;                     // Prevent event propagation
            this.choiceUIGroup.visible(false);           // Hide choice modal
            this.correctAnswers = 0;                     // Set correct answers to 0
            this.endMinigame(true);                      // End minigame (skipped = true)
        });

        // SKIP BUTTON HOVER EFFECT: Darken color
        skipButtonGroup.on('mouseenter', () => {
            this.stage.container().style.cursor = 'pointer';  // Show pointer cursor
            skipRect.fill('#c0392b');                    // Darker red on hover
            this.layer.batchDraw();
        });

        // SKIP BUTTON LEAVE EFFECT: Restore color
        skipButtonGroup.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';  // Restore default cursor
            skipRect.fill('#e74c3c');                    // Restore original red
            this.layer.batchDraw();
        });

        // =============================
        // SHOW CHOICE UI
        // =============================

        // Make choice UI visible
        this.choiceUIGroup.visible(true);

        // Redraw layer to show modal
        this.layer.batchDraw();
    }

    /**
     * Show Minigame UI
     *
     * Called when player clicks PLAY button.
     * Shows minigame UI, generates first problem, starts timer, and sets up input.
     *
     * ACTIONS:
     * 1. Show minigame UI group
     * 2. Setup all UI elements (problem, input, timer, buttons, etc.)
     * 3. Generate first multiplication problem
     * 4. Start countdown timer
     * 5. Setup keyboard input listeners
     * 6. Redraw layer
     */
    private showMinigameUI(): void {
        // Show minigame UI group
        this.minigameUIGroup.visible(true);

        // Create all UI elements (problem, input, timer, buttons, etc.)
        this.setupUI();

        // Generate first multiplication problem
        this.generateNewProblem();

        // Start countdown timer (1 second intervals)
        this.startTimer();

        // Setup keyboard input (listen for number keys, Enter, Backspace)
        this.setupKeyboardInput();

        // Redraw layer to show minigame UI
        this.layer.batchDraw();
    }

    /**
     * Setup UI Elements
     *
     * Creates all Konva elements for the minigame UI:
     * - Title text
     * - Score text (dishes cleaned progress)
     * - Problem text
     * - Input box and text
     * - Timer text
     * - Feedback text
     * - Instructions text
     * - Exit button
     * - Info button
     * - Shuffle button
     *
     * All elements are added to minigameUIGroup.
     */
    private setupUI(): void {
        // Get stage dimensions for responsive sizing
        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        // =============================
        // TITLE TEXT
        // =============================

        // "Cleaning Minigame - Solve Problems to Clean!"
        const title = new Konva.Text({
            x: 0,                                        // Centered via width
            y: stageHeight * 0.05,                       // 5% from top
            width: stageWidth,                           // Full width (for centering)
            text: 'Cleaning Minigame - Solve Problems to Clean!',
            fontSize: Math.min(stageWidth * 0.025, 24), // Responsive, max 24px
            fill: '#2c3e50',                             // Dark blue-gray
            fontStyle: 'bold',
            fontFamily: 'Press Start 2P',                // Retro game font
            align: 'center'                              // Center horizontally
        });
        this.minigameUIGroup.add(title);

        // =============================
        // SCORE TEXT
        // =============================

        // "Dishes Cleaned: X / 5" (updates as player answers correctly)
        this.scoreText = new Konva.Text({
            x: stageWidth * 0.43,                        // Slightly left of center
            y: stageHeight * 0.12,                       // Below title
            text: `Dishes Cleaned: ${this.dishesCleaned} / ${this.totalDishesToClean}`,  // Initial: 0 / 5
            fontSize: Math.min(stageWidth * 0.02, 24),  // Responsive, max 24px
            fontFamily: 'Nunito',                        // Clean modern font
            fill: '#34495e',                             // Dark gray
            align: 'center'
        });
        this.minigameUIGroup.add(this.scoreText);

        // =============================
        // PROBLEM TEXT
        // =============================

        // Large multiplication problem (e.g., "7 × 8")
        this.problemText = new Konva.Text({
            x: 0,                                        // Centered via width
            y: stageHeight * 0.3,                        // 30% from top
            width: stageWidth,                           // Full width (for centering)
            text: '',                                    // Empty initially (set when game starts)
            fontSize: Math.min(stageWidth * 0.048, 58), // Large, responsive
            fill: '#2c3e50',                             // Dark blue-gray
            fontStyle: 'bold',
            fontFamily: 'Nunito',
            align: 'center'                              // Center horizontally
        });
        this.minigameUIGroup.add(this.problemText);

        // =============================
        // INPUT BOX
        // =============================

        // Position and size of input box
        const inputBoxY = stageHeight * 0.4;            // 40% from top
        const inputBoxHeight = stageHeight * 0.08;      // 8% of screen height

        // Rectangle background for input box
        const inputBox = new Konva.Rect({
            x: stageWidth * 0.35,                        // 35% from left
            y: inputBoxY,
            width: stageWidth * 0.3,                     // 30% of screen width
            height: inputBoxHeight,
            fill: '#ecf0f1',                             // Light gray background
            stroke: '#3498db',                           // Blue border
            strokeWidth: 3,
            cornerRadius: 5                              // Slightly rounded corners
        });
        this.minigameUIGroup.add(inputBox);

        // =============================
        // INPUT TEXT
        // =============================

        // Text inside input box (displays player's typed answer)
        this.inputText = new Konva.Text({
            x: stageWidth * 0.35,                        // Same X as input box
            y: inputBoxY + (inputBoxHeight * 0.2),       // Vertically centered in box
            text: '',                                    // Empty initially
            fontSize: Math.min(stageWidth * 0.036, 44), // Large, readable
            fill: '#2c3e50',                             // Dark text
            width: stageWidth * 0.3,                     // Same width as box
            align: 'center'                              // Center horizontally
        });
        this.minigameUIGroup.add(this.inputText);

        // =============================
        // TIMER TEXT
        // =============================

        // Countdown timer ("Time: XXs")
        this.timerText = new Konva.Text({
            x: 0,                                        // Centered via width
            y: inputBoxY + inputBoxHeight + 15,          // Below input box
            width: stageWidth,                           // Full width (for centering)
            text: `Time: ${this.timeRemaining}s`,       // Initial time from config
            fontSize: Math.min(stageWidth * 0.024, 28), // Responsive
            fill: '#27ae60',                             // Green (changes to orange/red when low)
            fontStyle: 'bold',
            fontFamily: 'Nunito',
            align: 'center'
        });
        this.minigameUIGroup.add(this.timerText);

        // =============================
        // FEEDBACK TEXT
        // =============================

        // Feedback message ("Clean! +1 Dish ✓" or "Still Dirty! ✗")
        this.feedbackText = new Konva.Text({
            x: 0,                                        // Centered via width
            y: inputBoxY + inputBoxHeight + 60,          // Below timer
            width: stageWidth,                           // Full width (for centering)
            text: '',                                    // Empty initially
            fontSize: Math.min(stageWidth * 0.028, 34), // Large, visible
            fontFamily: 'Nunito',
            fill: '#27ae60',                             // Green for correct (changes to red for wrong)
            align: 'center'
        });
        this.minigameUIGroup.add(this.feedbackText);

        // =============================
        // INSTRUCTIONS TEXT
        // =============================

        // Instructions at bottom: "Type your answer and press ENTER"
        const instructions = new Konva.Text({
            x: 0,                                        // Centered via width
            y: stageHeight * 0.75,                       // 75% from top
            width: stageWidth,                           // Full width (for centering)
            text: 'Type your answer and press ENTER',
            fontSize: Math.min(stageWidth * 0.018, 22), // Medium size
            fill: '#7f8c8d',                             // Gray (less prominent)
            align: 'center',
            fontFamily: 'Nunito'
        });
        this.minigameUIGroup.add(instructions);

        // =============================
        // EXIT BUTTON (BOTTOM-LEFT)
        // =============================

        // Red EXIT button in bottom-left corner
        // Quits game and redirects to login
        new ExitButton(this.stage, this.layer, () => {
            this.cleanup();                              // Clean up timers and event listeners
            window.location.href = '/login.html';        // Redirect to login
        });

        // =============================
        // INFO BUTTON (TOP-RIGHT)
        // =============================

        // Info button with game instructions
        new InfoButton(
            this.stage,
            this.layer,
            'Solve multiplication problems to clean dishes! \n\nType your answer and press ENTER. \n\nClean 5 dishes to satisfy your customers!'
        );

        // =============================
        // SHUFFLE BUTTON
        // =============================

        // Button to skip current problem (no penalty)
        this.shuffleButton = new ShuffleButton(
            this.stage,
            this.layer,
            this.minigameUIGroup,                        // Parent group
            stageWidth * 0.3,                            // X position (left of input box)
            inputBoxY,                                   // Y position (same as input box)
            inputBoxHeight,                              // Height (same as input box)
            () => this.shuffleProblem(),                 // Callback: shuffle problem
            50                                           // Width
        );
    }

    /**
     * Shuffle Problem
     *
     * Skips the current problem and generates a new one.
     * No penalty for shuffling (doesn't count as wrong answer).
     *
     * ACTIONS:
     * 1. Clear user input
     * 2. Update input display (show empty)
     * 3. Clear feedback text
     * 4. Generate new multiplication problem
     * 5. Redraw layer
     */
    private shuffleProblem(): void {
        // Clear user input
        this.userInput = '';

        // Update input display to show empty string
        this.updateInputDisplay();

        // Clear feedback text (remove "Clean!" or "Still Dirty!" message)
        this.feedbackText.text('');

        // Generate and display new multiplication problem
        this.generateNewProblem();

        // Redraw layer to show changes
        this.layer.draw();
    }

    /**
     * Generate New Multiplication Problem
     *
     * Creates a random multiplication problem.
     *
     * ALGORITHM:
     * 1. Choose random num1 (1-12)
     * 2. Choose random num2 (1-12)
     * 3. Calculate product = num1 × num2
     * 4. Create problem: "num1 × num2"
     * 5. Store answer: product
     *
     * EXAMPLE:
     * - num1 = 7 (random 1-12)
     * - num2 = 8 (random 1-12)
     * - product = 7 × 8 = 56
     * - Problem: "7 × 8"
     * - Answer: 56
     *
     * RANGE EXPLANATION:
     * - Numbers 1-12: Matches times tables learned in school
     * - Result: Multiplication problems with answers 1-144
     */
    private generateNewProblem(): void {
        // Safety check: Ensure problemText exists
        if (!this.problemText) return;

        // Generate random num1 (1 to 12)
        const num1 = Math.floor(Math.random() * 12) + 1;

        // Generate random num2 (1 to 12)
        const num2 = Math.floor(Math.random() * 12) + 1;

        // Create problem object
        this.currentProblem = {
            question: `${num1} × ${num2}`,               // e.g., "7 × 8"
            answer: num1 * num2                           // e.g., 56
        };

        // Update problem text to display new problem
        this.problemText.text(this.currentProblem.question);

        // Redraw layer to show new problem
        this.layer.draw();
    }

    /**
     * Setup Keyboard Input
     *
     * Registers keyboard event listener to capture player's input.
     * Removes any existing listener first to prevent duplicates.
     */
    private setupKeyboardInput(): void {
        // Remove existing listener (if any) to prevent duplicates
        window.removeEventListener('keydown', this.keyboardHandler);

        // Add new keyboard listener
        window.addEventListener('keydown', this.keyboardHandler);
    }

    /**
     * Handle Key Press
     *
     * Processes keyboard input from player.
     *
     * SUPPORTED KEYS:
     * - Enter: Submit answer and check if correct
     * - Backspace: Delete last digit
     * - 0-9: Add digit to input (max 5 digits)
     *
     * IGNORED WHEN:
     * - Minigame UI is hidden (not in game)
     * - Choice UI is visible (in choice modal)
     * - Timer is not running (game not started or ended)
     *
     * @param e - Keyboard event
     */
    private handleKeyPress(e: KeyboardEvent): void {
        // Ignore input if not in active minigame
        if (!this.minigameUIGroup.visible() || this.choiceUIGroup.visible() || this.timerInterval === null) return;

        // ENTER KEY: Submit answer
        if (e.key === 'Enter') {
            this.checkAnswer();
        }
        // BACKSPACE KEY: Delete last digit
        else if (e.key === 'Backspace') {
            this.userInput = this.userInput.slice(0, -1);  // Remove last character
            this.updateInputDisplay();
        }
        // NUMBER KEYS (0-9): Add digit to input (max 5 digits)
        else if (e.key >= '0' && e.key <= '9' && this.userInput.length < 5) {
            this.userInput += e.key;                        // Append digit
            this.updateInputDisplay();
        }
    }

    /**
     * Update Input Display
     *
     * Updates the input text element to show current user input.
     * Called whenever user types a number or deletes a digit.
     */
    private updateInputDisplay(): void {
        // Safety check: Ensure inputText exists
        if (!this.inputText) return;

        // Update input text to show current user input
        this.inputText.text(this.userInput);

        // Redraw layer to show updated input
        this.layer.draw();
    }

    /**
     * Check Answer
     *
     * Validates player's answer and provides feedback.
     *
     * CORRECT ANSWER:
     * - Increment correctAnswers
     * - Increment dishesCleaned
     * - Show "Clean! +1 Dish ✓" in green
     * - Update score display
     * - If 5 dishes cleaned → End minigame successfully (even if time remains)
     *
     * WRONG ANSWER:
     * - Show "Still Dirty! ✗" in red
     * - Add to mistakes array (for results popup)
     * - No penalty (dishes not deducted)
     *
     * AFTER FEEDBACK:
     * - Clear user input
     * - Wait 800ms (so player can see feedback)
     * - Clear feedback message
     * - Generate new problem
     *
     * AUTO-COMPLETE:
     * When 5 dishes are cleaned, minigame ends automatically (success).
     */
    private checkAnswer(): void {
        // Ignore empty input
        if (this.userInput === '' || !this.feedbackText) return;

        // Parse user input as integer
        const userAnswer = parseInt(this.userInput);

        // Increment total problems attempted
        this.totalProblems++;

        // =============================
        // VALIDATE ANSWER
        // =============================

        if (userAnswer === this.currentProblem.answer) {
            // CORRECT ANSWER

            // Increment correct answer count
            this.correctAnswers++;

            // Increment dishes cleaned count
            this.dishesCleaned++;

            // Show positive feedback (green checkmark)
            this.showFeedback('Clean! +1 Dish ✓', '#27ae60');

            // =============================
            // CHECK FOR COMPLETION (5 DISHES CLEANED)
            // =============================

            if (this.dishesCleaned >= this.totalDishesToClean) {
                // SUCCESS! Player cleaned 5 dishes

                // Update score display one last time
                this.updateScore();

                // Wait 500ms (let player see feedback), then end minigame
                setTimeout(() => {
                    this.endMinigame(false);  // End minigame (not skipped)
                }, 500);
                return;  // Exit early (don't generate new problem)
            }
        } else {
            // WRONG ANSWER

            // Show negative feedback (red X)
            this.showFeedback('Still Dirty! ✗', '#e74c3c');

            // Add to mistakes array (for results popup)
            this.mistakes.push({
                question: this.currentProblem.question,   // e.g., "7 × 8"
                userAnswer: this.userInput,               // What player typed
                correctAnswer: this.currentProblem.answer // Correct answer
            });
        }

        // =============================
        // UPDATE UI & PREPARE NEXT PROBLEM
        // =============================

        // Update score display ("Dishes Cleaned: X / 5")
        this.updateScore();

        // Clear user input for next problem
        this.userInput = '';
        this.updateInputDisplay();

        // Wait 800ms (let player see feedback), then generate new problem
        setTimeout(() => {
            // Clear feedback text
            if (this.feedbackText) {
                this.feedbackText.text('');
            }
            // Generate new multiplication problem
            this.generateNewProblem();
        }, 800);
    }

    /**
     * Show Feedback
     *
     * Displays feedback message to player (correct or wrong).
     *
     * @param message - Feedback text ("Clean! +1 Dish ✓" or "Still Dirty! ✗")
     * @param color - Text color ('#27ae60' green or '#e74c3c' red)
     */
    private showFeedback(message: string, color: string): void {
        // Safety check: Ensure feedbackText exists
        if (!this.feedbackText) return;

        // Update feedback text and color
        this.feedbackText.text(message);
        this.feedbackText.fill(color);

        // Redraw layer to show feedback
        this.layer.draw();
    }

    /**
     * Update Score
     *
     * Updates the score display to show current dishes cleaned progress.
     * Called after each answer (correct or wrong).
     *
     * DISPLAY:
     * "Dishes Cleaned: X / 5"
     * Example: "Dishes Cleaned: 3 / 5"
     */
    private updateScore(): void {
        // Safety check: Ensure scoreText exists
        if (!this.scoreText) return;

        // Update score text: "Dishes Cleaned: X / 5"
        this.scoreText.text(`Dishes Cleaned: ${this.dishesCleaned} / ${this.totalDishesToClean}`);

        // Redraw layer to show updated score
        this.layer.draw();
    }

    /**
     * Start Timer
     *
     * Starts the countdown timer (1 second intervals).
     * Timer changes color when time is low:
     * - Green: > 30 seconds
     * - Orange: 11-30 seconds
     * - Red: <= 10 seconds
     *
     * When timer reaches 0, minigame ends automatically (time's up).
     */
    private startTimer(): void {
        // Prevent multiple timers (safety check)
        if (this.timerInterval !== null) return;

        // Start interval timer (1 second = 1000ms)
        this.timerInterval = window.setInterval(() => {
            // Decrement time remaining
            this.timeRemaining--;

            // Update timer display
            if (this.timerText) {
                // Update text: "Time: XXs"
                this.timerText.text(`Time: ${this.timeRemaining}s`);

                // Change color based on time remaining
                if (this.timeRemaining <= 10) {
                    this.timerText.fill('#e74c3c');      // Red (urgent!)
                } else if (this.timeRemaining <= 30) {
                    this.timerText.fill('#f39c12');      // Orange (warning)
                }
                // else: stays green (plenty of time)

                // Redraw layer to show updated timer
                this.layer.draw();
            }

            // Check if time expired
            if (this.timeRemaining <= 0) {
                // TIME'S UP! End minigame
                this.endMinigame(false);
            }
        }, 1000);  // 1000ms = 1 second
    }

    /**
     * Show Results Popup
     *
     * Displays modal with final score and mistakes.
     * Called when timer expires OR when player cleans 5 dishes.
     *
     * POPUP CONTENTS:
     * - Header: "ALL DONE!" (if 5 dishes cleaned) or "TIME'S UP!" (if time expired)
     * - Score: "Dishes Cleaned: X/5"
     * - Mistakes list (up to 5 shown):
     *   - "7 × 8 = 56 (Your answer: 54)"
     * - If > 5 mistakes: "...and X more."
     * - If 0 mistakes: "No errors. Great job!"
     * - CONTINUE button: Close popup, call onComplete callback
     *
     * VISUAL:
     * - Black overlay (semi-transparent)
     * - White rounded box in center
     * - Green "CONTINUE" button at bottom
     */
    private showResultsPopup(): void {
        // Get stage dimensions
        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        // Create results UI group
        this.resultsUIGroup = new Konva.Group();

        // =============================
        // OVERLAY (SEMI-TRANSPARENT BLACK)
        // =============================

        // Dark overlay behind popup (dims background)
        const overlay = new Konva.Rect({
            width: stageWidth,
            height: stageHeight,
            fill: 'black',
            opacity: 0.5                                 // 50% transparent
        });

        // =============================
        // POPUP BOX
        // =============================

        // Calculate box size (max 600×500, or 90% of screen)
        const boxWidth = Math.min(600, stageWidth * 0.9);
        const boxHeight = Math.min(500, stageHeight * 0.8);

        // White rounded box in center
        const box = new Konva.Rect({
            x: (stageWidth - boxWidth) / 2,             // Center horizontally
            y: (stageHeight - boxHeight) / 2,            // Center vertically
            width: boxWidth,
            height: boxHeight,
            fill: 'white',                               // White background
            cornerRadius: 15,                            // Rounded corners
            stroke: '#333',                              // Dark border
            strokeWidth: 2
        });

        // Add overlay and box to results group
        this.resultsUIGroup.add(overlay, box);

        // =============================
        // HEADER TEXT: SUCCESS OR TIME'S UP
        // =============================

        // Determine header text and color based on success
        const title = this.dishesCleaned >= this.totalDishesToClean ? "ALL DONE!" : "TIME'S UP!";
        const titleColor = this.dishesCleaned >= this.totalDishesToClean ? 'green' : '#E67E22';

        const headerText = new Konva.Text({
            x: box.x(),
            y: box.y() + 20,                             // 20px from top of box
            width: boxWidth,
            text: title,
            fontSize: 30,
            fontFamily: 'Press Start 2P',
            fill: titleColor,                            // Green if success, orange if time's up
            align: 'center'
        });
        this.resultsUIGroup.add(headerText);

        // =============================
        // SCORE TEXT: "Dishes Cleaned: X/5"
        // =============================

        const scoreText = new Konva.Text({
            x: box.x(),
            y: headerText.y() + 50,                      // Below header
            width: boxWidth,
            text: `Dishes Cleaned: ${this.dishesCleaned}/${this.totalDishesToClean}`,
            fontSize: 20,
            fontFamily: 'Press Start 2P',
            fill: '#333',                                // Dark gray
            align: 'center'
        });
        this.resultsUIGroup.add(scoreText);

        // =============================
        // MISTAKES LIST
        // =============================

        // Current Y position for content (starts below score)
        let contentY = scoreText.y() + 50;

        if (this.mistakes.length === 0) {
            // NO MISTAKES: Show "Great job!" message

            const perfectText = new Konva.Text({
                x: box.x(),
                y: contentY + 20,
                width: boxWidth,
                text: "No errors. Great job!",
                fontSize: 18,
                fill: 'green',                           // Green for success
                align: 'center',
                fontFamily: 'Nunito'
            });
            this.resultsUIGroup.add(perfectText);
        } else {
            // HAS MISTAKES: Show list of mistakes

            // List header: "Problems Missed:"
            const listHeader = new Konva.Text({
                x: box.x(),
                y: contentY,
                width: boxWidth,
                text: "Problems Missed:",
                fontSize: 18,
                fontStyle: 'bold',
                fill: '#c0392b',                         // Red
                fontFamily: 'Nunito',
                align: 'center'
            });
            this.resultsUIGroup.add(listHeader);
            contentY += 30;  // Move down for list items

            // Show first 5 mistakes (or all if < 5)
            this.mistakes.slice(0, 5).forEach(m => {
                // Format: "7 × 8 = 56 (Your answer: 54)"
                const line = `${m.question} = ${m.correctAnswer} (Your answer: ${m.userAnswer})`;

                const item = new Konva.Text({
                    x: box.x(),
                    y: contentY,
                    width: boxWidth,
                    text: line,
                    fontSize: 16,
                    fill: '#333',                        // Dark gray
                    align: 'center',
                    fontFamily: 'Nunito'
                });
                this.resultsUIGroup!.add(item);
                contentY += 25;  // Move down for next item
            });

            // If more than 5 mistakes, show "...and X more."
            if (this.mistakes.length > 5) {
                const more = new Konva.Text({
                    x: box.x(),
                    y: contentY,
                    width: boxWidth,
                    text: `...and ${this.mistakes.length - 5} more.`,
                    fontSize: 14,
                    fill: '#7f8c8d',                     // Gray
                    fontFamily: 'Nunito',
                    align: 'center'
                });
                this.resultsUIGroup.add(more);
            }
        }

        // =============================
        // CONTINUE BUTTON
        // =============================

        const btnWidth = 150;
        const btnHeight = 50;

        // Button group (centered horizontally at bottom of box)
        const btnGroup = new Konva.Group({
            x: box.x() + (boxWidth - btnWidth) / 2,     // Center horizontally
            y: box.y() + boxHeight - 80                  // 80px from bottom of box
        });

        // Green button rectangle
        const btnRect = new Konva.Rect({
            width: btnWidth,
            height: btnHeight,
            fill: '#4CAF50',                             // Green
            cornerRadius: 5
        });

        // "CONTINUE" text
        const btnText = new Konva.Text({
            width: btnWidth,
            height: btnHeight,
            text: "CONTINUE",
            fontSize: 16,
            fill: 'white',
            fontFamily: 'Press Start 2P',
            align: 'center',
            verticalAlign: 'middle'
        });

        // Add rect and text to button group
        btnGroup.add(btnRect, btnText);

        // BUTTON CLICK EVENT: Close popup, call finishEndGame
        btnGroup.on('click', () => {
            // Destroy results popup
            this.resultsUIGroup?.destroy();

            // Call finishEndGame (which calls onComplete callback)
            this.finishEndGame(false);  // skipped = false
        });

        // BUTTON HOVER EFFECT: Darken green
        btnGroup.on('mouseenter', () => {
            this.stage.container().style.cursor = 'pointer';
            btnRect.fill('#45a049');                     // Darker green
            this.layer.draw();
        });

        // BUTTON LEAVE EFFECT: Restore green
        btnGroup.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
            btnRect.fill('#4CAF50');                     // Original green
            this.layer.draw();
        });

        // =============================
        // ADD TO LAYER AND SHOW
        // =============================

        // Add button to results group
        this.resultsUIGroup.add(btnGroup);

        // Add results group to layer
        this.layer.add(this.resultsUIGroup);

        // Move results group to top (above everything else)
        this.resultsUIGroup.moveToTop();

        // Redraw layer to show results popup
        this.layer.draw();
    }

    /**
     * Finish End Game
     *
     * Prepares final result and calls onComplete callback.
     *
     * RESULT CALCULATION:
     * - If skipped: correctAnswers = 0 (no dishes cleaned)
     * - If completed 5 dishes: correctAnswers = originalTotalDishes (all dishes cleaned!)
     * - If time expired: correctAnswers = dishesCleaned (actual count)
     *
     * EXAMPLE:
     * - originalTotalDishes = 7 (sold 7 cookies → 7 dishes dirty)
     * - Player completes 5 dishes successfully
     * - Result: correctAnswers = 7 (report all dishes as cleaned!)
     *
     * This allows GameManager to correctly calculate fines:
     * - leftover = originalDishes (7) - correctAnswers (7) = 0
     * - Fine = 0 × $10 = $0 (no fine!)
     *
     * @param skipped - Whether player skipped minigame
     */
    private finishEndGame(skipped: boolean): void {
        // Initialize final reported answers
        let finalReportedAnswers = this.correctAnswers;

        // =============================
        // SUCCESS BONUS
        // =============================

        // If player completed 5 dishes successfully (not skipped)
        if (!skipped && this.dishesCleaned >= this.TARGET_DISHES) {
            // Report all original dishes as cleaned (bonus reward!)
            finalReportedAnswers = this.originalTotalDishes;
        }

        // =============================
        // CREATE RESULT OBJECT
        // =============================

        const result: MinigameResult = {
            correctAnswers: finalReportedAnswers,        // Dishes cleaned (or original count if completed)
            totalProblems: this.totalProblems,           // Problems attempted
            timeRemaining: skipped ? this.timeRemaining : 0  // Time left (or 0 if not skipped)
        };

        // =============================
        // CALL COMPLETION CALLBACK
        // =============================

        // Call onComplete callback (handled by GameManager)
        this.onComplete(result, skipped);
    }

    /**
     * End Minigame
     *
     * Called when minigame ends (time expired, 5 dishes cleaned, or player skipped).
     *
     * CLEANUP ACTIONS:
     * 1. Stop timer interval
     * 2. Remove keyboard event listener
     *
     * IF SKIPPED:
     * - Call finishEndGame immediately with skipped=true
     *
     * IF TIME EXPIRED OR COMPLETED:
     * - Show results popup with score and mistakes
     * - Popup's CONTINUE button calls finishEndGame
     *
     * @param skipped - Whether player skipped minigame (true) or completed/time expired (false)
     */
    private endMinigame(skipped: boolean = false): void {
        // =============================
        // STOP TIMER
        // =============================

        // Clear timer interval (stop countdown)
        if (this.timerInterval !== null) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // =============================
        // REMOVE KEYBOARD LISTENER
        // =============================

        // Remove keyboard event listener (no longer need input)
        window.removeEventListener('keydown', this.keyboardHandler);

        // =============================
        // HANDLE SKIP VS COMPLETED/TIME EXPIRED
        // =============================

        if (skipped) {
            // PLAYER SKIPPED MINIGAME

            // Call finishEndGame immediately (no results popup)
            this.finishEndGame(true);  // skipped = true
        } else {
            // TIME EXPIRED OR 5 DISHES CLEANED

            // Show results popup with score and mistakes
            // Popup's CONTINUE button will call finishEndGame
            this.showResultsPopup();
        }
    }

    /**
     * Cleanup
     *
     * Public cleanup method called when transitioning to next phase.
     * Stops timers, removes event listeners, and destroys Konva objects.
     *
     * CLEANUP ACTIONS:
     * 1. Stop timer interval
     * 2. Remove keyboard event listener
     * 3. Destroy minigame UI group
     * 4. Destroy choice UI group
     * 5. Destroy results UI group (if exists)
     *
     * Called by GameManager when transitioning phases.
     */
    public cleanup(): void {
        // Stop timer interval (if running)
        if (this.timerInterval !== null) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Remove keyboard event listener
        window.removeEventListener('keydown', this.keyboardHandler);

        // Destroy Konva UI groups
        this.minigameUIGroup.destroy();      // Main minigame UI
        this.choiceUIGroup.destroy();        // Play/Skip modal
        if (this.resultsUIGroup) {
            this.resultsUIGroup.destroy();   // Results popup (if shown)
        }
    }
}
