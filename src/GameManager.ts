/**
 * GameManager.ts - Central Game Controller and State Machine
 *
 * PURPOSE:
 * The heart of the cookie business simulation game. This class orchestrates the entire
 * game lifecycle using a Finite State Machine pattern to manage transitions between
 * different game phases (LOGIN → STORY → SHOPPING → BAKING → CLEANING → etc.).
 *
 * ARCHITECTURE PATTERN: State Machine
 * - States: GamePhase enum values (LOGIN, SHOPPING, BAKING, CLEANING, etc.)
 * - Transitions: Player actions trigger phase changes via callbacks
 * - Controller: GameManager orchestrates all state transitions
 *
 * KEY RESPONSIBILITIES:
 * 1. Maintains PlayerState (funds, ingredients, reputation, day number)
 * 2. Tracks current GamePhase and transitions between phases
 * 3. Renders appropriate screen for each phase
 * 4. Manages background music for each phase
 * 5. Handles economic calculations (cookie cost, profit, bankruptcy)
 * 6. Manages reputation system (affects customer count)
 * 7. Checks win/lose conditions
 * 8. Coordinates minigames and animations
 *
 * GAME LOOP:
 * LOGIN → STORY → HOW_TO_PLAY → (repeat: ORDER → RECIPE → SHOPPING → BAKING →
 * POST_BAKING_ANIMATION → CLEANING → DAY_SUMMARY → NEW_DAY_ANIMATION) → VICTORY/DEFEAT
 *
 * ECONOMIC SYSTEM:
 * - Cookie Cost: $8.25 per cookie (Flour $1.50 + Sugar $0.75 + Butter $2.00 +
 *               Chocolate $3.00 + Baking Soda $1.00)
 * - Selling Price: $15 per cookie
 * - Profit: $6.75 per cookie (before tips/fines)
 * - Tips: $5 per correct answer in Baking Minigame
 * - Fines: $10 per dirty dish, $50 for skipping cleaning
 *
 * REPUTATION SYSTEM:
 * - Range: 0.2 (minimum) to 1.5 (maximum)
 * - Affects: Number of customers (1-7 customers based on reputation)
 * - Increases: +0.05 for playing cleaning minigame
 * - Decreases: -0.2 for skipping cleaning minigame
 *
 * WIN/LOSE CONDITIONS:
 * - Win: Accumulate $1000 in funds (configurable)
 * - Lose: Bankruptcy (can't make cookies AND can't afford ingredients)
 *
 * USAGE:
 * const container = document.getElementById('game-container');
 * const gameManager = new GameManager(container);
 * // Game automatically starts at LOGIN phase and manages itself
 *
 * NOTE: This is the largest file in the codebase (~1000 lines) and the most critical
 * component for understanding the game architecture.
 */

import Konva from 'konva';
import { GamePhase, PlayerState, MinigameResult } from './types';
import { ConfigManager } from './config';
import { BakingMinigame } from './BakingMinigame';
import { CleaningMinigame } from './CleaningMinigame';
import { HowToPlayScreen } from './HowToPlayScreen';
import { OrderScreen } from './OrderScreen';
import { ShoppingScreen } from './ShoppingScreen';
import { DaySummaryScreen } from './DaySummaryScreen';
import { LoginScreen } from './LoginScreen';
import { RecipeBookScreen } from './RecipeBookScreen';
import { AnimationPlayer } from './AnimationPlayer';
import { StoryScreen } from './StoryScreen';
import { VictoryScreen } from './VictoryScreen';
import { LoseScreen } from './LoseScreen';
import { VolumeSlider } from './ui/Volumeslider';

/**
 * GameManager Class
 *
 * Central orchestrator for the entire game. Manages state transitions, player progress,
 * audio, economic calculations, and win/lose conditions. Uses State Machine pattern.
 */
export class GameManager {

  // ==============================
  // KONVA RENDERING PROPERTIES
  // ==============================

  /** The main Konva Stage (canvas element) that all visuals are rendered on */
  private stage: Konva.Stage;

  /** The primary Konva Layer where all UI elements and sprites are drawn */
  private layer: Konva.Layer;

  /** Background image displayed behind most screens (except LOGIN and animations) */
  private backgroundImage: Konva.Image | null = null;

  // ==============================
  // STATE MACHINE PROPERTIES
  // ==============================

  /**
   * Current game phase (state in the State Machine)
   * Determines which screen is currently displayed
   */
  private currentPhase: GamePhase;

  /**
   * Previous game phase (for debugging and potential rollback)
   * Tracks the last phase before current transition
   */
  private previousPhase: GamePhase;

  // ==============================
  // GAME STATE & CONFIGURATION
  // ==============================

  /**
   * Player's complete game state (funds, ingredients, reputation, day number, etc.)
   * This is the primary data structure that persists across all phases
   */
  private player: PlayerState;

  /**
   * Game configuration loaded from debug_mode.txt or defaults
   * Contains tunable values like starting funds, win threshold, prices, etc.
   */
  private config = ConfigManager.getInstance().getConfig();

  // ==============================
  // MINIGAME & ANIMATION INSTANCES
  // ==============================

  /**
   * Current active Baking Minigame instance (division problems)
   * Null when not in BAKING phase. Must be cleaned up when transitioning phases.
   */
  private currentBakingMinigameInstance: BakingMinigame | null = null;

  /**
   * Current active Cleaning Minigame instance (multiplication problems)
   * Null when not in CLEANING phase. Must be cleaned up when transitioning phases.
   */
  private currentCleaningMinigame: CleaningMinigame | null = null;

  /**
   * Post-baking animation player (12 frames showing baked cookies)
   * Plays after BAKING phase, before CLEANING phase
   */
  private postBakingAnimation: AnimationPlayer | null = null;

  /**
   * New day animation player (15 frames showing sunrise/new day)
   * Plays after DAY_SUMMARY, before next ORDER phase
   */
  private newDayAnimation: AnimationPlayer | null = null;

  /**
   * Saved shopping screen input values when user goes back to RECIPE_BOOK
   * Allows preserving user's typed quantities when navigating back and forth
   */
  private savedShoppingInputs: Map<string, string> | undefined;

  // ==============================
  // DAILY ECONOMIC TRACKING
  // ==============================

  /**
   * Revenue from cookie sales this day (cookiesSold × $15)
   * Reset at start of SHOPPING phase
   */
  private daySales: number = 0;

  /**
   * Expenses this day (ingredient purchases + fines)
   * Reset at start of SHOPPING phase
   */
  private dayExpenses: number = 0;

  /**
   * Tips earned from Baking Minigame this day (correctAnswers × $5)
   * Reset at start of SHOPPING phase
   */
  private dayTips: number = 0;

  /**
   * List of customer orders for current day
   * Format: [{customerNum: 1, cookieCount: 3}, {customerNum: 2, cookieCount: 5}, ...]
   * Generated in ORDER phase, displayed in SHOPPING phase
   */
  private customerOrders: Array<{customerNum: number, cookieCount: number}> = [];

  // ==============================
  // AUDIO SYSTEM
  // ==============================

  /** Sound effect played when player wins (reaches $1000) */
  private winSound = new Audio('./public/Win_sound.mp3');

  /** Sound effect played when player loses (bankruptcy) */
  private loseSound = new Audio('./public/Lose_sound.mp3');

  /** Background music for LOGIN and HOW_TO_PLAY screens */
  private bgmIntro = new Audio('/login_page_mus.mp3');

  /** Background music for STORYLINE screen */
  private bgmStory = new Audio('/sad_mus.mp3');

  /** Background music for ORDER, RECIPE, SHOPPING, CLEANING screens */
  private bgmMain  = new Audio('/in_game_mus.mp3');

  /** Background music for POST_BAKING and NEW_DAY animations */
  private bgmAnim  = new Audio('/morning_mus.mp3');

  /** Background music for DAY_SUMMARY screen */
  private bgmEndDay  = new Audio('/day_sum_mus.mp3');

  /** Background music for BAKING minigame */
  private bgmbaking  = new Audio('/baking_mus.mp3');

  /**
   * Whether audio has been unlocked by user interaction
   * Browsers require user interaction (click/keypress) before playing audio
   * This flag prevents audio from playing until user has interacted with page
   */
  private audioUnlocked = false;

  /**
   * Whether win sound has been played (prevents playing multiple times)
   * Win sound should only play once when entering VICTORY screen
   */
  private winPlayedOnce = false;

  /**
   * Whether audio is ready to play (legacy flag)
   * Used in victory/defeat screens to ensure audio unlocking
   */
  private audioReady = false;

  /** Reference to VolumeSlider component (if present on current screen) */
  private volumeSlider?: VolumeSlider;

  /**
   * Global background music volume (0.0 to 1.0)
   * Default is 0.5 (50% volume)
   * Synchronized across all BGM tracks and screens via window events
   */
  private bgmVolume: number = 0.5;

  // ==============================
  // GAME LOGIC CONSTANTS
  // ==============================

