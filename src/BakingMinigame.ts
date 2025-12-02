/**
 * BakingMinigame.ts - Division Problem Minigame for Earning Tips
 *
 * PURPOSE:
 * An interactive math minigame where players solve division problems to earn bonus tips.
 * Part of the BAKING phase in the game loop. Players have a time limit to solve as many
 * problems as possible, earning $5 per correct answer.
 *
 * VISUAL APPEARANCE:
 * 1. ANIMATION PHASE: 6-frame baking animation (2 FPS)
 * 2. CHOICE MODAL: "Would you like to play?" with PLAY/SKIP buttons
 * 3. MINIGAME UI:
 *    - Title: "Baking Minigame - Solve Problems for Tips!"
 *    - Timer: Countdown in seconds (changes color when low)
 *    - Problem: Large division equation (e.g., "56 ÷ 7")
 *    - Input Box: Player types answer
 *    - Score: "Tips Earned: $XX"
 *    - Shuffle Button: Skip current problem
 *    - Exit/Info Buttons: Quit or view instructions
 * 4. RESULTS POPUP: Shows score and mistakes after time expires
 *
 * GAME MECHANICS:
 * - Time Limit: 60 seconds (configurable via config.bakingTime)
 * - Problem Type: Division (dividend ÷ divisor = quotient)
 * - Problem Generation: Ensures clean division (no remainders)
 * - Reward: $5 per correct answer
 * - Penalty for Wrong Answer: None (but tracked as mistake)
 * - Shuffle: Skip current problem (no penalty)
 *
 * PROBLEM GENERATION ALGORITHM:
 * 1. Choose random divisor (2-10)
 * 2. Choose random quotient (1-12)
 * 3. Calculate dividend = divisor × quotient
 * 4. Display: "dividend ÷ divisor = ?"
 * Example: divisor=7, quotient=8 → "56 ÷ 7 = ?"
 *
 * USAGE:
 * const minigame = new BakingMinigame(stage, layer, cookiesSold, (result, skipped) => {
 *     const tips = result.correctAnswers * 5;
 *     console.log(`Earned $${tips} in tips!`);
 *     // Transition to next phase
 * });
 *
 * FLOW:
 * 1. Constructor → Load animation
 * 2. Animation completes → Show Play/Skip choice
 * 3a. Player clicks PLAY → Show minigame UI, start timer
 * 3b. Player clicks SKIP → End minigame with 0 tips
 * 4. Player solves problems until time expires
 * 5. Show results popup with score and mistakes
 * 6. Player clicks CONTINUE → Call onComplete callback
 *
 * NOTE: This class handles its own cleanup (timers, event listeners, Konva objects)
 */

import Konva from 'konva';
import { MinigameResult } from './types';
import { ConfigManager } from './config';
import { AnimationPlayer } from './AnimationPlayer';
import { ExitButton } from './ui/ExitButton';
import { InfoButton } from './ui/InfoButton';
import { ShuffleButton } from './ui/ShuffleButton';

/**
 * Mistake Interface
 *
 * Tracks incorrect answers to display in results popup.
 */
interface Mistake {
    question: string;        // The division problem (e.g., "56 ÷ 7")
    userAnswer: string;      // What the player typed
    correctAnswer: number;   // The correct answer
}

/**
 * BakingMinigame Class
 *
 * Interactive division problem minigame for earning tips during baking phase.
 * Manages animation, UI, timer, problem generation, and scoring.
 */
export class BakingMinigame {
    // ==============================
    // KONVA RENDERING
    // ==============================

    /** Konva layer where all UI elements are drawn */
    private layer: Konva.Layer;

    /** Konva stage (canvas) */
    private stage: Konva.Stage;

    /** Game configuration (contains bakingTime, etc.) */
    private config = ConfigManager.getInstance().getConfig();

    // ==============================
    // GAME STATE
    // ==============================

    /** Time remaining in seconds (counts down from config.bakingTime, default 60) */
    private timeRemaining: number;

    /** Current division problem being displayed */
    private currentProblem!: { question: string; answer: number };

