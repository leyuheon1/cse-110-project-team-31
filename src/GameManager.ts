import Konva from 'konva';
import { GamePhase, PlayerState, MinigameResult } from './types';
import { ConfigManager } from './config';
import { BakingMinigame } from './BakingMinigame';
import { CleaningMinigame } from './CleaningMinigame';
import { HowToPlayScreen } from './HowToPlayScreen';
import { OrderScreen } from './OrderScreen';
import { ShoppingScreen } from './ShoppingScreen';
import { DaySummaryScreen } from './DaySummaryScreen';

export class GameManager {
    private stage: Konva.Stage;
    private layer: Konva.Layer;
    private currentPhase: GamePhase;
    private player: PlayerState;
    private config = ConfigManager.getInstance().getConfig();
    private currentMinigame: BakingMinigame | null = null;
    private currentCleaningMinigame: CleaningMinigame | null = null; 
    private backgroundImage: Konva.Image | null = null;
    private daySales: number = 0;
    private dayExpenses: number = 0;

    constructor(container: HTMLDivElement) {
        this.stage = new Konva.Stage({
            container: container,
            width: container.offsetWidth,
            height: container.offsetHeight
        });

        this.layer = new Konva.Layer();
        this.stage.add(this.layer);

        // this.currentPhase = GamePhase.SHOPPING;
        this.currentPhase = GamePhase.HOW_TO_PLAY;
        this.player = {
        funds: this.config.startingFunds,
        ingredients: new Map<string, number>(),
        breadInventory: [],
        maxBreadCapacity: this.config.maxBreadCapacity,
        currentDay: 1,
        dishesToClean: 0  // Add this
    };
            
        window.addEventListener('resize', () => {
        this.handleResize(container);
        });

        this.loadBackground();
        
    }


        private handleResize(container: HTMLDivElement): void {
            this.stage.width(container.offsetWidth);
            this.stage.height(container.offsetHeight);
            
            // Reload background with new size
            if (this.backgroundImage) {
                this.backgroundImage.width(this.stage.width());
                this.backgroundImage.height(this.stage.height());
            }
            
            // Re-render current phase
            this.renderCurrentPhase();
        }