  /**
   * Cookie Recipe - Required ingredients per ONE cookie
   *
   * RECIPE:
   * - Flour: 3 cups
   * - Sugar: 1 cup
   * - Butter: 8 tablespoons
   * - Chocolate: 1 cup
   * - Baking Soda: 2 teaspoons
   */
  private cookieRecipe: Map<string, number> = new Map([
    ['Flour', 3],           // 3 cups per cookie
    ['Sugar', 1],           // 1 cup per cookie
    ['Butter', 8],          // 8 tbsp per cookie
    ['Chocolate', 1],       // 1 cup per cookie
    ['Baking Soda', 2],     // 2 tsp per cookie
  ]);

  /**
   * Ingredient Prices - Cost per unit of each ingredient
   *
   * PRICES:
   * - Flour: $0.50 per cup
   * - Sugar: $0.75 per cup
   * - Butter: $0.25 per tablespoon
   * - Chocolate: $3.00 per cup (most expensive!)
   * - Baking Soda: $0.50 per teaspoon
   *
   * TOTAL COST PER COOKIE:
   * (3 × $0.50) + (1 × $0.75) + (8 × $0.25) + (1 × $3.00) + (2 × $0.50)
   * = $1.50 + $0.75 + $2.00 + $3.00 + $1.00 = $8.25
   */
  private ingredientPrices: Map<string, number> = new Map([
    ['Flour', 0.5],         // $0.50 per cup
    ['Sugar', 0.75],        // $0.75 per cup
    ['Butter', 0.25],       // $0.25 per tablespoon
    ['Chocolate', 3],       // $3.00 per cup
    ['Baking Soda', 0.5],   // $0.50 per teaspoon
  ]);

  /**
   * Constructor
   *
   * Initializes the game manager, sets up Konva stage, configures audio,
   * initializes player state, and starts the game at LOGIN phase.
   *
   * INITIALIZATION STEPS:
   * 1. Configure all audio tracks (loop, volume)
   * 2. Set up global volume getters/setters for cross-component communication
   * 3. Set up audio unlock listeners (required for browser audio playback)
   * 4. Create Konva stage and layer for rendering
   * 5. Initialize player state with starting values
   * 6. Set up window resize handler
   * 7. Load background image
   * 8. Start game at LOGIN phase
   *
   * @param container - HTMLDivElement to render the Konva stage into
   */
  constructor(container: HTMLDivElement) {
    // =============================
    // AUDIO CONFIGURATION
    // =============================

    // Configure all BGM tracks to loop and set initial volume
    // Loop = true means music restarts when it ends
    // Initial volume = 0.4 (40% - slightly quiet to not overpower game)
    [this.bgmIntro, this.bgmStory, this.bgmMain, this.bgmAnim, this.bgmEndDay, this.bgmbaking].forEach(a => {
        if(a) {
          a.loop = true;      // Loop music continuously
          a.volume = 0.4;     // Set initial volume
        }
    });

    // Expose global volume getter/setter functions on window object
    // This allows VolumeSlider components on different screens to access/modify volume
    // without needing direct reference to GameManager
    (window as any).getGlobalBgmVolume = () => this.bgmVolume;
    (window as any).setGlobalBgmVolume = (v: number) => this.setBgmVolume(v);

    /**
     * Audio Unlock System
     *
     * BROWSER REQUIREMENT:
     * Modern browsers (Chrome, Firefox, Safari) block audio playback until
     * the user has interacted with the page (AutoPlay Policy).
     *
     * SOLUTION:
     * Listen for first user interaction (click or keypress), then unlock audio.
     * Once unlocked, remove listeners to prevent repeated calls.
     */
    const unlockAudio = () => {
      // If already unlocked, do nothing
      if (this.audioUnlocked) return;

      // Set flag to indicate audio is now allowed
      this.audioUnlocked = true;

      // Start playing music for current phase
      this.updateBackgroundMusic();

      // Remove listeners (only need to unlock once)
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };

    // Listen for first pointer (mouse/touch) or keyboard interaction
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    /**
     * Volume Change Event Listener
     *
     * Listens for custom 'bgm-volume-change' events dispatched by VolumeSlider
     * components on various screens. When volume changes, update global volume.
     *
     * EVENT FLOW:
     * 1. User drags VolumeSlider on a screen
     * 2. VolumeSlider dispatches window event: 'bgm-volume-change'
     * 3. This listener catches event and calls setBgmVolume()
     * 4. All BGM tracks update to new volume
     */
    window.addEventListener('bgm-volume-change', (e: Event) => {
      const v = (e as CustomEvent<number>).detail;  // Extract volume from event
      this.setBgmVolume(v);  // Update volume on all tracks
    });

    // Set initial volume on all audio tracks
    this.setBgmVolume(this.bgmVolume);

    // =============================
    // KONVA STAGE SETUP
    // =============================

    /**
     * Create Konva Stage
     *
     * The Stage is the main canvas element that contains all layers.
     * Size matches the container div dimensions for responsive layout.
     */
    this.stage = new Konva.Stage({
      container,                      // HTMLDivElement to render into
      width: container.offsetWidth,   // Match container width
      height: container.offsetHeight, // Match container height
    });

    /**
     * Create Primary Layer
     *
     * All game visuals (sprites, UI, text) are added to this layer.
     * Layer is added to stage to make it visible.
     */
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    // =============================
    // STATE MACHINE INITIALIZATION
    // =============================

    // Start game at LOGIN phase (first screen player sees)
    this.currentPhase = GamePhase.LOGIN;
    this.previousPhase = GamePhase.LOGIN;

    // =============================
    // PLAYER STATE INITIALIZATION
    // =============================

    /**
     * Initialize PlayerState
     *
     * Starting values:
     * - username: Empty (set during LOGIN phase)
     * - funds: From config (default $500)
     * - ingredients: Empty Map (purchased in SHOPPING phase)
     * - breadInventory: Empty array (unused in current version)
     * - maxBreadCapacity: From config (default 20)
     * - currentDay: 1 (first day)
     * - dishesToClean: 0 (set after BAKING phase)
     * - reputation: 1.0 (neutral starting reputation)
     * - currentDayDemand: 0 (set in ORDER phase)
     */
    this.player = {
      username: '',                                      // Set during LOGIN
      funds: this.config.startingFunds,                  // Starting money (default $500)
      ingredients: new Map(),                            // Empty at start
      breadInventory: [],                                // Unused feature
      maxBreadCapacity: this.config.maxBreadCapacity,   // Max bread slots (default 20)
      currentDay: 1,                                     // Start on Day 1
      dishesToClean: 0,                                  // No dishes yet
      reputation: 1.0,                                   // Neutral reputation
      currentDayDemand: 0,                               // Set in ORDER phase
    };

    // =============================
    // WINDOW EVENT LISTENERS
    // =============================

    /**
     * Window Resize Handler
     *
     * When browser window resizes, update stage dimensions and redraw.
     * Background image is also resized to match new dimensions.
     */
    window.addEventListener('resize', () => this.handleResize(container));

    // =============================
    // START GAME
    // =============================

    // Load background image, then render LOGIN screen
    this.loadBackground();
  }

  // ======================================================================
  // HELPER METHODS - ECONOMIC CALCULATIONS
  // ======================================================================

  /**
   * Calculate Cost of One Cookie
   *
   * Calculates the total ingredient cost to make ONE cookie based on
   * the recipe and ingredient prices.
   *
   * CALCULATION:
   * For each ingredient in recipe:
   *   cost += (amount needed) × (price per unit)
   *
   * EXAMPLE:
   * Flour:       3 cups  × $0.50 = $1.50
   * Sugar:       1 cup   × $0.75 = $0.75
   * Butter:      8 tbsp  × $0.25 = $2.00
   * Chocolate:   1 cup   × $3.00 = $3.00
   * Baking Soda: 2 tsp   × $0.50 = $1.00
   * ----------------------------------------
   * TOTAL:                        $8.25
   *
   * NOTE: This method is exposed for testing purposes (test verifies $8.25)
   *
   * @returns Total cost in dollars to make one cookie
   */
  private getCostOfOneCookie(): number {
    let cost = 0;  // Accumulator for total cost

    // Iterate through each ingredient in the recipe
    this.cookieRecipe.forEach((needed, ingredient) => {
      const price = this.ingredientPrices.get(ingredient) || 0;  // Get price per unit
      cost += needed * price;  // Multiply quantity × price and add to total
    });

    // Returns $8.25 (assuming default recipe and prices)
    return cost;
  }

  // ======================================================================
  // WINDOW & RENDERING HANDLERS
  // ======================================================================

  /**
   * Handle Window Resize
   *
   * Called when browser window is resized. Updates stage dimensions and
   * background image size to match new container size.
   *
   * IMPORTANT FIX:
   * Previously, this method called renderCurrentPhase(), which destroyed and
   * recreated the entire screen. This caused bugs like:
   * - Input fields losing focus and text
   * - Timers resetting
   * - Minigame state resetting
   *
   * SOLUTION:
   * Only update stage/background dimensions and redraw layer.
   * Individual screens handle their own resize logic if needed.
   *
   * @param container - HTMLDivElement containing the stage
   */
  private handleResize(container: HTMLDivElement): void {
    // Update stage dimensions to match new container size
    this.stage.width(container.offsetWidth);
    this.stage.height(container.offsetHeight);

    // Update background image size if it exists
    if (this.backgroundImage) {
      this.backgroundImage.width(this.stage.width());
      this.backgroundImage.height(this.stage.height());
    }

    // FIXED: Do NOT call renderCurrentPhase() here!
    // Calling it destroys the current screen state (resets forms, timers, etc.)
    // Instead, just redraw the layer to update positions if needed.
    this.layer.batchDraw();  // Efficient redraw without destroying objects
  }