    /** Number of correct answers (each worth $5) */
    private correctAnswers: number = 0;

    /** Total problems attempted (correct + incorrect) */
    private totalProblems: number = 0;

    /** Number of cookies sold this day (displayed for context) */
    private cookiesSold: number;

    /** Array of incorrect answers to display in results popup */
    private mistakes: Mistake[] = [];

    // ==============================
    // UI GROUPS & ELEMENTS
    // ==============================

    /** Konva Group containing the main minigame UI (problem, input, timer, etc.) */
    private minigameUIGroup: Konva.Group;

    /** Konva Group containing the Play/Skip choice modal */
    private choiceUIGroup: Konva.Group;

    /** Konva Group containing the results popup (created when time expires) */
    private resultsUIGroup: Konva.Group | null = null;

    /** Timer text (changes color when time is low) */
    private timerText!: Konva.Text;

    /** Problem text (large division equation like "56 ÷ 7") */
    private problemText!: Konva.Text;

    /** Score text ("Tips Earned: $XX") */
    private scoreText!: Konva.Text;

    /** Feedback text ("Correct! +$5 Tip ✓" or "Wrong! ✗") */
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
    // ANIMATION
    // ==============================

    /** Animation player for 6-frame baking intro animation */
    private animationPlayer: AnimationPlayer;

    /**
     * Constructor
     *
     * Initializes the baking minigame, loads intro animation, and sets up UI.
     *
     * INITIALIZATION STEPS:
     * 1. Store references to stage, layer, cookiesSold
     * 2. Set time remaining from config
     * 3. Create UI groups (initially hidden)
     * 4. Set up all UI elements (problem, input, timer, buttons, etc.)
     * 5. Load and play 6-frame baking animation
     * 6. When animation completes → Show Play/Skip choice modal
     *
     * @param stage - Konva Stage (canvas)
     * @param layer - Konva Layer to add UI to
     * @param cookiesSold - Number of cookies sold (displayed for context)
     * @param onComplete - Callback when minigame ends (result, skipped)
     */
    constructor(
        stage: Konva.Stage,
        layer: Konva.Layer,
        cookiesSold: number,
        onComplete: (result: MinigameResult, skipped: boolean) => void
    ) {
        // Store constructor parameters
        this.stage = stage;
        this.layer = layer;
        this.cookiesSold = cookiesSold;
        this.onComplete = onComplete;

        // Set initial time from config (default 60 seconds)
        this.timeRemaining = this.config.bakingTime;

        // Bind keyboard handler to this instance (for cleanup)
        this.keyboardHandler = this.handleKeyPress.bind(this);

        // =============================
        // CREATE UI GROUPS (HIDDEN)
        // =============================

        // Create minigame UI group (hidden until player clicks PLAY)
        this.minigameUIGroup = new Konva.Group({ visible: false, name: 'minigameUI' });

        // Create choice UI group (hidden until animation completes)
        this.choiceUIGroup = new Konva.Group({ visible: false, name: 'choiceUI' });

        // Add groups to layer
        this.layer.add(this.minigameUIGroup);
        this.layer.add(this.choiceUIGroup);

        // =============================
        // SETUP UI ELEMENTS
        // =============================

        // Create all UI elements (problem text, input box, timer, buttons, etc.)
        this.setupUI();

        // =============================
        // LOAD & PLAY INTRO ANIMATION
        // =============================

        // Array of image paths for 6-frame baking animation (9.png to 14.png)
        const IMAGE_PATHS = [
            '/9.png', '/10.png', '/11.png', '/12.png', '/13.png', '/14.png'
        ];

        // Create animation player
        // Frame rate: 2 FPS (slow, relaxed pace)
        // Position: (0, 0), fullscreen
        // Loop: false (play once)
        // Callback: Show Play/Skip choice when done
        this.animationPlayer = new AnimationPlayer(
            this.layer,
            IMAGE_PATHS,
            2,                        // 2 FPS
            0, 0,                     // Position (0, 0)
            this.stage.width(), this.stage.height(),  // Fullscreen
            false,                    // Don't loop
            () => {
                // ANIMATION COMPLETE CALLBACK
                // Show Play/Skip choice modal
                this.showPlaySkipChoice();
            }
        );

        // Load all frames, then start animation
        this.animationPlayer.load()
            .then(() => {
                // All frames loaded successfully, start playing
                this.animationPlayer.start();
            })
            .catch(error => {
                // ERROR: Animation failed to load
                console.error("Animation failed to load, skipping to choice.", error);
                // Skip animation, show choice modal immediately
                this.showPlaySkipChoice();
            });
    }

