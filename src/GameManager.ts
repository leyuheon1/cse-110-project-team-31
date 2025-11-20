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

  // FIXED: Added missing property to store orders
  private customerOrders: any[] = [];

  private currentBakingMinigameInstance: BakingMinigame | null = null;
  private currentCleaningMinigame: CleaningMinigame | null = null;
  private postBakingAnimation: AnimationPlayer | null = null;
  private newDayAnimation: AnimationPlayer | null = null;
  
  private backgroundImage: Konva.Image | null = null;
  private loginBackgroundImage: Konva.Image | null = null;
  private daySales: number = 0;
  private dayExpenses: number = 0;
  private dayTips: number = 0;
  
  // FIXED: Removed './public' from path. In web apps, public is usually root '/'.
  private winSound = new Audio('/Win_sound.mp3');
  private loseSound = new Audio('/Lose_sound.mp3');
  
  private bgmIntro = new Audio('/login_page_mus.mp3');   
  private bgmStory = new Audio('/sad_mus.mp3');         
  private bgmMain  = new Audio('/in_game_mus.mp3'); 
  private bgmAnim  = new Audio('/morning_mus.mp3');   
  private bgmEndDay  = new Audio('/day_sum_mus.mp3');  
  private bgmbaking  = new Audio('/baking_mus.mp3');  

  private audioUnlocked = false;
  private winPlayedOnce = false;
  private losePlayedOnce = false;
  audioReady = false;   

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
    [this.bgmIntro, this.bgmStory, this.bgmMain, this.bgmAnim, this.bgmEndDay, this.bgmbaking].forEach(a => {
      a.loop = true;
      a.volume = 0.4;
    });

    // unlock audio on first user action
    const unlockAudio = () => {
      if (this.audioUnlocked) return;
      this.audioUnlocked = true;
      this.updateBackgroundMusic();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

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
    // FIXED: Do NOT call renderCurrentPhase() here. 
    // Calling it destroys the current screen state (resets forms, timers, etc.)
    // Instead, just redraw the layer to update positions if needed.
    this.layer.batchDraw();
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
      this.renderCurrentPhase();
    };
    imageObj.onerror = () => {
      console.error('Failed to load background image');
      this.renderCurrentPhase();
    };
    imageObj.src = '/background1.jpg';
  }

  private playBGM(track: 'intro' | 'story' | 'main' | 'anim' | 'endday' | 'baking' | null): void {
    // stop everything first
    [this.bgmIntro, this.bgmStory, this.bgmMain, this.bgmAnim, this.bgmEndDay, this.bgmbaking].forEach(a => {
      a.pause();
      a.currentTime = 0;
    });

    if (!this.audioUnlocked || track === null) return;

    const table = {
      intro: this.bgmIntro,
      story: this.bgmStory,
      main:  this.bgmMain,
      anim:  this.bgmAnim,
      endday: this.bgmEndDay,
      baking: this.bgmbaking
    } as const;

    table[track].play().catch(() => {
      // ignore play errors
    });
  }

  private updateBackgroundMusic(): void {
    if (!this.audioUnlocked) return;

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
        this.playBGM('endday')
        break;
      case GamePhase.BAKING:
        this.playBGM('baking')
        break;
      case GamePhase.VICTORY:
      case GamePhase.DEFEAT:
      case GamePhase.GAME_OVER:
      default:
        this.playBGM(null); // no bgm
        break;
    }
  }

  private cleanupCurrentPhase(): void {
    console.log('🧹 Cleaning up current phase:', GamePhase[this.currentPhase]);

    if (this.currentBakingMinigameInstance) {
      try {
        this.currentBakingMinigameInstance.cleanup();
      } catch (e) { console.warn('Error cleaning baking minigame:', e); }
      this.currentBakingMinigameInstance = null;
    }

    if (this.currentCleaningMinigame) {
      try {
        this.currentCleaningMinigame.cleanup();
      } catch (e) { console.warn('Error cleaning cleaning minigame:', e); }
      this.currentCleaningMinigame = null;
    }

    if (this.postBakingAnimation) {
      try {
        this.postBakingAnimation.destroy();
      } catch (e) { console.warn('Error destroying postBakingAnimation:', e); }
      this.postBakingAnimation = null;
    }

    if (this.newDayAnimation) {
      try {
        this.newDayAnimation.destroy();
      } catch (e) { console.warn('Error destroying newDayAnimation:', e); }
      this.newDayAnimation = null;
    }

    const children = this.layer.getChildren().slice(); 
    children.forEach(child => {
      try {
        if (this.backgroundImage && child === this.backgroundImage) {
          return;
        }
        child.remove();
      } catch (err) {
        console.warn('Error removing child during cleanup:', err);
      }
    });

    try {
      this.layer.draw();
    } catch (e) {
      console.warn('Error drawing layer after cleanup:', e);
    }
  }

  private renderCurrentPhase(): void {
    console.log('🎮 Rendering phase:', GamePhase[this.currentPhase]);

    this.cleanupCurrentPhase();
    this.updateBackgroundMusic();

    const skipBackgroundPhases = [
      GamePhase.LOGIN,
      GamePhase.POST_BAKING_ANIMATION,
      GamePhase.NEW_DAY_ANIMATION
    ];

    if (this.backgroundImage && !skipBackgroundPhases.includes(this.currentPhase)) {
      if (!this.backgroundImage.getParent()) {
        this.layer.add(this.backgroundImage);
      }
      try {
        this.backgroundImage.moveToBottom();
      } catch (e) {
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

            // Defensive coding for customerOrders
            if (!Array.isArray(customerOrders)) {
              console.error('OrderScreen returned invalid customerOrders (expected Array):', customerOrders);
              if (customerOrders && typeof customerOrders === 'object') {
                if (Array.isArray((customerOrders as any).orders)) {
                  this.customerOrders = (customerOrders as any).orders;
                } else {
                  try {
                    const coerced = Object.values(customerOrders).filter((v) => v && typeof v === 'object');
                    this.customerOrders = coerced.length ? (coerced as any) : [];
                  } catch (e) {
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
    this.audioReady = true;

    if (this.audioReady && !this.winPlayedOnce) {
        this.winSound.currentTime = 0;
        this.winSound.play().catch(()=>{});
        this.winPlayedOnce = true;
    }
    new VictoryScreen(this.stage, this.layer, {
      cashBalance: this.player.funds,
      totalDaysPlayed: this.player.currentDay,
      onReturnHome: () => {
        this.previousPhase = GamePhase.VICTORY;
        this.currentPhase = GamePhase.LOGIN;
        this.resetGame(); 
        this.renderCurrentPhase();
      },
    });
  }

  private renderLosePhase(): void {
    this.audioReady = true;
    if (this.audioReady) {
      this.loseSound.currentTime = 0;
      this.loseSound.play().catch(() => {});
    }
    new LoseScreen(this.stage, this.layer, {
      cashBalance: this.player.funds,
      totalDaysPlayed: this.player.currentDay,
      onReturnHome: () => {
        this.previousPhase = GamePhase.DEFEAT;
        this.backgroundImage?.remove();   
        this.layer.draw();
        this.currentPhase = GamePhase.LOGIN;
        this.resetGame();
        this.renderCurrentPhase();
      },
    });
  }

  private resetGame(): void {
    console.log('Resetting game state');
    this.player = {
      username: this.player.username, 
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
        this.previousPhase = GamePhase.POST_BAKING_ANIMATION;
        this.currentPhase = GamePhase.CLEANING;
        this.renderCurrentPhase();
      }
    );

    this.postBakingAnimation.load().then(() => {
        if (this.postBakingAnimation) {
          this.postBakingAnimation.start();
        }
      }).catch((error) => {
        console.error('Post-baking animation failed to load:', error);
        this.postBakingAnimation = null;
        this.previousPhase = GamePhase.POST_BAKING_ANIMATION;
        this.currentPhase = GamePhase.CLEANING;
        this.renderCurrentPhase();
      });
  }

  private renderNewDayAnimation(): void {
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
        this.previousPhase = GamePhase.NEW_DAY_ANIMATION;
        this.currentPhase = GamePhase.ORDER;
        this.renderCurrentPhase();
      }
    );

    this.newDayAnimation.load().then(() => {
        if (this.newDayAnimation) {
          this.newDayAnimation.start();
        }
      }).catch((error) => {
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
      this.player.currentDayDemand,
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