  /**
   * Load Background Image
   *
   * Loads the background image (background1.jpg) and creates a Konva.Image.
   * Once loaded, renders the current phase (LOGIN).
   *
   * BACKGROUND SETTINGS:
   * - Position: (0, 0) - top-left corner
   * - Size: Full stage dimensions
   * - Opacity: 0.3 (30% - subtle, doesn't overpower UI)
   *
   * PHASES WITHOUT BACKGROUND:
   * - LOGIN (clean login screen)
   * - POST_BAKING_ANIMATION (full-screen animation)
   * - NEW_DAY_ANIMATION (full-screen animation)
   *
   * ERROR HANDLING:
   * If image fails to load, log warning and proceed without background.
   */
  private loadBackground(): void {
    const imageObj = new Image();  // Create HTML Image element

    // IMAGE LOAD SUCCESS HANDLER
    imageObj.onload = () => {
      // Create Konva.Image from loaded HTML Image
      this.backgroundImage = new Konva.Image({
        x: 0,                            // Top-left corner
        y: 0,
        image: imageObj,                 // HTML Image object
        width: this.stage.width(),       // Full stage width
        height: this.stage.height(),     // Full stage height
        opacity: 0.3,                    // 30% opacity (subtle background)
      });

      // Start rendering the game
      this.renderCurrentPhase();
    };

    // IMAGE LOAD ERROR HANDLER
    imageObj.onerror = () => {
      console.warn('Background image failed to load');
      // Proceed without background image
      this.renderCurrentPhase();
    };

    // Start loading image
    imageObj.src = '/background1.jpg';
  }

  // ======================================================================
  // AUDIO SYSTEM METHODS
  // ======================================================================

  /**
   * Play Background Music Track
   *
   * Stops all currently playing BGM tracks, then plays the specified track.
   * Does nothing if audio hasn't been unlocked by user interaction.
   *
   * AVAILABLE TRACKS:
   * - 'intro': LOGIN and HOW_TO_PLAY screens
   * - 'story': STORYLINE screen
   * - 'main': ORDER, RECIPE, SHOPPING, CLEANING screens
   * - 'anim': POST_BAKING and NEW_DAY animations
   * - 'endday': DAY_SUMMARY screen
   * - 'baking': BAKING minigame
   * - null: Stop all music
   *
   * AUDIO SYSTEM:
   * 1. Pause all tracks and reset to start
   * 2. Check if audio is unlocked (browser requirement)
   * 3. Play requested track (or stay silent if null)
   *
   * @param track - Which BGM track to play (or null to stop all)
   */
  private playBGM(track: 'intro' | 'story' | 'main' | 'anim' | 'endday' | 'baking' | null): void {
    // Stop all currently playing tracks
    [this.bgmIntro, this.bgmStory, this.bgmMain, this.bgmAnim, this.bgmEndDay, this.bgmbaking].forEach(a => {
        if(a) {
          a.pause();           // Pause playback
          a.currentTime = 0;   // Reset to beginning
        }
    });

    // If audio not unlocked or track is null, stay silent
    if (!this.audioUnlocked || track === null) return;

    // Map track names to Audio objects
    const tracks = {
        intro: this.bgmIntro,
        story: this.bgmStory,
        main: this.bgmMain,
        anim: this.bgmAnim,
        endday: this.bgmEndDay,
        baking: this.bgmbaking
    };

    // Play requested track (catch errors for safety)
    tracks[track]?.play().catch(() => {});
  }

  /**
   * Set Background Music Volume
   *
   * Updates the volume on all BGM tracks to the specified value.
   * Also updates the global bgmVolume property for future tracks.
   *
   * VOLUME SYNCHRONIZATION:
   * This method is called from:
   * 1. Volume slider components on various screens
   * 2. Window event listener for 'bgm-volume-change'
   * 3. Constructor during initialization
   *
   * All BGM tracks always have the same volume (synchronized).
   *
   * @param v - Volume level (0.0 = mute, 1.0 = full volume)
   */
  private setBgmVolume(v: number): void {
    // Update global volume property
    this.bgmVolume = v;

    // Array of all BGM tracks
    const bgms = [
      this.bgmIntro,
      this.bgmStory,
      this.bgmMain,
      this.bgmAnim,
      this.bgmEndDay,
      this.bgmbaking,
    ];

    // Set volume on all tracks
    bgms.forEach(a => {
      if (a) a.volume = v;
    });
  }

  /**
   * Update Background Music for Current Phase
   *
   * Called whenever currentPhase changes. Plays the appropriate BGM track
   * for the current phase.
   *
   * PHASE-TO-MUSIC MAPPING:
   * - LOGIN, HOW_TO_PLAY          → 'intro' music
   * - STORYLINE                   → 'story' music (sad/emotional)
   * - POST_BAKING, NEW_DAY anims  → 'anim' music (upbeat morning)
   * - ORDER, RECIPE, SHOPPING, CLEANING → 'main' music (game theme)
   * - DAY_SUMMARY                 → 'endday' music (reflective)
   * - BAKING                      → 'baking' music (energetic minigame)
   * - Other phases                → No music
   *
   * Does nothing if audio hasn't been unlocked.
   */
  private updateBackgroundMusic(): void {
    // Don't play music if audio not unlocked
    if (!this.audioUnlocked) return;

    // Switch music based on current phase
    switch (this.currentPhase) {
        case GamePhase.LOGIN:
        case GamePhase.HOW_TO_PLAY:
          this.playBGM('intro');
          break;

        case GamePhase.STORYLINE:
          this.playBGM('story');
          break;

        case GamePhase.POST_BAKING_ANIMATION:
        case GamePhase.NEW_DAY_ANIMATION:
          this.playBGM('anim');
          break;

        case GamePhase.ORDER:
        case GamePhase.RECIPE_BOOK:
        case GamePhase.SHOPPING:
        case GamePhase.CLEANING:
          this.playBGM('main');
          break;

        case GamePhase.DAY_SUMMARY:
          this.playBGM('endday');
          break;

        case GamePhase.BAKING:
          this.playBGM('baking');
          break;

        default:
          this.playBGM(null);  // Stop all music
          break;
    }
  }

  // ======================================================================
  // PHASE TRANSITION & CLEANUP METHODS
  // ======================================================================

  /**
   * Cleanup Current Phase
   *
   * Destroys all active minigames, animations, and UI elements before
   * transitioning to a new phase. Critical for preventing memory leaks.
   *
   * CLEANUP STEPS:
   * 1. Destroy active minigame instances (if any)
   * 2. Destroy active animation players (if any)
   * 3. Remove all Konva children from layer (except background image)
   * 4. Redraw layer
   *
   * MEMORY LEAK PREVENTION:
   * Each screen/minigame sets up event listeners, intervals, and Konva objects.
   * If not cleaned up, these accumulate and cause:
   * - Multiple event handlers firing
   * - Multiple timers running
   * - High memory usage
   *
   * ERROR HANDLING:
   * Uses try/catch for each cleanup operation to prevent one failure from
   * blocking others.
   */
  private cleanupCurrentPhase(): void {
    // =============================
    // CLEANUP MINIGAMES
    // =============================

    // Cleanup Baking Minigame (division problems)
    if (this.currentBakingMinigameInstance) {
        this.currentBakingMinigameInstance.cleanup();  // Call minigame's cleanup method
        this.currentBakingMinigameInstance = null;     // Clear reference
    }

    // Cleanup Cleaning Minigame (multiplication problems)
    if (this.currentCleaningMinigame) {
      try {
        this.currentCleaningMinigame.cleanup();  // Call minigame's cleanup method
      } catch (e) {
        console.warn('Error cleaning cleaning minigame:', e);
      }
      this.currentCleaningMinigame = null;  // Clear reference
    }

    // =============================
    // CLEANUP ANIMATIONS
    // =============================

    // Cleanup post-baking animation (12-frame baking sequence)
    if (this.postBakingAnimation) {
      try {
        this.postBakingAnimation.destroy();  // Stop animation and remove from layer
      } catch (e) {
        console.warn('Error destroying postBakingAnimation:', e);
      }
      this.postBakingAnimation = null;  // Clear reference
    }

    // Cleanup new day animation (15-frame sunrise sequence)
    if (this.newDayAnimation) {
      try {
        this.newDayAnimation.destroy();  // Stop animation and remove from layer
      } catch (e) {
        console.warn('Error destroying newDayAnimation:', e);
      }
      this.newDayAnimation = null;  // Clear reference
    }

    // =============================
    // CLEANUP KONVA LAYER CHILDREN
    // =============================

    // Get copy of children array (slice prevents mutation during iteration)
    const children = this.layer.getChildren().slice();

    // Remove all children except background image
    children.forEach(child => {
      try {
        // Don't remove background image (it persists across phases)
        if (this.backgroundImage && child === this.backgroundImage) {
          return;
        }
        child.remove();  // Remove child from layer
      } catch (e) {
        console.warn('Error removing child during cleanup:', e);
      }
    });

    // =============================
    // REDRAW LAYER
    // =============================

    try {
      this.layer.draw();  // Redraw layer to show cleanup results
    } catch (e) {
      console.warn('Error drawing layer after cleanup:', e);
    }
  }