        private loadBackground(): void {
            // function for loading background 
        const imageObj = new Image();
        imageObj.onload = () => {
            this.backgroundImage = new Konva.Image({
                x: 0,
                y: 0,
                image: imageObj,
                width: this.stage.width(),
                height: this.stage.height(),
                opacity: 0.3
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
        this.layer.destroyChildren();

        if (this.backgroundImage) {
            this.layer.add(this.backgroundImage);
        }

        switch (this.currentPhase) {
            case GamePhase.HOW_TO_PLAY:  
            new HowToPlayScreen(this.stage, this.layer, () => {
                this.currentPhase = GamePhase.ORDER;
                this.renderCurrentPhase();
            });
            break;
            case GamePhase.ORDER:
            new OrderScreen(this.stage, this.layer, this.player.currentDay, () => {
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
            case GamePhase.CLEANING:
                this.renderCleaningPhase();
                break;
            case GamePhase.DAY_SUMMARY:
                this.renderDaySummaryPhase();
                break;
            case GamePhase.GAME_OVER:
                this.renderGameOverPhase();
                break;
        }

        this.layer.draw();
    }

    private renderShoppingPhase(): void {
        // Reset daily tracking
        this.daySales = 0;
        this.dayExpenses = 0;
        
        new ShoppingScreen(
            this.stage,
            this.layer,
            this.player.funds,
            this.player.currentDay,
            (purchases, totalCost) => {
                this.player.funds -= totalCost;
                this.dayExpenses += totalCost;  // Track expenses
                
                purchases.forEach((qty, name) => {
                    const current = this.player.ingredients.get(name) || 0;
                    this.player.ingredients.set(name, current + qty);
                });
                
                if (this.canMakeCookies()) {
                    this.currentPhase = GamePhase.BAKING;
                } else {
                    alert('Not enough ingredients to bake!');
                    this.currentPhase = GamePhase.CLEANING;
                }
                this.renderCurrentPhase();
            }
        );
    }

    private onBakingComplete(result: MinigameResult): void {
        if (this.currentMinigame) {
            this.currentMinigame.cleanup();
            this.currentMinigame = null;
        }

        const cookiesMade = result.correctAnswers;
        const revenue = cookiesMade * this.config.cookiePrice;
        
        this.player.funds += revenue;
        this.daySales += revenue;  // Track sales
        this.player.dishesToClean = cookiesMade;
        
        this.currentPhase = GamePhase.CLEANING;
        this.renderCurrentPhase();
    }

    private canMakeCookies(): boolean {
    const ingredientNames = ['Flour', 'Butter', 'Sugar', 'Chocolate Chips', 'Baking Soda'];
    return ingredientNames.every(name => (this.player.ingredients.get(name) || 0) > 0);
}

    private canMakeOneCookie(): boolean {
        const ingredientNames = ['Flour', 'Butter', 'Sugar', 'Chocolate Chips', 'Baking Soda'];
        
        // Check if we have at least 1 of each
        const hasIngredients = ingredientNames.every(name => 
            (this.player.ingredients.get(name) || 0) >= 1
        );
        
        if (hasIngredients) {
            // Consume 1 of each ingredient immediately
            ingredientNames.forEach(name => {
                const current = this.player.ingredients.get(name) || 0;
                this.player.ingredients.set(name, current - 1);
            });
            return true;
        }
        
        return false;
    }


    private renderBakingPhase(): void {
        this.layer.destroyChildren();
        
        if (this.backgroundImage) {
            this.layer.add(this.backgroundImage);
        }

        this.currentMinigame = new BakingMinigame(
            this.stage,
            this.layer,
            (result) => this.onBakingComplete(result),
            () => this.canMakeOneCookie()  // Pass the check function
        );
    }




    private onCleaningComplete(result: MinigameResult): void {
        if (this.currentCleaningMinigame) {
            this.currentCleaningMinigame.cleanup();
            this.currentCleaningMinigame = null;
        }

        const dishesNotCleaned = this.player.dishesToClean - result.correctAnswers;
        
        if (dishesNotCleaned > 0) {
            const penalty = dishesNotCleaned * 10;
            this.player.funds -= penalty;
            this.dayExpenses += penalty;  // Track penalty as expense
        }

        this.player.currentDay++;
        
        // Go to day summary instead of checking win/loss
        this.currentPhase = GamePhase.DAY_SUMMARY;
        this.renderCurrentPhase();
    }

        private renderDaySummaryPhase(): void {
        new DaySummaryScreen(
            this.stage,
            this.layer,
            this.player.currentDay - 1,  // Show the day that just ended
            this.daySales,
            this.dayExpenses,
            this.player.funds,
            () => {
                // Check win/loss after summary
                if (this.player.funds >= this.config.winThreshold) {
                    this.currentPhase = GamePhase.GAME_OVER;
                } else if (this.player.funds <= this.config.bankruptcyThreshold) {
                    this.currentPhase = GamePhase.GAME_OVER;
                } else {
                    this.currentPhase = GamePhase.ORDER;  // Next day
                }
                this.renderCurrentPhase();
            }
        );
    }


    private renderCleaningPhase(): void {
        this.layer.destroyChildren();
        
        if (this.backgroundImage) {
            this.layer.add(this.backgroundImage);
        }

        this.currentCleaningMinigame = new CleaningMinigame(
            this.stage,
            this.layer,
            this.player.dishesToClean,  // Pass dishes count
            (result) => this.onCleaningComplete(result)
        );
    }

    private renderGameOverPhase(): void {
        const won = this.player.funds >= this.config.winThreshold;
        
        const title = new Konva.Text({
            x: 200,
            y: 200,
            text: won ? 'YOU WIN!' : 'BANKRUPT!',
            fontSize: 50,
            fill: won ? 'green' : 'red'
        });
        this.layer.add(title);

        const info = new Konva.Text({
            x: 200,
            y: 280,
            text: `Final Funds: $${this.player.funds.toFixed(2)}\nDays Survived: ${this.player.currentDay}`,
            fontSize: 24,
            fill: 'black'
        });
        this.layer.add(info);
    }

    private createButton(x: number, y: number, text: string, onClick: () => void) {
        const group = new Konva.Group({ x, y });

        const rect = new Konva.Rect({
            width: 200,
            height: 50,
            fill: '#4CAF50',
            cornerRadius: 5
        });

        const label = new Konva.Text({
            width: 200,
            height: 50,
            text: text,
            fontSize: 20,
            fill: 'white',
            align: 'center',
            verticalAlign: 'middle'
        });

        group.add(rect);
        group.add(label);

        group.on('mouseenter', () => {
            this.stage.container().style.cursor = 'pointer';
            rect.fill('#45a049');
            this.layer.draw();
        });

        group.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
            rect.fill('#4CAF50');
            this.layer.draw();
        });

        group.on('click', onClick);

        return { group, rect, label };
    }
}