    /**
     * Setup UI Elements
     *
     * Creates all Konva elements for the minigame UI:
     * - Title text
     * - Score text
     * - Problem text
     * - Input box and text
     * - Timer text
     * - Feedback text
     * - Instructions text
     * - Exit button
     * - Info button
     * - Shuffle button
     *
     * All elements are added to minigameUIGroup (hidden initially).
     */
    private setupUI(): void {
        // Get stage dimensions for responsive sizing
        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        // =============================
        // TITLE TEXT
        // =============================

        // "Baking Minigame - Solve Problems for Tips!"
        const title = new Konva.Text({
            x: 0,                                        // Centered via width
            y: stageHeight * 0.05,                       // 5% from top
            width: stageWidth,                           // Full width (for centering)
            text: 'Baking Minigame - Solve Problems for Tips!',
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

        // "Tips Earned: $XX" (updates as player answers correctly)
        this.scoreText = new Konva.Text({
            x: stageWidth * 0.43,                        // Slightly left of center
            y: stageHeight * 0.12,                       // Below title
            text: `Tips Earned: $${this.correctAnswers * 5}`,  // Initial: $0
            fontSize: Math.min(stageWidth * 0.02, 24),  // Responsive, max 24px
            fill: '#34495e',                             // Dark gray
            align: 'center',
            fontFamily: 'Nunito'                         // Clean modern font
        });
        this.minigameUIGroup.add(this.scoreText);

        // =============================
        // PROBLEM TEXT
        // =============================

        // Large division problem (e.g., "56 ÷ 7")
        this.problemText = new Konva.Text({
            x: 0,                                        // Centered via width
            y: stageHeight * 0.3,                        // 30% from top
            width: stageWidth,                           // Full width (for centering)
            text: '',                                    // Empty initially (set when game starts)
            fontSize: Math.min(stageWidth * 0.048, 58), // Large, responsive
            fill: '#2c3e50',                             // Dark blue-gray
            fontStyle: 'bold',
            align: 'center',                             // Center horizontally
            fontFamily: 'Nunito'
        });
        this.minigameUIGroup.add(this.problemText);

        // =============================
        // INPUT BOX
        // =============================

        // Position and size of input box
        const inputBoxY = stageHeight * 0.45;           // 45% from top
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
            y: inputBoxY + inputBoxHeight + 20,          // Below input box
            width: stageWidth,                           // Full width (for centering)
            text: `Time: ${this.timeRemaining}s`,       // Initial time from config
            fontSize: Math.min(stageWidth * 0.024, 28), // Responsive
            fill: '#27ae60',                             // Green (changes to orange/red when low)
            fontStyle: 'bold',
            align: 'center',
            fontFamily: 'Nunito'
        });
        this.minigameUIGroup.add(this.timerText);

        // =============================
        // FEEDBACK TEXT
        // =============================

        // Feedback message ("Correct! +$5 Tip ✓" or "Wrong! ✗")
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
        // Quits game and redirects to login (WARNING: typo in URL - should be .html not .hmtl)
        new ExitButton(this.stage, this.layer, () => {
            this.cleanup();                              // Clean up timers and event listeners
            window.location.href = '/login.hmtl';        // Redirect to login (typo!)
        });

        // =============================
        // INFO BUTTON (TOP-RIGHT)
        // =============================

        // Info button with game instructions
        new InfoButton(
            this.stage,
            this.layer,
            'Solve as many division problems as you can within the time limit to earn bonus tips! \n\nType your answer and press ENTER. \n\nEach correct answer gives you $5 tip. \nGood luck!'
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
     * 4. Generate new division problem
     * 5. Redraw layer
     */
    private shuffleProblem(): void {
        // Clear user input
        this.userInput = '';

        // Update input display to show empty string
        this.updateInputDisplay();

        // Clear feedback text (remove "Correct!" or "Wrong!" message)
        if (this.feedbackText) {
            this.feedbackText.text('');
        }

        // Generate and display new division problem
        this.generateNewProblem();

        // Redraw layer to show changes
        this.layer.draw();
    }

    /**
     * Show Play/Skip Choice Modal
     *
     * Displays a modal asking "Would you like to play?"
     * Player can click PLAY to start minigame or SKIP to earn $0 tips.
     *
     * MODAL CONTENTS:
     * - Title: "SPEED UP THE PROCESS!"
     * - Subtitle: "Minigame"
     * - Explanation: How minigame works and rewards
     * - PLAY button (green): Start minigame
     * - SKIP button (red): Skip minigame, earn $0
     *
     * ACTIONS:
     * 1. Destroy animation player (animation complete)
     * 2. Hide minigame UI
     * 3. Clear and show choice UI group
     * 4. Create modal background and text
     * 5. Create PLAY and SKIP buttons with hover effects
     * 6. Show choice UI and redraw
     */
    private showPlaySkipChoice(): void {
        // =============================
        // CLEANUP ANIMATION
        // =============================

        // Destroy animation player (animation complete, no longer needed)
        if (this.animationPlayer) {
            this.animationPlayer.destroy();
        }

        // =============================
        // HIDE MINIGAME UI, PREPARE CHOICE UI
        // =============================

        // Hide minigame UI (will be shown if player clicks PLAY)
        this.minigameUIGroup.visible(false);

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

        // "SPEED UP THE PROCESS!" in orange with red stroke
        const titleText = new Konva.Text({
            x: modalX,
            y: modalY + modalHeight * 0.1,               // 10% from top of modal
            width: modalWidth,
            text: 'SPEED UP THE PROCESS!',
            fontSize: Math.min(stageWidth * 0.035, 36),
            fontFamily: '"Press Start 2P"',              // Retro font
            fill: '#F39C12',                             // Orange
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

        // Explanation of minigame mechanics and rewards
        const newBodyText = [
            'Solve the puzzles to bake cookies faster!',
            'Baking faster will result in tips from customers, increasing your earnings!',
            'Skipping will result in no tips earned.'
        ].join('\n\n');

        const explainText = new Konva.Text({
            x: modalX + modalWidth * 0.1,                // 10% margin
            y: subTitle.y() + subTitle.height() + modalHeight * 0.05,
            width: modalWidth * 0.8,                     // 80% of modal width
            text: newBodyText,
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

        // Button dimensions
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

        // PLAY BUTTON HOVER EFFECT: Lighten color
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

        // SKIP BUTTON CLICK EVENT: End minigame with 0 tips
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
     * Hides choice modal, shows minigame UI, and starts the game.
     *
     * ACTIONS:
     * 1. Hide choice UI group
     * 2. Show minigame UI group
     * 3. Generate first division problem
     * 4. Start countdown timer
     * 5. Setup keyboard input listeners
     * 6. Redraw layer
     */
    private showMinigameUI(): void {
        // Hide choice modal
        this.choiceUIGroup.visible(false);

        // Show minigame UI (problem, input, timer, etc.)
        this.minigameUIGroup.visible(true);

        // Generate first division problem
        this.generateNewProblem();

        // Start countdown timer (1 second intervals)
        this.startTimer();

        // Setup keyboard input (listen for number keys, Enter, Backspace)
        this.setupKeyboardInput();

        // Redraw layer to show minigame UI
        this.layer.batchDraw();
    }

    /**
     * Generate New Division Problem
     *
     * Creates a random division problem with clean division (no remainder).
     *
     * ALGORITHM:
     * 1. Choose random divisor (2-10)
     * 2. Choose random quotient (1-12)
     * 3. Calculate dividend = divisor × quotient
     * 4. Create problem: "dividend ÷ divisor"
     * 5. Store answer: quotient
     *
     * EXAMPLE:
     * - divisor = 7 (random 2-10)
     * - quotient = 8 (random 1-12)
     * - dividend = 7 × 8 = 56
     * - Problem: "56 ÷ 7"
     * - Answer: 8
     *
     * RANGE EXPLANATION:
     * - Divisor 2-10: Reasonable difficulty (not too easy, not too hard)
     * - Quotient 1-12: Matches times tables learned in school
     * - Result: Division problems with answers 1-12
     */
    private generateNewProblem(): void {
        // Safety check: Ensure problemText exists
        if (!this.problemText) return;

        // Generate random divisor (2 to 10)
        const divisor = Math.floor(Math.random() * 9) + 2;

        // Generate random quotient (1 to 12)
        const quotient = Math.floor(Math.random() * 12) + 1;

        // Calculate dividend (ensures clean division)
        const dividend = divisor * quotient;

        // Create problem object
        this.currentProblem = {
            question: `${dividend} ÷ ${divisor}`,       // e.g., "56 ÷ 7"
            answer: quotient                              // e.g., 8
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
     * - Show "Correct! +$5 Tip ✓" in green
     * - Update score display
     *
     * WRONG ANSWER:
     * - Show "Wrong! ✗" in red
     * - Add to mistakes array (for results popup)
     * - No penalty (tips not deducted)
     *
     * AFTER FEEDBACK:
     * - Clear user input
     * - Wait 800ms (so player can see feedback)
     * - Clear feedback message
     * - Generate new problem
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

            // Increment correct answer count (+$5 per correct)
            this.correctAnswers++;

            // Show positive feedback (green checkmark)
            this.showFeedback('Correct! +$5 Tip ✓', '#27ae60');
        } else {
            // WRONG ANSWER

            // Show negative feedback (red X)
            this.showFeedback('Wrong! ✗', '#e74c3c');

            // Add to mistakes array (for results popup)
            this.mistakes.push({
                question: this.currentProblem.question,   // e.g., "56 ÷ 7"
                userAnswer: this.userInput,               // What player typed
                correctAnswer: this.currentProblem.answer // Correct answer
            });
        }

        // =============================
        // UPDATE UI & PREPARE NEXT PROBLEM
        // =============================

        // Update score display ("Tips Earned: $XX")
        this.updateScore();

        // Clear user input for next problem
        this.userInput = '';
        this.updateInputDisplay();

        // Wait 800ms (let player see feedback), then generate new problem
        setTimeout(() => {
            this.showFeedback('', 'transparent');   // Clear feedback
            this.generateNewProblem();               // New division problem
        }, 800);
    }

    /**
     * Show Feedback
     *
     * Displays feedback message to player (correct or wrong).
     *
     * @param message - Feedback text ("Correct! +$5 Tip ✓" or "Wrong! ✗")
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
     * Updates the score display to show current tips earned.
     * Called after each correct answer.
     *
     * CALCULATION:
     * Tips = correctAnswers × $5
     */
    private updateScore(): void {
        // Safety check: Ensure scoreText exists
        if (!this.scoreText) return;

        // Update score text: "Tips Earned: $XX"
        this.scoreText.text(`Tips Earned: $${this.correctAnswers * 5}`);

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
     * When timer reaches 0, minigame ends automatically.
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
     * Called when timer expires (time's up).
     *
     * POPUP CONTENTS:
     * - Header: "TIME'S UP!"
     * - Score: "Problems Solved: XX"
     * - Mistakes list (up to 5 shown):
     *   - "56 ÷ 7 = 8 (Your answer: 10)"
     * - If > 5 mistakes: "...and X more."
     * - If 0 mistakes: "Perfect! No mistakes."
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
        // HEADER TEXT: "TIME'S UP!"
        // =============================

        const headerText = new Konva.Text({
            x: box.x(),
            y: box.y() + 20,                             // 20px from top of box
            width: boxWidth,
            text: "TIME'S UP!",
            fontSize: 30,
            fontFamily: 'Press Start 2P',
            fill: '#E67E22',                             // Orange
            align: 'center'
        });
        this.resultsUIGroup.add(headerText);

        // =============================
        // SCORE TEXT: "Problems Solved: XX"
        // =============================

        const scoreText = new Konva.Text({
            x: box.x(),
            y: headerText.y() + 50,                      // Below header
            width: boxWidth,
            text: `Problems Solved: ${this.correctAnswers}`,
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
            // NO MISTAKES: Show "Perfect!" message

            const perfectText = new Konva.Text({
                x: box.x(),
                y: contentY + 20,
                width: boxWidth,
                text: "Perfect! No mistakes.",
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
                // Format: "56 ÷ 7 = 8 (Your answer: 10)"
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

        // BUTTON CLICK EVENT: Close popup, call onComplete callback
        btnGroup.on('click', () => {
            // Destroy results popup
            this.resultsUIGroup?.destroy();

            // Call onComplete callback with results
            this.onComplete({
                correctAnswers: this.correctAnswers,
                totalProblems: this.totalProblems,
                timeRemaining: 0                         // Time expired
            }, false);  // skipped = false (player completed minigame)
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
     * End Minigame
     *
     * Called when minigame ends (time expired or player skipped).
     *
     * CLEANUP ACTIONS:
     * 1. Stop timer interval
     * 2. Stop animation player (if still running)
     * 3. Remove keyboard event listener
     *
     * IF SKIPPED:
     * - Call onComplete callback immediately with 0 correct answers
     *
     * IF TIME EXPIRED:
     * - Show results popup with score and mistakes
     * - Popup's CONTINUE button calls onComplete callback
     *
     * @param skipped - Whether player skipped minigame (true) or time expired (false)
     */
    private endMinigame(skipped: boolean = false): void {
        // =============================
        // STOP TIMER
        // =============================

        // Clear timer interval (stop countdown)
        if (this.timerInterval !== null) {
            clearInterval(this.timerInterval);
        }
        this.timerInterval = null;

        // =============================
        // STOP ANIMATION
        // =============================

        // Stop animation player (if still running)
        if (this.animationPlayer) {
            this.animationPlayer.stop();
        }

        // =============================
        // REMOVE KEYBOARD LISTENER
        // =============================

        // Remove keyboard event listener (no longer need input)
        window.removeEventListener('keydown', this.keyboardHandler);

        // =============================
        // HANDLE SKIP VS TIME EXPIRED
        // =============================

        if (skipped) {
            // PLAYER SKIPPED MINIGAME

            // Create result with 0 correct answers
            const result: MinigameResult = {
                correctAnswers: 0,                       // No tips earned
                totalProblems: this.totalProblems,       // Problems attempted before skip
                timeRemaining: this.timeRemaining        // Time left when skipped
            };

            // Call onComplete callback after short delay (100ms)
            // Delay allows UI to update before transition
            setTimeout(() => {
                if (this.onComplete) {
                    this.onComplete(result, skipped);    // skipped = true
                }
            }, 100);
        } else {
            // TIME EXPIRED

            // Show results popup with score and mistakes
            // Popup's CONTINUE button will call onComplete callback
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
     * 1. Destroy animation player
     * 2. Stop timer interval
     * 3. Remove keyboard event listener
     * 4. Destroy choice UI group
     * 5. Destroy minigame UI group
     * 6. Destroy results UI group (if exists)
     *
     * Called by GameManager when transitioning phases.
     */
    public cleanup(): void {
        // Destroy animation player (if exists)
        if (this.animationPlayer) {
            this.animationPlayer.destroy();
        }

        // Stop timer interval (if running)
        if (this.timerInterval !== null) {
            clearInterval(this.timerInterval);
        }
        this.timerInterval = null;

        // Remove keyboard event listener
        window.removeEventListener('keydown', this.keyboardHandler);

        // Destroy Konva UI groups
        this.choiceUIGroup.destroy();        // Play/Skip modal
        this.minigameUIGroup.destroy();      // Main minigame UI
        if (this.resultsUIGroup) {
            this.resultsUIGroup.destroy();   // Results popup (if shown)
        }
    }
}