  /**
   * Render Current Phase
   *
   * THE CORE STATE MACHINE METHOD
   *
   * This method is called whenever currentPhase changes. It:
   * 1. Cleans up the previous phase
   * 2. Updates background music
   * 3. Adds background image (if appropriate for phase)
   * 4. Creates and renders the screen/minigame for current phase
   *
   * STATE MACHINE PATTERN:
   * - Each case creates a screen object with a callback
   * - When screen completes its task, it calls the callback
   * - Callback sets currentPhase to next phase
   * - Callback calls renderCurrentPhase() again
   * - Process repeats, creating the game loop
   *
   * EXAMPLE FLOW:
   * 1. currentPhase = LOGIN
   * 2. renderCurrentPhase() creates LoginScreen
   * 3. User enters username, clicks START
   * 4. LoginScreen calls callback with username
   * 5. Callback sets currentPhase = STORYLINE
   * 6. Callback calls renderCurrentPhase()
   * 7. renderCurrentPhase() creates StoryScreen
   * 8. ...and so on
   *
   * BACKGROUND IMAGE LOGIC:
   * Background is NOT shown on:
   * - LOGIN (clean login screen)
   * - POST_BAKING_ANIMATION (fullscreen animation)
   * - NEW_DAY_ANIMATION (fullscreen animation)
   * All other phases show background at 30% opacity.
   */
  private renderCurrentPhase(): void {
    // Log current phase for debugging
    console.log('🎮 Rendering phase:', GamePhase[this.currentPhase]);

    // =============================
    // CLEANUP & MUSIC
    // =============================

    // Destroy all objects from previous phase
    this.cleanupCurrentPhase();

    // Start appropriate music for new phase
    this.updateBackgroundMusic();

    // =============================
    // BACKGROUND IMAGE SETUP
    // =============================

    // Phases that should NOT show background (fullscreen phases)
    const skipBackgroundPhases = [
        GamePhase.LOGIN,                    // Clean login screen
        GamePhase.POST_BAKING_ANIMATION,    // Fullscreen baking animation
        GamePhase.NEW_DAY_ANIMATION         // Fullscreen sunrise animation
    ];

    // Add background to layer if not in skip list
    if (this.backgroundImage && !skipBackgroundPhases.includes(this.currentPhase)) {
      // Add background to layer if not already added
      if (!this.backgroundImage.getParent()) {
        this.layer.add(this.backgroundImage);
      }
      try {
        // Move background to bottom so it's behind all UI elements
        this.backgroundImage.moveToBottom();
      } catch (e) {
        console.warn('Could not move background to bottom:', e);
      }
    }

    // =============================
    // RENDER SCREEN FOR CURRENT PHASE
    // =============================

    /**
     * Switch statement implementing the State Machine.
     * Each case handles one game phase.
     */
    switch (this.currentPhase) {

      // =============================
      // LOGIN PHASE
      // =============================
      /**
       * LOGIN SCREEN
       * - User enters username
       * - Callback: Save username, transition to STORYLINE
       */
      case GamePhase.LOGIN:
        new LoginScreen(this.stage, this.layer, (username) => {
          this.player.username = username;              // Save username to player state
          this.previousPhase = this.currentPhase;       // Track previous phase
          this.currentPhase = GamePhase.STORYLINE;      // Transition to STORYLINE
          this.renderCurrentPhase();                     // Render STORYLINE screen
        });
        break;

      // =============================
      // STORYLINE PHASE
      // =============================
      /**
       * STORY SCREEN
       * - Shows Owl's backstory (escaping trailer park)
       * - Callback: Transition to HOW_TO_PLAY
       */
      case GamePhase.STORYLINE:
        new StoryScreen(this.stage, this.layer, () => {
            this.previousPhase = this.currentPhase;       // Track previous phase
            this.currentPhase = GamePhase.HOW_TO_PLAY;    // Transition to HOW_TO_PLAY
            this.renderCurrentPhase();                     // Render HOW_TO_PLAY screen
        });
        break;

      // =============================
      // HOW_TO_PLAY PHASE
      // =============================
      /**
       * HOW TO PLAY SCREEN
       * - Shows game tutorial/instructions
       * - Has volume slider (need to wire up volume callbacks)
       * - Callback: Transition to ORDER (start main game loop)
       */
      case GamePhase.HOW_TO_PLAY:
        const screen = new HowToPlayScreen(
          this.stage,
          this.layer,
          () => {
            this.previousPhase = this.currentPhase;       // Track previous phase
            this.currentPhase = GamePhase.ORDER;          // Transition to ORDER (start game loop)
            this.renderCurrentPhase();                     // Render ORDER screen
          }
        );

        // Set initial volume on the screen's volume slider
        screen.setVolume(this.bgmVolume);

        // Wire up callback so volume slider changes update GameManager volume
        screen.volumeChangeCallback = (v: number) => {
          this.setBgmVolume(v);
        };
        break;

      // =============================
      // ORDER PHASE
      // =============================
      /**
       * ORDER SCREEN
       * - Shows customer orders for the day
       * - Number of customers based on reputation
       * - Each customer orders cookies
       * - Callback: Save total demand, transition to RECIPE_BOOK
       */
      case GamePhase.ORDER:
        new OrderScreen(
          this.stage,
          this.layer,
          this.player.currentDay,          // Current day number
          this.player.reputation,          // Current reputation (affects customer count)
          (totalDemand, orders) => {
            // Save total demand for this day
            this.player.currentDayDemand = totalDemand;

            // Store a shallow copy of orders for safety (prevents mutation)
            this.customerOrders = orders.map((o) => ({ ...o }));

            this.previousPhase = this.currentPhase;       // Track previous phase
            this.currentPhase = GamePhase.RECIPE_BOOK;    // Transition to RECIPE_BOOK
            this.renderCurrentPhase();                     // Render RECIPE_BOOK screen
          },
        );
        break;

      // =============================
      // RECIPE_BOOK PHASE
      // =============================
      /**
       * RECIPE BOOK SCREEN
       * - Shows cookie recipe requirements
       * - Shows current ingredient inventory
       * - Highlights which ingredients player needs more of (red vs green)
       * - Callback: Transition to SHOPPING
       */
      case GamePhase.RECIPE_BOOK:
        new RecipeBookScreen(
          this.stage,
          this.layer,
          this.player.ingredients,   // Current ingredient inventory
          () => {
            this.previousPhase = this.currentPhase;       // Track previous phase
            this.currentPhase = GamePhase.SHOPPING;       // Transition to SHOPPING
            this.renderCurrentPhase();                     // Render SHOPPING screen
          }
        );
        break;

      // =============================
      // SHOPPING PHASE
      // =============================
      /**
       * SHOPPING SCREEN
       * - Player purchases ingredients
       * - Callback: Deduct funds, add ingredients, transition to BAKING or CLEANING
       *
       * Complex phase with multiple features:
       * - Input validation
       * - Balance checking
       * - View orders modal
       * - Back to recipe book (with saved inputs)
       *
       * See renderShoppingPhase() for full implementation
       */
      case GamePhase.SHOPPING:
        this.renderShoppingPhase();  // Complex logic extracted to separate method
        break;

      // =============================
      // BAKING PHASE
      // =============================
      /**
       * BAKING MINIGAME
       * - Division problems to earn tips
       * - Consumes ingredients to make cookies
       * - Callback: Add tips to funds, transition to POST_BAKING_ANIMATION
       *
       * See renderBakingPhase() for full implementation
       */
      case GamePhase.BAKING:
        this.renderBakingPhase();  // Complex logic extracted to separate method
        break;

      // =============================
      // POST_BAKING_ANIMATION PHASE
      // =============================
      /**
       * POST-BAKING ANIMATION
       * - 12-frame animation showing baked cookies
       * - Plays at 4 FPS
       * - Callback: Transition to CLEANING
       *
       * See renderPostBakingAnimation() for full implementation
       */
      case GamePhase.POST_BAKING_ANIMATION:
        this.renderPostBakingAnimation();  // Complex logic extracted to separate method
        break;

      // =============================
      // CLEANING PHASE
      // =============================
      /**
       * CLEANING MINIGAME
       * - Multiplication problems to clean dishes
       * - Affects reputation
       * - Fines for dirty dishes or skipping
       * - Callback: Update reputation, increment day, transition to DAY_SUMMARY
       *
       * See renderCleaningPhase() for full implementation
       */
      case GamePhase.CLEANING:
        this.renderCleaningPhase();  // Complex logic extracted to separate method
        break;

      // =============================
      // DAY_SUMMARY PHASE
      // =============================
      /**
       * DAY SUMMARY SCREEN
       * - Shows financial summary for the day (sales, expenses, tips, profit)
       * - Callback: Check win/lose conditions, transition to appropriate phase
       *
       * See renderDaySummaryPhase() for full implementation
       */
      case GamePhase.DAY_SUMMARY:
        this.renderDaySummaryPhase();  // Complex logic extracted to separate method
        break;

      // =============================
      // NEW_DAY_ANIMATION PHASE
      // =============================
      /**
       * NEW DAY ANIMATION
       * - 15-frame animation showing sunrise/new day
       * - Plays at 2 FPS
       * - Callback: Transition to ORDER (start new day loop)
       *
       * See renderNewDayAnimation() for full implementation
       */
      case GamePhase.NEW_DAY_ANIMATION:
        this.renderNewDayAnimation();  // Complex logic extracted to separate method
        break;

      // =============================
      // VICTORY PHASE
      // =============================
      /**
       * VICTORY SCREEN
       * - Player reached $1000!
       * - Shows confetti, final stats
       * - Plays win sound
       * - Callback: Reset game, return to LOGIN
       *
       * See renderVictoryPhase() for full implementation
       */
      case GamePhase.VICTORY:
        this.renderVictoryPhase();  // Complex logic extracted to separate method
        break;

      // =============================
      // DEFEAT PHASE
      // =============================
      /**
       * DEFEAT SCREEN
       * - Player went bankrupt
       * - Shows final stats
       * - Plays lose sound
       * - Callback: Reset game, return to LOGIN
       *
       * See renderLosePhase() for full implementation
       */
      case GamePhase.DEFEAT:
        this.renderLosePhase();  // Complex logic extracted to separate method
        break;

      // =============================
      // GAME_OVER PHASE (FALLBACK)
      // =============================
      /**
       * GAME OVER SCREEN (Fallback)
       * - Generic game over screen if needed
       * - Not currently used (VICTORY and DEFEAT are preferred)
       */
      case GamePhase.GAME_OVER:
        this.renderGameOverPhase(); // Fallback implementation if needed
        break;
    }
  }

