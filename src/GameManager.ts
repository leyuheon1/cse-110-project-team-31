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

export class GameManager {
  private stage: Konva.Stage;
  private layer: Konva.Layer;
  private currentPhase: GamePhase;
  private previousPhase: GamePhase;
  private player: PlayerState;
  private config = ConfigManager.getInstance().getConfig();

  private currentBakingMinigameInstance: BakingMinigame | null = null;
  private currentCleaningMinigame: CleaningMinigame | null = null;
  private postBakingAnimation: AnimationPlayer | null = null;
  private newDayAnimation: AnimationPlayer | null = null;

  private backgroundImage: Konva.Image | null = null;
  private loginBackgroundImage: Konva.Image | null = null;
  private daySales: number = 0;
  private dayExpenses: number = 0;
  private dayTips: number = 0;
  private customerOrders: Array<{customerNum: number, cookieCount: number}> = [];

  private cookieRecipe: Map<string, number> = new Map([
    ['Flour', 3],
    ['Sugar', 1],
    ['Butter', 8],
    ['Chocolate', 1],
    ['Baking Soda', 2],
  ]);

  private ingredientPrices: Map<string, number> = new Map([
    ['Flour', 0.5],
    ['Sugar', 0.75],
    ['Butter', 0.25],
    ['Chocolate', 3],
    ['Baking Soda', 0.5],
  ]);

  constructor(container: HTMLDivElement) {
    this.stage = new Konva.Stage({
      container,
      width: container.offsetWidth,
      height: container.offsetHeight,
    });
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);
    this.currentPhase = GamePhase.LOGIN;
    this.previousPhase = GamePhase.LOGIN;

    this.player = {
      username: '',
      funds: this.config.startingFunds,
      ingredients: new Map(),
      breadInventory: [],
      maxBreadCapacity: this.config.maxBreadCapacity,
      currentDay: 1,
      dishesToClean: 0,
      reputation: 1.0,
      currentDayDemand: 0,
    };

