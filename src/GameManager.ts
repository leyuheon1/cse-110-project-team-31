import Konva from 'konva';
import { GamePhase, PlayerState, MinigameResult } from './types';
import { ConfigManager } from './config';
import { BakingMinigame } from './BakingMinigame';
import { CleaningMinigame } from './CleaningMinigame';

export class GameManager {
    private stage: Konva.Stage;
    private layer: Konva.Layer;
    private currentPhase: GamePhase;
    private player: PlayerState;
    private config = ConfigManager.getInstance().getConfig();
    private currentMinigame: BakingMinigame | null = null;

    constructor(container: HTMLDivElement) {
        this.stage = new Konva.Stage({
            container: container,
            width: container.offsetWidth,
            height: container.offsetHeight
        });

        this.layer = new Konva.Layer();
        this.stage.add(this.layer);

        this.currentPhase = GamePhase.SHOPPING;
        this.player = {
            funds: this.config.startingFunds,
            flourInventory: 0,
            breadInventory: [],
            maxBreadCapacity: this.config.maxBreadCapacity,
            currentDay: 1
        };

        this.renderCurrentPhase();
    }

    private renderCurrentPhase(): void {
        this.layer.destroyChildren();

        switch (this.currentPhase) {
            case GamePhase.SHOPPING:
                this.renderShoppingPhase();
                break;
            case GamePhase.BAKING:
                this.renderBakingPhase();
                break;
            case GamePhase.SELLING:
                this.renderSellingPhase();
                break;
            case GamePhase.CLEANING:
                this.renderCleaningPhase();
                break;
            case GamePhase.GAME_OVER:
                this.renderGameOverPhase();
                break;
        }

        this.layer.draw();
    }

    private renderShoppingPhase(): void {
        // Title
        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        const title = new Konva.Text({
            x: stageWidth * 0.05,
            y: stageHeight * 0.05,
            text: `Day ${this.player.currentDay} - Shopping Phase`,
            fontSize: 30,
            fill: 'black'
        });
        this.layer.add(title);

        // Player info
        const info = new Konva.Text({
            x: stageWidth * 0.05,
            y: stageHeight * 0.12,
            text: `Funds: $${this.player.funds.toFixed(2)}\nFlour: ${this.player.flourInventory} units\nBread Capacity: ${this.player.maxBreadCapacity} loaves`,
            fontSize: 20,
            fill: 'black'
        });
        this.layer.add(info);

        // Flour price (random)
        const flourPrice = Math.floor(Math.random() * 
            (this.config.flourPriceMax - this.config.flourPriceMin + 1)) + 
            this.config.flourPriceMin;

        const priceText = new Konva.Text({
            x: 50,
            y: 200,
            text: `Flour Price: $${flourPrice}/unit`,
            fontSize: 24,
            fill: 'green'
        });
        this.layer.add(priceText);

        // Buy button
        const buyButton = this.createButton(50, 300, 'Buy 10 Flour', () => {
            const cost = flourPrice * 10;
            if (this.player.funds >= cost) {
                this.player.funds -= cost;
                this.player.flourInventory += 10;
                this.currentPhase = GamePhase.BAKING;
                this.renderCurrentPhase();
            } else {
                alert('Not enough funds!');
            }
        });
        this.layer.add(buyButton.group);
    }

    private onBakingComplete(result: MinigameResult): void {
        // Clean up minigame
        if (this.currentMinigame) {
            this.currentMinigame.cleanup();
            this.currentMinigame = null;
        }

        // Calculate bread quality based on performance
        // Perfect score (100%) = quality 100
        // 0% = quality 30 (minimum quality)
        const accuracy = result.totalProblems > 0 
            ? result.correctAnswers / result.totalProblems 
            : 0;
        const quality = Math.floor(30 + (accuracy * 70));

        // Calculate how many breads can be made
        const flourNeeded = 1; // 1 flour per bread
        const maxBreads = Math.floor(this.player.flourInventory / flourNeeded);
        const breadsToMake = Math.min(maxBreads, this.player.maxBreadCapacity);

        // Create bread with calculated quality
        if (breadsToMake > 0) {
            this.player.breadInventory.push({
                quality: quality,
                quantity: breadsToMake
            });
            this.player.flourInventory -= breadsToMake * flourNeeded;
        }

        // Move to selling phase
        this.currentPhase = GamePhase.SELLING;
        this.renderCurrentPhase();
    }


    private renderBakingPhase(): void {
        this.layer.destroyChildren();

        // Start the baking minigame
        this.currentMinigame = new BakingMinigame(
            this.stage,
            this.layer,
            (result) => this.onBakingComplete(result)
        );
    }

    private renderSellingPhase(): void {
        const title = new Konva.Text({
            x: 50,
            y: 50,
            text: 'Selling Phase',
            fontSize: 30,
            fill: 'black'
        });
        this.layer.add(title);

        const totalBread = this.player.breadInventory.reduce((sum, b) => sum + b.quantity, 0);
        const avgQuality = this.player.breadInventory.reduce((sum, b) => sum + b.quality * b.quantity, 0) / totalBread;

        const info = new Konva.Text({
            x: 50,
            y: 100,
            text: `Bread: ${totalBread} loaves\nAvg Quality: ${avgQuality.toFixed(1)}`,
            fontSize: 20,
            fill: 'black'
        });
        this.layer.add(info);

        // Sell button
        const sellButton = this.createButton(50, 300, 'Sell All Bread', () => {
            const pricePerLoaf = 5 + (avgQuality / 10); // Quality affects price
            const revenue = totalBread * pricePerLoaf;
            this.player.funds += revenue;
            this.player.breadInventory = [];
            this.currentPhase = GamePhase.CLEANING;
            this.renderCurrentPhase();
        });
        this.layer.add(sellButton.group);
    }


        private onCleaningComplete(result: MinigameResult): void {
        // Clean up minigame
        if (this.currentCleaningMinigame) {
            this.currentCleaningMinigame.cleanup();
            this.currentCleaningMinigame = null;
        }

        // Calculate next day's capacity based on dishes cleaned
        // If you cleaned all dishes, you get max capacity
        // If you only cleaned some, your capacity is reduced
        const totalDishes = this.config.multiplicationProblems || 20;
        const cleanedDishes = result.correctAnswers;
        
        // Set capacity for next day
        // Option 1: Direct mapping (if cleaned 5 dishes, capacity = 5)
        this.player.maxBreadCapacity = Math.min(cleanedDishes, this.config.maxBreadCapacity);
        
        // Option 2: Percentage-based (if cleaned 50% of dishes, capacity = 50% of max)
        // const cleanPercentage = cleanedDishes / totalDishes;
        // this.player.maxBreadCapacity = Math.floor(this.config.maxBreadCapacity * cleanPercentage);

        this.player.currentDay++;
        
        // Check win/loss
        if (this.player.funds >= this.config.winThreshold) {
            this.currentPhase = GamePhase.GAME_OVER;
        } else if (this.player.funds <= this.config.bankruptcyThreshold) {
            this.currentPhase = GamePhase.GAME_OVER;
        } else {
            this.currentPhase = GamePhase.SHOPPING;
        }
        
        this.renderCurrentPhase();
    }


    private renderCleaningPhase(): void {
        this.layer.destroyChildren();

        // Start the cleaning minigame
        this.currentCleaningMinigame = new CleaningMinigame(
            this.stage,
            this.layer,
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