  // ======================================================================
  // PHASE RENDERING METHODS (Complex phases extracted for clarity)
  // ======================================================================

  /**
   * Render Victory Phase
   *
   * WIN CONDITION: Player has accumulated $1000 or more in funds
   *
   * FEATURES:
   * - Plays win sound effect (once)
   * - Shows victory screen with confetti animation
   * - Displays final cash balance and total days played
   * - Provides "Return Home" button to restart game
   *
   * AUDIO HANDLING:
   * - Sets audioReady flag (legacy code, may be unused)
   * - Checks winPlayedOnce to prevent playing sound multiple times
   * - Resets sound to beginning before playing
   *
   * CALLBACK:
   * When "Return Home" clicked:
   * 1. Reset game state
   * 2. Return to LOGIN phase
   */
  private renderVictoryPhase(): void {
    // Legacy audio ready flag (may be unused)
    this.audioReady = true;

    // Play win sound (only once to prevent spamming)
    if (this.audioReady && !this.winPlayedOnce) {
        this.winSound.currentTime = 0;  // Reset to beginning
        this.winSound.play().catch(()=>{});  // Play (catch errors)
        this.winPlayedOnce = true;  // Set flag to prevent replaying
    }

    // Create and display victory screen
    new VictoryScreen(this.stage, this.layer, {
      cashBalance: this.player.funds,         // Final money amount
      totalDaysPlayed: this.player.currentDay, // How many days it took to win
      onReturnHome: () => {
        this.previousPhase = GamePhase.VICTORY;  // Track previous phase
        this.currentPhase = GamePhase.LOGIN;     // Return to LOGIN
        this.resetGame();                         // Reset all game state
        this.renderCurrentPhase();                // Render LOGIN screen
      },
    });
  }

  /**
   * Render Lose Phase
   *
   * LOSE CONDITION: Player is bankrupt (can't make cookies AND can't afford ingredients)
   *
   * FEATURES:
   * - Plays lose sound effect
   * - Shows defeat screen
   * - Displays final cash balance (likely negative or very low)
   * - Displays total days survived
   * - Provides "Return Home" button to restart game
   *
   * AUDIO HANDLING:
   * - Sets audioReady flag (legacy code, may be unused)
   * - Resets sound to beginning before playing
   * - No "playedOnce" check (lose sound can replay if needed)
   *
   * CALLBACK:
   * When "Return Home" clicked:
   * 1. Remove background image (fresh start)
   * 2. Reset game state
   * 3. Return to LOGIN phase
   */
  private renderLosePhase(): void {
    // Legacy audio ready flag (may be unused)
    this.audioReady = true;

    // Play lose sound
    if (this.audioReady) {
      this.loseSound.currentTime = 0;  // Reset to beginning
      this.loseSound.play().catch(() => {});  // Play (catch errors)
    }

    // Create and display defeat screen
    new LoseScreen(this.stage, this.layer, {
      cashBalance: this.player.funds,         // Final money (likely negative/low)
      totalDaysPlayed: this.player.currentDay, // How many days player survived
      onReturnHome: () => {
        this.previousPhase = GamePhase.DEFEAT;  // Track previous phase

        // Remove background image for fresh start
        this.backgroundImage?.remove();
        this.layer.draw();

        this.currentPhase = GamePhase.LOGIN;  // Return to LOGIN
        this.resetGame();                      // Reset all game state
        this.renderCurrentPhase();             // Render LOGIN screen
      },
    });
  }

  /**
   * Reset Game State
   *
   * Called when player returns to LOGIN from VICTORY or DEFEAT screens.
   * Resets all game state to starting values while preserving username.
   *
   * RESET ACTIONS:
   * 1. Reset player state (funds, ingredients, day, reputation)
   * 2. Reset daily tracking variables (sales, expenses, tips)
   * 3. Clear customer orders
   * 4. Keep username (player doesn't have to re-enter)
   *
   * PRESERVED:
   * - username (so player doesn't have to re-type)
   *
   * RESET TO DEFAULTS:
   * - funds → config.startingFunds (default $500)
   * - ingredients → empty Map
   * - currentDay → 1
   * - reputation → 1.0
   * - dishesToClean → 0
   * - currentDayDemand → 0
   * - daySales, dayExpenses, dayTips → 0
   * - customerOrders → empty array
   */
  private resetGame(): void {
    console.log('Resetting game state');

    // Reset player state
    this.player = {
      username: this.player.username,                    // PRESERVE username
      funds: this.config.startingFunds,                  // Reset to starting money
      ingredients: new Map(),                            // Clear inventory
      breadInventory: [],                                // Clear bread (unused feature)
      maxBreadCapacity: this.config.maxBreadCapacity,   // Reset capacity
      currentDay: 1,                                     // Back to Day 1
      dishesToClean: 0,                                  // No dishes
      reputation: 1.0,                                   // Neutral reputation
      currentDayDemand: 0,                               // No demand yet
    };

    // Reset daily tracking
    this.daySales = 0;
    this.dayExpenses = 0;
    this.dayTips = 0;
    this.customerOrders = [];
  }

  /**
   * Render Post-Baking Animation
   *
   * VISUAL TRANSITION between BAKING minigame and CLEANING minigame.
   *
   * ANIMATION DETAILS:
   * - 12 frames (20.png through 31.png)
   * - 4 FPS (frames per second)
   * - Fullscreen (covers entire stage)
   * - Does not loop (plays once)
   *
   * FRAMES:
   * Images show cookies coming out of oven, cooling down, getting plated.
   * Provides visual feedback that baking is complete.
   *
   * CALLBACK:
   * When animation completes:
   * - Transition to CLEANING phase
   *
   * ERROR HANDLING:
   * If animation fails to load, skip directly to CLEANING.
   */
  private renderPostBakingAnimation(): void {
    // Array of image paths (12 frames: 20.png to 31.png)
    const IMAGE_PATHS = [
      '/20.png', '/21.png', '/22.png', '/23.png', '/24.png', '/25.png',
      '/26.png', '/27.png', '/28.png', '/29.png', '/30.png', '/31.png'
    ];

    // Create animation player
    this.postBakingAnimation = new AnimationPlayer(
      this.layer,                  // Konva layer to render on
      IMAGE_PATHS,                 // Array of image paths
      4,                           // Frame rate: 4 FPS
      0,                           // X position: 0 (top-left)
      0,                           // Y position: 0 (top-left)
      this.stage.width(),          // Width: fullscreen
      this.stage.height(),         // Height: fullscreen
      false,                       // Loop: false (play once)
      () => {
        // CALLBACK: Animation complete, transition to CLEANING
        this.previousPhase = GamePhase.POST_BAKING_ANIMATION;
        this.currentPhase = GamePhase.CLEANING;
        this.renderCurrentPhase();
      }
    );

    // Load all frames, then start animation
    this.postBakingAnimation.load()
      .then(() => {
        // All frames loaded successfully, start playing
        if (this.postBakingAnimation) {
          this.postBakingAnimation.start();
        }
      })
      .catch((error) => {
        // ERROR: Animation failed to load
        console.error('Post-baking animation failed to load:', error);
        this.postBakingAnimation = null;  // Clear reference

        // Skip animation, go directly to CLEANING
        this.previousPhase = GamePhase.POST_BAKING_ANIMATION;
        this.currentPhase = GamePhase.CLEANING;
        this.renderCurrentPhase();
      });
  }