    window.addEventListener('resize', () => this.handleResize(container));
    this.loadBackground();
  }

  private handleResize(container: HTMLDivElement): void {
    this.stage.width(container.offsetWidth);
    this.stage.height(container.offsetHeight);
    if (this.backgroundImage) {
      this.backgroundImage.width(this.stage.width());
      this.backgroundImage.height(this.stage.height());
    }
    this.renderCurrentPhase();
  }

  private loadBackground(): void {
    const imageObj = new Image();
    imageObj.onload = () => {
      this.backgroundImage = new Konva.Image({
        x: 0,
        y: 0,
        image: imageObj,
        width: this.stage.width(),
        height: this.stage.height(),
        opacity: 0.3,
      });
      // Do not add to layer here; renderCurrentPhase will add if needed.
      this.renderCurrentPhase();
    };
    imageObj.onerror = () => {
      console.error('Failed to load background image');
      this.renderCurrentPhase();
    };
    imageObj.src = '/background1.jpg';
  }

  // ===== CRITICAL FIX: Proper cleanup before phase transitions =====
  private cleanupCurrentPhase(): void {
    console.log('🧹 Cleaning up current phase:', GamePhase[this.currentPhase]);

    // Stop and destroy all animations FIRST
    if (this.currentBakingMinigameInstance) {
      console.log('  - Cleaning up baking minigame');
      try {
        this.currentBakingMinigameInstance.cleanup();
      } catch (e) {
        console.warn('Error cleaning baking minigame:', e);
      }
      this.currentBakingMinigameInstance = null;
    }

    if (this.currentCleaningMinigame) {
      console.log('  - Cleaning up cleaning minigame');
      try {
        this.currentCleaningMinigame.cleanup();
      } catch (e) {
        console.warn('Error cleaning cleaning minigame:', e);
      }
      this.currentCleaningMinigame = null;
    }

    if (this.postBakingAnimation) {
      console.log('  - Destroying post-baking animation');
      try {
        this.postBakingAnimation.destroy();
      } catch (e) {
        console.warn('Error destroying postBakingAnimation:', e);
      }
      this.postBakingAnimation = null;
    }

    if (this.newDayAnimation) {
      console.log('  - Destroying new day animation');
      try {
        this.newDayAnimation.destroy();
      } catch (e) {
        console.warn('Error destroying newDayAnimation:', e);
      }
      this.newDayAnimation = null;
    }

    // Remove (not destroy) children from layer so background/image nodes can be reused safely.
    // Keep the backgroundImage attached if it currently exists on this.layer.
    const children = this.layer.getChildren().slice(); // Clone array to avoid mutation issues during iteration
    children.forEach(child => {
      try {
        if (this.backgroundImage && child === this.backgroundImage) {
          // skip removing the background if we want to keep it; leave in layer
          return;
        }
        // remove() detaches node but keeps it valid for potential reuse
        child.remove();
      } catch (err) {
        console.warn('Error removing child during cleanup:', err);
      }
    });

    // Ensure layer redraw so UI reflects cleanup
    try {
      this.layer.draw();
    } catch (e) {
      // defensive
      console.warn('Error drawing layer after cleanup:', e);
    }

    console.log('✅ Cleanup complete');
  }

  private renderCurrentPhase(): void {
    console.log('🎮 Rendering phase:', GamePhase[this.currentPhase]);

    // Clean up before rendering new phase
    this.cleanupCurrentPhase();

    // Add background if needed (NOT for LOGIN or ANIMATION phases)
    const skipBackgroundPhases = [
      GamePhase.LOGIN,
      GamePhase.POST_BAKING_ANIMATION,
      GamePhase.NEW_DAY_ANIMATION
    ];

    if (this.backgroundImage && !skipBackgroundPhases.includes(this.currentPhase)) {
      // Only add background if it isn't already attached to a parent layer
      if (!this.backgroundImage.getParent()) {
        this.layer.add(this.backgroundImage);
      }
      // Always move to bottom to keep UI ordered
      try {
        this.backgroundImage.moveToBottom();
      } catch (e) {
        // defensive: if moveToBottom fails, log and continue
        console.warn('Could not move background to bottom:', e);
      }
    }

    switch (this.currentPhase) {
      case GamePhase.LOGIN:
        new LoginScreen(this.stage, this.layer, (username) => {
          this.player.username = username;
          this.previousPhase = this.currentPhase;
          this.currentPhase = GamePhase.STORYLINE;
          this.renderCurrentPhase();
        });
        break;
      case GamePhase.STORYLINE:
        new StoryScreen(this.stage, this.layer, () => {
          this.previousPhase = this.currentPhase;
          this.currentPhase = GamePhase.HOW_TO_PLAY;
          this.renderCurrentPhase();
        });
        break;
      case GamePhase.HOW_TO_PLAY:
        new HowToPlayScreen(this.stage, this.layer, () => {
          this.previousPhase = this.currentPhase;
          this.currentPhase = GamePhase.ORDER;
          this.renderCurrentPhase();
        });
        break;
      case GamePhase.ORDER:
        new OrderScreen(
          this.stage,
          this.layer,
          this.player.currentDay,
          this.player.reputation,
          (totalDemand, customerOrders) => {
            this.player.currentDayDemand = totalDemand;

            // Validate customerOrders to avoid runtime errors in ShoppingScreen/modal onload
            if (!Array.isArray(customerOrders)) {
              console.error('OrderScreen returned invalid customerOrders (expected Array):', customerOrders);
              // Try to coerce common shapes into array if possible, otherwise fallback to empty array
              if (customerOrders && typeof customerOrders === 'object') {
                // If the object contains an `orders` array, use it
                if (Array.isArray((customerOrders as any).orders)) {
                  this.customerOrders = (customerOrders as any).orders;
                } else {
                  // Try to convert object values to array of objects (best effort)
                  try {
                    const coerced = Object.values(customerOrders).filter((v) => v && typeof v === 'object');
                    this.customerOrders = coerced.length ? (coerced as any) : [];
                    if (this.customerOrders.length === 0) {
                      console.warn('Coercion produced empty customerOrders; using [] fallback.');
                    }
                  } catch (e) {
                    console.warn('Failed to coerce customerOrders; using empty array.', e);
                    this.customerOrders = [];
                  }
                }
              } else {
                this.customerOrders = [];
              }
            } else {
              this.customerOrders = customerOrders;
            }

            this.previousPhase = this.currentPhase;
            this.currentPhase = GamePhase.RECIPE_BOOK;
            this.renderCurrentPhase();
          }
        );
        break;
      case GamePhase.RECIPE_BOOK:
        new RecipeBookScreen(this.stage, this.layer, this.player.ingredients, () => {
          this.previousPhase = this.currentPhase;
          this.currentPhase = GamePhase.SHOPPING;
          this.renderCurrentPhase();
        });
        break;
      case GamePhase.SHOPPING:
        this.renderShoppingPhase();
        break;
      case GamePhase.BAKING:
        this.renderBakingPhase();
        break;
      case GamePhase.POST_BAKING_ANIMATION:
        this.renderPostBakingAnimation();
        break;
      case GamePhase.CLEANING:
        this.renderCleaningPhase();
        break;
      case GamePhase.DAY_SUMMARY:
        this.renderDaySummaryPhase();
        break;
      case GamePhase.NEW_DAY_ANIMATION:
        this.renderNewDayAnimation();
        break;
      case GamePhase.VICTORY:
        this.renderVictoryPhase();
        break;
      case GamePhase.DEFEAT:
        this.renderLosePhase();
        break;
      case GamePhase.GAME_OVER:
        this.renderGameOverPhase();
        break;
    }
  }

  private renderVictoryPhase(): void {
    new VictoryScreen(this.stage, this.layer, {
      cashBalance: this.player.funds,
      totalDaysPlayed: this.player.currentDay,
      onExit: () => {
        this.previousPhase = GamePhase.VICTORY;
        this.currentPhase = GamePhase.LOGIN;
        this.resetGame(); // Reset game state
        this.renderCurrentPhase();
      },
      onReturnHome: () => {
        this.previousPhase = GamePhase.VICTORY;
        this.currentPhase = GamePhase.HOW_TO_PLAY;
        this.resetGame(); // Reset game state
        this.renderCurrentPhase();
      },
    });
  }

  private renderLosePhase(): void {
    new LoseScreen(this.stage, this.layer, {
      cashBalance: this.player.funds,
      totalDaysPlayed: this.player.currentDay,
      onExit: () => {
        this.previousPhase = GamePhase.DEFEAT;
        this.currentPhase = GamePhase.LOGIN;
        this.resetGame(); // Reset game state
        this.renderCurrentPhase();
      },
      onRetry: () => {
        this.previousPhase = GamePhase.DEFEAT;
        this.currentPhase = GamePhase.HOW_TO_PLAY;
        this.resetGame(); // Reset game state
        this.renderCurrentPhase();
      },
    });
  }

  // ===== NEW: Reset game state =====
  private resetGame(): void {
    console.log('Resetting game state');
    this.player = {
      username: this.player.username, // Keep username
      funds: this.config.startingFunds,
      ingredients: new Map(),
      breadInventory: [],
      maxBreadCapacity: this.config.maxBreadCapacity,
      currentDay: 1,
      dishesToClean: 0,
      reputation: 1.0,
      currentDayDemand: 0,
    };
    this.daySales = 0;
    this.dayExpenses = 0;
    this.dayTips = 0;
    this.customerOrders = [];
  }

  private renderPostBakingAnimation(): void {
    console.log('Starting post-baking animation');

    const IMAGE_PATHS = [
      '/20.png', '/21.png', '/22.png', '/23.png', '/24.png', '/25.png',
      '/26.png', '/27.png', '/28.png', '/29.png', '/30.png', '/31.png'
    ];

    this.postBakingAnimation = new AnimationPlayer(
      this.layer,
      IMAGE_PATHS,
      4,
      0,
      0,
      this.stage.width(),
      this.stage.height(),
      false,
      () => {
        console.log('Post-baking animation complete');
        this.previousPhase = GamePhase.POST_BAKING_ANIMATION;
        this.currentPhase = GamePhase.CLEANING;
        this.renderCurrentPhase();
      }
    );

    this.postBakingAnimation
      .load()
      .then(() => {
        console.log('Post-baking animation loaded, starting playback');
        // Check if animation still exists (wasn't cleaned up during load)
        if (this.postBakingAnimation) {
          this.postBakingAnimation.start();
        } else {
          console.warn('Post-baking animation was destroyed during load');
        }
      })
      .catch((error) => {
        console.error('Post-baking animation failed to load:', error);
        this.postBakingAnimation = null;
        this.previousPhase = GamePhase.POST_BAKING_ANIMATION;
        this.currentPhase = GamePhase.CLEANING;
        this.renderCurrentPhase();
      });
  }

  private renderNewDayAnimation(): void {
    console.log('Starting new day animation');

    const IMAGE_PATHS = [
      '/33.png', '/34.png', '/35.png', '/36.png', '/37.png', '/38.png',
      '/39.png', '/40.png', '/41.png', '/42.png', '/43.png', '/44.png',
      '/44.png', '/44.png', '/44.png'
    ];

    this.newDayAnimation = new AnimationPlayer(
      this.layer,
      IMAGE_PATHS,
      2,
      0,
      0,
      this.stage.width(),
      this.stage.height(),
      false,
      () => {
        console.log('New day animation complete');
        this.previousPhase = GamePhase.NEW_DAY_ANIMATION;
        this.currentPhase = GamePhase.ORDER;
        this.renderCurrentPhase();
      }
    );

    this.newDayAnimation
      .load()
      .then(() => {
        console.log(' New day animation loaded, starting playback');
        // Check if animation still exists (wasn't cleaned up during load)
        if (this.newDayAnimation) {
          this.newDayAnimation.start();
        } else {
          console.warn('New day animation was destroyed during load');
        }
      })
      .catch((error) => {
        console.error('New day animation failed to load:', error);
        this.newDayAnimation = null;
        this.previousPhase = GamePhase.NEW_DAY_ANIMATION;
        this.currentPhase = GamePhase.ORDER;
        this.renderCurrentPhase();
      });
  }

  private renderShoppingPhase(): void {
    this.daySales = 0;
    this.dayExpenses = 0;
    this.dayTips = 0;
    new ShoppingScreen(
      this.stage,
      this.layer,
      this.player.funds,
      this.player.currentDay,
      this.player.currentDayDemand, // ADDED: Keep track of day demand centrally to use it across pages
      this.customerOrders,
      (purchases, totalCost) => {
        this.player.funds -= totalCost;
        this.dayExpenses += totalCost;
        purchases.forEach((qty, name) => {
          const current = this.player.ingredients.get(name) || 0;
          this.player.ingredients.set(name, current + qty);
        });
        this.previousPhase = this.currentPhase;
        if (this.canMakeCookies()) this.currentPhase = GamePhase.BAKING;
        else {
          alert("You don't have enough ingredients to make even one cookie! Go wash dishes.");
          this.currentPhase = GamePhase.CLEANING;
        }
        this.renderCurrentPhase();
      },
      () => {
        this.previousPhase = this.currentPhase;
        this.currentPhase = GamePhase.RECIPE_BOOK;
        this.renderCurrentPhase();
      }
    );
  }

  private calculateMaxCookies(): number {
    let maxCookies = Infinity;
    this.cookieRecipe.forEach((needed, ingredient) => {
      const has = this.player.ingredients.get(ingredient) || 0;
      const canMake = Math.floor(has / needed);
      if (canMake < maxCookies) {
        maxCookies = canMake;
      }
    });
    return maxCookies === Infinity ? 0 : maxCookies;
  }

  private renderBakingPhase(): void {
    const maxCookiesFromIngredients = this.calculateMaxCookies();
    const cookiesSold = Math.min(maxCookiesFromIngredients, this.player.currentDayDemand);

    if (cookiesSold > 0) {
      this.cookieRecipe.forEach((needed, ingredient) => {
        const totalNeeded = needed * cookiesSold;
        const currentAmount = this.player.ingredients.get(ingredient) || 0;
        this.player.ingredients.set(ingredient, currentAmount - totalNeeded);
      });

      const baseRevenue = cookiesSold * this.config.cookiePrice;
      this.player.funds += baseRevenue;
      this.daySales = baseRevenue;
      this.player.dishesToClean = cookiesSold;
    } else {
      this.player.dishesToClean = 0;
    }

    this.currentBakingMinigameInstance = new BakingMinigame(
      this.stage,
      this.layer,
      cookiesSold,
      (result, skipped) => this.onBakingComplete(result, skipped)
    );
  }

  private onBakingComplete(result: MinigameResult, skipped: boolean): void {
    this.currentBakingMinigameInstance = null;
    const tipRevenue = result.correctAnswers * 1;
    this.player.funds += tipRevenue;
    this.dayTips += tipRevenue;
    this.previousPhase = GamePhase.BAKING;
    this.currentPhase = GamePhase.POST_BAKING_ANIMATION;
    this.renderCurrentPhase();
  }

  private canMakeCookies(): boolean {
    let canMake = true;
    this.cookieRecipe.forEach((needed, ingredient) => {
      if ((this.player.ingredients.get(ingredient) || 0) < needed) canMake = false;
    });
    return canMake;
  }

  private renderCleaningPhase(): void {
    this.currentCleaningMinigame = new CleaningMinigame(
      this.stage,
      this.layer,
      this.player.dishesToClean,
      (result, skipped) => this.onCleaningComplete(result, skipped)
    );
  }

  private onCleaningComplete(result: MinigameResult, skipped: boolean): void {
    this.currentCleaningMinigame = null;

    if (skipped) {
      this.player.reputation -= 0.2;
      const penalty = 50;
      this.player.funds -= penalty;
      this.dayExpenses += penalty;
    } else {
      this.player.reputation += 0.05;
      const dishesNotCleaned = this.player.dishesToClean - result.correctAnswers;
      if (dishesNotCleaned > 0) {
        const penalty = dishesNotCleaned * 10;
        this.player.funds -= penalty;
        this.dayExpenses += penalty;
      } else if (this.player.dishesToClean > 0) {
        this.player.reputation += 0.05;
      }
    }

    this.player.reputation = Math.max(0.2, Math.min(this.player.reputation, 1.5));
    this.player.currentDay++;
    this.previousPhase = GamePhase.CLEANING;
    this.currentPhase = GamePhase.DAY_SUMMARY;
    this.renderCurrentPhase();
  }

  private renderDaySummaryPhase(): void {
    new DaySummaryScreen(
      this.stage,
      this.layer,
      this.player.currentDay - 1,
      this.daySales,
      this.dayExpenses,
      this.player.funds,
      this.dayTips,
      () => {
        this.previousPhase = this.currentPhase;

        if (this.player.funds >= this.config.winThreshold) {
          this.currentPhase = GamePhase.VICTORY;
        } else if (this.checkBankruptcy()) {
          this.currentPhase = GamePhase.DEFEAT;
        } else {
          this.currentPhase = GamePhase.NEW_DAY_ANIMATION;
        }
        this.renderCurrentPhase();
      }
    );
  }

  private getCostOfOneCookie(): number {
    let cost = 0;
    this.cookieRecipe.forEach((needed, ingredient) => {
      const price = this.ingredientPrices.get(ingredient) || 0;
      cost += needed * price;
    });
    return cost;
  }

  private checkBankruptcy(): boolean {
    if (this.canMakeCookies()) {
      return false;
    }
    const costOfOneCookie = this.getCostOfOneCookie();
    if (this.player.funds >= costOfOneCookie) {
      return false;
    }
    return true;
  }

  private renderGameOverPhase(): void {
    const won = this.player.funds >= this.config.winThreshold;
    const titleText = won ? 'YOU WIN!' : 'BANKRUPT!';
    const titleColor = won ? 'green' : 'red';
    const infoText = won
      ? `You reached the goal of $${this.config.winThreshold.toFixed(2)}!`
      : 'You have no ingredients and no money to buy more.';

    const title = new Konva.Text({
      x: 0,
      y: this.stage.height() * 0.3,
      width: this.stage.width(),
      text: titleText,
      fontSize: 50,
      fill: titleColor,
      align: 'center',
      fontStyle: 'bold',
    });
    this.layer.add(title);

    const subInfo = new Konva.Text({
      x: 0,
      y: this.stage.height() * 0.4,
      width: this.stage.width(),
      text: infoText,
      fontSize: 24,
      fill: 'black',
      align: 'center',
    });
    this.layer.add(subInfo);

    const finalStats = new Konva.Text({
      x: 0,
      y: this.stage.height() * 0.5,
      width: this.stage.width(),
      text: `Final Funds: $${this.player.funds.toFixed(2)}\nDays Survived: ${this.player.currentDay}`,
      fontSize: 24,
      fill: 'black',
      align: 'center',
      lineHeight: 1.5,
    });
    this.layer.add(finalStats);

    this.layer.draw();
  }
}