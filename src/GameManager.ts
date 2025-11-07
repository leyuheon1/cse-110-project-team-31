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
      this.renderCurrentPhase();
    };
    imageObj.onerror = () => {
      console.error('Failed to load background image');
      this.renderCurrentPhase();
    };
    imageObj.src = '/background1.jpg';
  }

  private renderCurrentPhase(): void {
    if (this.currentBakingMinigameInstance) {
      this.currentBakingMinigameInstance.cleanup();
      this.currentBakingMinigameInstance = null;
    }
    if (this.currentCleaningMinigame) {
      this.currentCleaningMinigame.cleanup();
      this.currentCleaningMinigame = null;
    }
    if (this.postBakingAnimation) {
      this.postBakingAnimation.destroy();
      this.postBakingAnimation = null;
    }
    if (this.newDayAnimation) {
      this.newDayAnimation.destroy();
      this.newDayAnimation = null;
    }

    this.layer.destroyChildren();

    if (this.backgroundImage && this.currentPhase !== GamePhase.LOGIN) {
      this.layer.add(this.backgroundImage);
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
          (totalDemand) => {
            this.player.currentDayDemand = totalDemand;
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
        this.renderCurrentPhase();
      },
      onReturnHome: () => {
        this.previousPhase = GamePhase.VICTORY;
        this.currentPhase = GamePhase.HOW_TO_PLAY;
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
        this.renderCurrentPhase();
      },
      onRetry: () => {
        if (typeof (this as any).resetForNewRun === 'function') {
          (this as any).resetForNewRun();
        }
        this.previousPhase = GamePhase.DEFEAT;
        this.currentPhase = GamePhase.HOW_TO_PLAY;
        this.renderCurrentPhase();
      },
    });
  }

  private renderPostBakingAnimation(): void {
    if (this.postBakingAnimation) {
      this.postBakingAnimation.destroy();
    }

    const IMAGE_PATHS = [
      '/21.png',
      '/22.png',
      '/23.png',
      '/24.png',
      '/25.png',
      '/26.png',
      '/27.png',
      '/28.png',
      '/29.png',
      '/30.png',
      '/31.png',
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
        this.postBakingAnimation = null;
        this.previousPhase = GamePhase.POST_BAKING_ANIMATION;
        this.currentPhase = GamePhase.CLEANING;
        this.renderCurrentPhase();
      }
    );

    this.postBakingAnimation
      .load()
      .then(() => {
        this.postBakingAnimation?.start();
      })
      .catch((error) => {
        console.error('Post-baking animation failed to load, skipping to cleaning.', error);
        this.previousPhase = GamePhase.POST_BAKING_ANIMATION;
        this.currentPhase = GamePhase.CLEANING;
        this.renderCurrentPhase();
      });
  }

  private renderNewDayAnimation(): void {
    if (this.newDayAnimation) {
      this.newDayAnimation.destroy();
    }

    const IMAGE_PATHS = [
      '/33.png',
      '/34.png',
      '/35.png',
      '/36.png',
      '/37.png',
      '/38.png',
      '/39.png',
      '/40.png',
      '/41.png',
      '/42.png',
      '/43.png',
      '/44.png',
      '/44.png',
      '/44.png',
      '/44.png',
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
        this.newDayAnimation = null;
        this.previousPhase = GamePhase.NEW_DAY_ANIMATION;
        this.currentPhase = GamePhase.ORDER;
        this.renderCurrentPhase();
      }
    );

    this.newDayAnimation
      .load()
      .then(() => {
        this.newDayAnimation?.start();
      })
      .catch((error) => {
        console.error('New day animation failed to load, skipping to next day.', error);
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
    if (this.currentBakingMinigameInstance) this.currentBakingMinigameInstance.cleanup();

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
    if (this.currentCleaningMinigame) this.currentCleaningMinigame.cleanup();

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
          this.currentPhase = GamePhase.GAME_OVER;
        } else if (this.checkBankruptcy()) {
          this.currentPhase = GamePhase.GAME_OVER;
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

  private createButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void
  ): { group: Konva.Group; rect: Konva.Rect; label: Konva.Text } {
    const group = new Konva.Group({ x, y });
    const rect = new Konva.Rect({
      width: 200,
      height: 50,
      fill: '#4CAF50',
      cornerRadius: 5,
    });
    const label = new Konva.Text({
      width: 200,
      height: 50,
      text: text,
      fontSize: 20,
      fill: 'white',
      align: 'center',
      verticalAlign: 'middle',
      listening: false,
    });
    group.add(rect, label);

    rect.on("mouseenter", () => {
      this.stage.container().style.cursor = "pointer";
      rect.fill("#45a049");
      this.layer.batchDraw();
    });
    rect.on("mouseleave", () => {
      this.stage.container().style.cursor = "default";
      rect.fill("#4CAF50");
      this.layer.batchDraw();
    });

    rect.on("click", onClick);
    rect.on("tap", onClick);

    return { group, rect, label };
  }
}