  /**
   * Render New Day Animation
   *
   * VISUAL TRANSITION between DAY_SUMMARY and next ORDER phase.
   *
   * ANIMATION DETAILS:
   * - 15 frames total:
   *   - 12 animation frames (33.png through 44.png)
   *   - 3 duplicate frames (44.png × 3) for pause effect at end
   * - 2 FPS (slower than post-baking, more relaxed pace)
   * - Fullscreen (covers entire stage)
   * - Does not loop (plays once)
   *
   * FRAMES:
   * Images show sunrise, new day dawning, Owl waking up.
   * Provides visual feedback that a new day has started.
   *
   * PAUSE EFFECT:
   * Duplicating last frame (44.png) creates a brief pause at end,
   * giving player time to read "Day X" before transitioning.
   *
   * CALLBACK:
   * When animation completes:
   * - Transition to ORDER phase (start new day loop)
   *
   * ERROR HANDLING:
   * If animation fails to load, skip directly to ORDER.
   */
  private renderNewDayAnimation(): void {
    // Array of image paths (12 frames + 3 duplicates for pause)
    const IMAGE_PATHS = [
      '/33.png', '/34.png', '/35.png', '/36.png', '/37.png', '/38.png',
      '/39.png', '/40.png', '/41.png', '/42.png', '/43.png', '/44.png',
      '/44.png', '/44.png', '/44.png'  // Duplicate last frame for pause effect
    ];

    // Create animation player
    this.newDayAnimation = new AnimationPlayer(
      this.layer,                  // Konva layer to render on
      IMAGE_PATHS,                 // Array of image paths
      2,                           // Frame rate: 2 FPS (slower, more relaxed)
      0,                           // X position: 0 (top-left)
      0,                           // Y position: 0 (top-left)
      this.stage.width(),          // Width: fullscreen
      this.stage.height(),         // Height: fullscreen
      false,                       // Loop: false (play once)
      () => {
        // CALLBACK: Animation complete, transition to ORDER (new day starts)
        this.previousPhase = GamePhase.NEW_DAY_ANIMATION;
        this.currentPhase = GamePhase.ORDER;
        this.renderCurrentPhase();
      }
    );

    // Load all frames, then start animation
    this.newDayAnimation.load()
      .then(() => {
        // All frames loaded successfully, start playing
        if (this.newDayAnimation) {
          this.newDayAnimation.start();
        }
      })
      .catch((error) => {
        // ERROR: Animation failed to load
        console.error('New day animation failed to load:', error);
        this.newDayAnimation = null;  // Clear reference

        // Skip animation, go directly to ORDER
        this.previousPhase = GamePhase.NEW_DAY_ANIMATION;
        this.currentPhase = GamePhase.ORDER;
        this.renderCurrentPhase();
      });
  }

  /**
   * Render Shopping Phase
   *
   * SHOPPING SCREEN - Player purchases ingredients for the day.
   *
   * FEATURES:
   * 1. Display current balance and total cost
   * 2. Input fields for each ingredient (Flour, Sugar, Butter, Chocolate, Baking Soda)
   * 3. "VIEW RECIPE" button - goes back to RECIPE_BOOK
   * 4. "VIEW ORDERS" button - shows customer orders modal
   * 5. "PURCHASE" button - buys ingredients and transitions to next phase
   * 6. Saved inputs - if player goes to RECIPE_BOOK and back, inputs are preserved
   *
   * DAILY TRACKING RESET:
   * Shopping marks the start of a new day's economic cycle, so reset:
   * - daySales = 0
   * - dayExpenses = 0
   * - dayTips = 0
   *
   * PURCHASE CALLBACK:
   * When player clicks PURCHASE:
   * 1. Deduct totalCost from player funds
   * 2. Add purchased quantities to player inventory
   * 3. Add totalCost to dayExpenses (for summary)
   * 4. Clear saved inputs (purchase complete)
   * 5. Check if player can make cookies:
   *    - YES: Transition to BAKING
   *    - NO: Alert player, transition to CLEANING (penalty scenario)
   *
   * RECIPE CALLBACK:
   * When player clicks "VIEW RECIPE":
   * 1. Save current input values (so they're restored when coming back)
   * 2. Transition to RECIPE_BOOK
   *
   * SAVED INPUTS:
   * If player previously went to RECIPE_BOOK and returned, restore their inputs.
   * This is a quality-of-life feature so player doesn't have to re-type everything.
   */
  private renderShoppingPhase(): void {
    // =============================
    // RESET DAILY TRACKING
    // =============================
    // Shopping marks the start of a new day's economic cycle
    this.daySales = 0;     // No sales yet this day
    this.dayExpenses = 0;  // No expenses yet (ingredient purchases will be added)
    this.dayTips = 0;      // No tips yet (earned in baking minigame)

    // =============================
    // CREATE SHOPPING SCREEN
    // =============================
    const shoppingScreen = new ShoppingScreen(
      this.stage,                       // Konva stage
      this.layer,                       // Konva layer
      this.player.funds,                // Current balance (displayed at top)
      this.player.currentDay,           // Current day number (displayed in header)
      this.player.currentDayDemand,     // Total cookies needed (for reference)
      this.customerOrders,              // List of customer orders (shown in modal)

      // =============================
      // PURCHASE CALLBACK
      // =============================
      /**
       * Called when player clicks PURCHASE button.
       *
       * @param purchases - Map of ingredient name → quantity purchased
       * @param totalCost - Total cost of all purchases
       */
      (purchases, totalCost) => {
        // Clear saved inputs (purchase complete)
        this.savedShoppingInputs = undefined;

        // Deduct cost from player funds
        this.player.funds -= totalCost;

        // Add cost to daily expenses (for summary screen)
        this.dayExpenses += totalCost;

        // Add purchased ingredients to inventory
        purchases.forEach((qty, name) => {
          const current = this.player.ingredients.get(name) || 0;  // Get current amount
          this.player.ingredients.set(name, current + qty);         // Add purchased amount
        });

        // Track previous phase
        this.previousPhase = this.currentPhase;

        // Check if player can make at least one cookie
        if (this.canMakeCookies()) {
          // SUCCESS: Player has enough ingredients, proceed to BAKING
          this.currentPhase = GamePhase.BAKING;
        } else {
          // FAILURE: Not enough ingredients to make even one cookie
          // This shouldn't normally happen (ShoppingScreen validates)
          // But if it does, alert player and skip to CLEANING (penalty)
          alert("You don't have enough ingredients! Go wash dishes.");
          this.currentPhase = GamePhase.CLEANING;
        }

        // Render next phase
        this.renderCurrentPhase();
      },

      // =============================
      // RECIPE CALLBACK
      // =============================
      /**
       * Called when player clicks "VIEW RECIPE" button.
       * Saves current inputs and transitions to RECIPE_BOOK.
       */
      () => {
        // Save current input values (Map of ingredient → quantity string)
        this.savedShoppingInputs = shoppingScreen.getIngredientValues();

        // Transition to RECIPE_BOOK
        this.previousPhase = this.currentPhase;
        this.currentPhase = GamePhase.RECIPE_BOOK;
        this.renderCurrentPhase();
      },

      // =============================
      // SAVED INPUTS (OPTIONAL)
      // =============================
      /**
       * If player previously went to RECIPE_BOOK and is now returning,
       * restore their input values.
       *
       * This is undefined on first visit to SHOPPING, but defined if
       * player clicked "VIEW RECIPE" and then came back.
       */
      this.savedShoppingInputs
    );
  }

  /**
   * Render Baking Phase
   *
   * BAKING MINIGAME - Division problems to earn tips.
   *
   * PHASE RESPONSIBILITIES:
   * 1. Calculate how many cookies can be made (limited by ingredients)
   * 2. Calculate how many cookies to sell (limited by demand)
   * 3. Consume ingredients to make cookies
   * 4. Add sales revenue to player funds
   * 5. Set dishes to clean (one per cookie sold)
   * 6. Launch baking minigame for tips
   *
   * COOKIE PRODUCTION:
   * maxCookies = calculateMaxCookies() - How many we CAN make (ingredient constraint)
   * cookiesSold = min(maxCookies, currentDayDemand) - How many we WILL sell (demand constraint)
   *
   * EXAMPLE:
   * - Player has ingredients for 10 cookies (maxCookies = 10)
   * - Customers ordered 7 cookies (currentDayDemand = 7)
   * - Result: cookiesSold = 7 (sell only what's ordered)
   *
   * INGREDIENT CONSUMPTION:
   * For each cookie sold, deduct recipe amounts from inventory:
   * - Flour: -3 cups per cookie
   * - Sugar: -1 cup per cookie
   * - Butter: -8 tbsp per cookie
   * - Chocolate: -1 cup per cookie
   * - Baking Soda: -2 tsp per cookie
   *
   * REVENUE CALCULATION:
   * revenue = cookiesSold × $15 (config.cookiePrice)
   * Add to player funds and track as daySales.
   *
   * DISHES TO CLEAN:
   * Each cookie sold creates one dirty dish.
   * dishesToClean = cookiesSold
   * These dishes must be cleaned in CLEANING phase (or pay fines).
   *
   * MINIGAME CALLBACK:
   * When minigame ends (play or skip):
   * 1. Calculate tips earned ($5 per correct answer)
   * 2. Add tips to player funds
   * 3. Track tips as dayTips (for summary)
   * 4. Transition to POST_BAKING_ANIMATION
   *
   * TIP CALCULATION:
   * tip = result.correctAnswers × $5
   * Example: 10 correct answers = $50 in tips
   */
  private renderBakingPhase(): void {
    // =============================
    // CALCULATE COOKIE PRODUCTION
    // =============================

    // Calculate max cookies we CAN make (limited by ingredients)
    const maxCookies = this.calculateMaxCookies();

    // Calculate cookies we WILL sell (limited by demand)
    // Don't make more than customers ordered (excess would be waste)
    const cookiesSold = Math.min(maxCookies, this.player.currentDayDemand);

    // =============================
    // CONSUME INGREDIENTS & EARN REVENUE
    // =============================

    if (cookiesSold > 0) {
      // CONSUME INGREDIENTS
      // For each ingredient in recipe, deduct (amount × cookiesSold)
      this.cookieRecipe.forEach((needed, ingredient) => {
        const totalNeeded = needed * cookiesSold;  // Total amount for all cookies
        const current = this.player.ingredients.get(ingredient) || 0;
        this.player.ingredients.set(ingredient, current - totalNeeded);
      });

      // EARN REVENUE
      // Revenue = cookies sold × price per cookie ($15)
      const revenue = cookiesSold * this.config.cookiePrice;
      this.player.funds += revenue;     // Add to player funds
      this.daySales = revenue;          // Track for summary screen

      // SET DISHES TO CLEAN
      // One dish per cookie sold
      this.player.dishesToClean = cookiesSold;
    } else {
      // No cookies sold (shouldn't happen - shopping validates)
      // Set dishes to 0 to be safe
      this.player.dishesToClean = 0;
    }

    // =============================
    // LAUNCH BAKING MINIGAME
    // =============================

    /**
     * Create BakingMinigame instance
     *
     * PARAMETERS:
     * - stage: Konva stage
     * - layer: Konva layer
     * - cookiesSold: Number of cookies sold (displayed for context)
     * - callback: Called when minigame ends
     */
    this.currentBakingMinigameInstance = new BakingMinigame(
      this.stage,
      this.layer,
      cookiesSold,  // Number of cookies sold (displayed to player)

      /**
       * MINIGAME CALLBACK
       *
       * Called when baking minigame ends (player finishes or skips).
       *
       * @param result - MinigameResult object with correctAnswers, mistakes, etc.
       * @param skipped - Whether player skipped the minigame
       */
      (result, skipped) => {
        // Clear minigame reference (will be cleaned up in cleanupCurrentPhase)
        this.currentBakingMinigameInstance = null;

        // CALCULATE TIPS
        // Tip = $5 per correct answer (UPDATED from old $2 rate)
        const tip = result.correctAnswers * 5;

        // ADD TIPS TO FUNDS
        this.player.funds += tip;

        // TRACK TIPS FOR SUMMARY
        this.dayTips += tip;

        // TRANSITION TO POST_BAKING_ANIMATION
        this.previousPhase = GamePhase.BAKING;
        this.currentPhase = GamePhase.POST_BAKING_ANIMATION;
        this.renderCurrentPhase();
      }
    );
  }

  /**
   * Render Cleaning Phase
   *
   * CLEANING MINIGAME - Multiplication problems for reputation management.
   *
   * PHASE RESPONSIBILITIES:
   * 1. Launch cleaning minigame with dishesToClean count
   * 2. Handle reputation changes based on performance
   * 3. Apply fines for dirty dishes or skipping
   * 4. Clamp reputation to valid range (0.2 to 1.5)
   * 5. Increment currentDay
   * 6. Transition to DAY_SUMMARY
   *
   * REPUTATION SYSTEM:
   *
   * IF SKIPPED:
   * - Reputation: -0.2 (major penalty)
   * - Fine: $50 (all dishes dirty)
   * - Message: "You skipped cleaning! Customers noticed the mess."
   *
   * IF PLAYED:
   * - Reputation: +0.05 (reward for effort, even if not all dishes cleaned)
   * - Fine: $10 per dirty dish (leftover dishes)
   * - Message: "Good effort! But some dishes remain dirty."
   *
   * LEFTOVER DISHES:
   * leftover = dishesToClean - correctAnswers
   * Example: 7 dishes, 5 correct answers → 2 leftover → $20 fine
   *
   * REPUTATION CLAMPING:
   * After changes, clamp reputation to valid range:
   * - Minimum: 0.2 (can't go below, always get 1-2 customers)
   * - Maximum: 1.5 (can't go above, max 6-7 customers)
   *
   * REPUTATION IMPACT:
   * Reputation affects customer count in next ORDER phase:
   * - 0.2 reputation → 1-2 customers
   * - 1.0 reputation → 4-5 customers
   * - 1.5 reputation → 6-7 customers
   *
   * DAY INCREMENT:
   * After cleaning, increment currentDay (new day starts after summary).
   *
   * MINIGAME CALLBACK:
   * When minigame ends:
   * 1. Update reputation based on skip/play
   * 2. Apply fines for dirty dishes
   * 3. Add fines to dayExpenses
   * 4. Clamp reputation to valid range
   * 5. Increment day counter
   * 6. Transition to DAY_SUMMARY
   */
  private renderCleaningPhase(): void {
    // =============================
    // LAUNCH CLEANING MINIGAME
    // =============================

    /**
     * Create CleaningMinigame instance
     *
     * PARAMETERS:
     * - stage: Konva stage
     * - layer: Konva layer
     * - dishesToClean: Number of dishes to clean (from cookies sold)
     * - callback: Called when minigame ends
     */
    this.currentCleaningMinigame = new CleaningMinigame(
      this.stage,
      this.layer,
      this.player.dishesToClean,  // Number of dirty dishes

      /**
       * MINIGAME CALLBACK
       *
       * Called when cleaning minigame ends (player finishes or skips).
       *
       * @param result - MinigameResult object with correctAnswers, mistakes, etc.
       * @param skipped - Whether player skipped the minigame
       */
      (result, skipped) => {
        // Clear minigame reference (will be cleaned up in cleanupCurrentPhase)
        this.currentCleaningMinigame = null;

        // =============================
        // REPUTATION & FINE CALCULATION
        // =============================

        if (skipped) {
          // PLAYER SKIPPED CLEANING

          // REPUTATION PENALTY: -0.2 (major penalty)
          this.player.reputation -= 0.2;

          // FINE: $50 (all dishes remain dirty)
          const fine = 50;
          this.player.funds -= fine;         // Deduct from funds
          this.dayExpenses += fine;          // Track for summary

        } else {
          // PLAYER COMPLETED CLEANING MINIGAME

          // REPUTATION REWARD: +0.05 (even if not all dishes cleaned)
          // Reward for effort, regardless of performance
          this.player.reputation += 0.05;

          // CALCULATE LEFTOVER DISHES
          // leftover = total dishes - correct answers
          const leftover = this.player.dishesToClean - result.correctAnswers;

          // FINE FOR LEFTOVER DISHES
          // $10 per dirty dish
          if(leftover > 0) {
              const fine = leftover * 10;
              this.player.funds -= fine;     // Deduct from funds
              this.dayExpenses += fine;      // Track for summary
          }
        }

        // =============================
        // CLAMP REPUTATION TO VALID RANGE
        // =============================

        // Reputation must stay between 0.2 (min) and 1.5 (max)
        this.player.reputation = Math.max(
          0.2,                             // Minimum reputation
          Math.min(this.player.reputation, 1.5)  // Maximum reputation
        );

        // =============================
        // INCREMENT DAY
        // =============================

        // Cleaning marks the end of current day
        // Increment day counter (new day starts after summary)
        this.player.currentDay++;

        // =============================
        // TRANSITION TO DAY_SUMMARY
        // =============================

        this.previousPhase = GamePhase.CLEANING;
        this.currentPhase = GamePhase.DAY_SUMMARY;
        this.renderCurrentPhase();
      }
    );
  }

  /**
   * Render Day Summary Phase
   *
   * DAY SUMMARY SCREEN - Shows financial summary for the completed day.
   *
   * DISPLAY INFORMATION:
   * - Day number (just completed)
   * - Sales: Revenue from cookie sales (green, positive)
   * - Tips: Tips earned from baking minigame (gold, positive)
   * - Expenses: Ingredient costs + fines (red, negative)
   * - Net Profit/Loss: (sales + tips) - expenses (green if positive, red if negative)
   * - Current Funds: Updated balance after all transactions (blue)
   *
   * FINANCIAL CALCULATIONS:
   * All values are tracked throughout the day:
   * - daySales: Set in renderBakingPhase (cookiesSold × $15)
   * - dayTips: Set in renderBakingPhase callback (correctAnswers × $5)
   * - dayExpenses: Set in renderShoppingPhase + renderCleaningPhase (purchases + fines)
   * - player.funds: Continuously updated throughout day
   *
   * EXAMPLE SUMMARY:
   * Day 3
   * -----------------
   * Sales:    +$105.00  (7 cookies × $15)
   * Tips:     +$25.00   (5 correct answers × $5)
   * Expenses: -$80.75   ($58.75 ingredients + $22 fines)
   * -----------------
   * Net:      +$49.25
   * Balance:  $574.25
   *
   * CALLBACK:
   * When player clicks CONTINUE:
   * 1. Check WIN condition (funds >= $1000)
   * 2. Check LOSE condition (bankruptcy)
   * 3. Otherwise, transition to NEW_DAY_ANIMATION
   *
   * WIN/LOSE PRIORITY:
   * - Win check comes first (player reached goal!)
   * - Bankruptcy check second (can't continue)
   * - New day third (normal progression)
   */
  private renderDaySummaryPhase(): void {
    // =============================
    // CREATE DAY SUMMARY SCREEN
    // =============================

    /**
     * Create DaySummaryScreen
     *
     * PARAMETERS:
     * - stage: Konva stage
     * - layer: Konva layer
     * - currentDay - 1: Day number (subtract 1 because day was incremented in cleaning)
     * - daySales: Revenue from cookie sales
     * - dayExpenses: Ingredient costs + fines
     * - player.funds: Current balance after all transactions
     * - dayTips: Tips earned from baking minigame
     * - callback: Called when player clicks CONTINUE
     */
    new DaySummaryScreen(
      this.stage,
      this.layer,
      this.player.currentDay - 1,  // Day just completed (currentDay already incremented)
      this.daySales,                // Cookie sales revenue
      this.dayExpenses,             // Ingredient purchases + fines
      this.player.funds,            // Current balance
      this.dayTips,                 // Tips from baking minigame

      /**
       * CONTINUE CALLBACK
       *
       * Called when player clicks CONTINUE button.
       * Checks win/lose conditions and transitions to appropriate phase.
       */
      () => {
        // Track previous phase
        this.previousPhase = this.currentPhase;

        // =============================
        // WIN/LOSE CONDITION CHECKS
        // =============================

        // CHECK WIN CONDITION
        // Player has accumulated enough money to escape trailer park!
        if (this.player.funds >= this.config.winThreshold) {
            this.currentPhase = GamePhase.VICTORY;  // Transition to VICTORY screen
        }
        // CHECK LOSE CONDITION
        // Player is bankrupt (can't make cookies AND can't afford ingredients)
        else if (this.checkBankruptcy()) {
            this.currentPhase = GamePhase.DEFEAT;   // Transition to DEFEAT screen
        }
        // NORMAL PROGRESSION
        // Neither win nor lose, continue to next day
        else {
            this.currentPhase = GamePhase.NEW_DAY_ANIMATION;  // Transition to NEW_DAY animation
        }

        // Render next phase
        this.renderCurrentPhase();
      }
    );
  }

  // ======================================================================
  // GAME LOGIC HELPER METHODS
  // ======================================================================

  /**
   * Calculate Maximum Cookies
   *
   * Determines the maximum number of cookies that can be made with
   * current ingredient inventory.
   *
   * ALGORITHM:
   * For each ingredient in recipe:
   *   1. Get amount player has in inventory
   *   2. Calculate how many cookies that ingredient can make
   *      canMake = floor(has / needed)
   *   3. Track the MINIMUM across all ingredients
   *
   * The ingredient with the LOWEST canMake value is the BOTTLENECK.
   *
   * EXAMPLE 1: Balanced Inventory
   * Recipe: Flour(3), Sugar(1), Butter(8), Chocolate(1), Baking Soda(2)
   * Inventory: Flour(30), Sugar(10), Butter(80), Chocolate(10), Baking Soda(20)
   * Calculations:
   *   - Flour: 30/3 = 10 cookies
   *   - Sugar: 10/1 = 10 cookies
   *   - Butter: 80/8 = 10 cookies
   *   - Chocolate: 10/1 = 10 cookies
   *   - Baking Soda: 20/2 = 10 cookies
   * Result: maxCookies = 10 (all ingredients balanced)
   *
   * EXAMPLE 2: Bottleneck (Chocolate shortage)
   * Recipe: Flour(3), Sugar(1), Butter(8), Chocolate(1), Baking Soda(2)
   * Inventory: Flour(30), Sugar(10), Butter(80), Chocolate(2), Baking Soda(20)
   * Calculations:
   *   - Flour: 30/3 = 10 cookies
   *   - Sugar: 10/1 = 10 cookies
   *   - Butter: 80/8 = 10 cookies
   *   - Chocolate: 2/1 = 2 cookies ← BOTTLENECK!
   *   - Baking Soda: 20/2 = 10 cookies
   * Result: maxCookies = 2 (limited by Chocolate)
   *
   * EDGE CASES:
   * - Empty inventory: Returns 0
   * - Missing ingredient: Returns 0 (can't make any)
   * - Infinity result: Returns 0 (no valid bottleneck)
   *
   * @returns Maximum number of cookies that can be made
   */
  private calculateMaxCookies(): number {
    let maxCookies = Infinity;  // Start with infinity, find minimum

    // Check each ingredient in the recipe
    this.cookieRecipe.forEach((needed, ingredient) => {
      // Get amount player has in inventory (0 if none)
      const has = this.player.ingredients.get(ingredient) || 0;

      // Calculate how many cookies this ingredient can make
      // Use floor to get whole number of cookies
      const canMake = Math.floor(has / needed);

      // Update maxCookies to the minimum across all ingredients
      // This finds the bottleneck ingredient
      if (canMake < maxCookies) {
        maxCookies = canMake;
      }
    });

    // If maxCookies is still Infinity, no valid recipe found (return 0)
    // Otherwise, return the calculated maximum
    return maxCookies === Infinity ? 0 : maxCookies;
  }

  /**
   * Can Make Cookies
   *
   * Simple check: Can the player make at least ONE cookie?
   *
   * Used to validate shopping purchases and determine if player
   * can proceed to BAKING phase.
   *
   * @returns true if player can make at least 1 cookie, false otherwise
   */
  private canMakeCookies(): boolean {
    return this.calculateMaxCookies() > 0;
  }

  /**
   * Check Bankruptcy
   *
   * LOSE CONDITION LOGIC
   *
   * Player is bankrupt if BOTH conditions are true:
   * 1. Can't make any cookies (no ingredients)
   * 2. Can't afford to buy ingredients for one cookie
   *
   * BANKRUPTCY CONDITIONS:
   * - CAN make cookies → NOT bankrupt (can sell cookies for money)
   * - CAN'T make cookies BUT has funds >= $8.25 → NOT bankrupt (can buy ingredients)
   * - CAN'T make cookies AND funds < $8.25 → BANKRUPT! (stuck, can't recover)
   *
   * COST OF ONE COOKIE:
   * $8.25 (Flour $1.50 + Sugar $0.75 + Butter $2.00 + Chocolate $3.00 + Baking Soda $1.00)
   *
   * EXAMPLES:
   *
   * Example 1: NOT Bankrupt (has ingredients)
   * - funds: $5
   * - ingredients: Enough for 2 cookies
   * - Result: NOT bankrupt (can make cookies, sell for $30, recover)
   *
   * Example 2: NOT Bankrupt (can afford ingredients)
   * - funds: $10
   * - ingredients: Empty
   * - Result: NOT bankrupt (can buy ingredients for 1 cookie, sell for $15, profit $6.75)
   *
   * Example 3: BANKRUPT
   * - funds: $5
   * - ingredients: Empty
   * - Result: BANKRUPT (can't make cookies, can't afford $8.25 for ingredients, stuck)
   *
   * @returns true if player is bankrupt, false otherwise
   */
  private checkBankruptcy(): boolean {
    // Check 1: Can player make cookies with current ingredients?
    if (this.canMakeCookies()) {
      return false;  // NOT bankrupt (can make and sell cookies)
    }

    // Check 2: Can player afford to buy ingredients for one cookie?
    if (this.player.funds >= this.getCostOfOneCookie()) {
      return false;  // NOT bankrupt (can buy ingredients, make cookies, recover)
    }

    // Both checks failed: Can't make cookies AND can't afford ingredients
    return true;  // BANKRUPT! (game over)
  }

  /**
   * Render Game Over Phase (Fallback)
   *
   * Generic game over screen if needed.
   * Currently not used - VICTORY and DEFEAT screens are preferred.
   *
   * This method is a placeholder for potential future use.
   */
  private renderGameOverPhase(): void {
    /* Fallback implementation if needed */
  }
}
