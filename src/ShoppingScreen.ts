import Konva from 'konva';

interface IngredientItem {
    name: string;
    price: number;
    inputValue: string;
    unit: string; // <-- ADDED UNIT
}

export class ShoppingScreen {
    private layer: Konva.Layer;
    private stage: Konva.Stage;
    private onPurchaseComplete: (purchases: Map<string, number>, totalCost: number) => void;
    private onViewRecipe: () => void; 
    
    private currentFunds: number;
    private currentDay: number;

    private focusedInput: string | null = null;
    private focusedInputBox: Konva.Rect | null = null;
    private cursor: Konva.Rect | null = null;
    private cursorInterval: number | null = null;
    
    // --- MODIFIED: New prices and units ---
    private ingredients: IngredientItem[] = [
        { name: 'Flour', price: 0.5, inputValue: '0', unit: 'cup' },
        { name: 'Sugar', price: 0.75, inputValue: '0', unit: 'cup' },
        { name: 'Butter', price: 0.25, inputValue: '0', unit: 'tbsp' },
        { name: 'Chocolate', price: 3, inputValue: '0', unit: 'cup' },
        { name: 'Baking Soda', price: 0.5, inputValue: '0', unit: 'tsp' }
    ];
    
    private inputTexts: Map<string, Konva.Text> = new Map();
    private totalCostText: Konva.Text | null = null;
    private keyboardHandler: (e: KeyboardEvent) => void;

    constructor(
        stage: Konva.Stage, 
        layer: Konva.Layer, 
        currentFunds: number,
        currentDay: number,
        onPurchaseComplete: (purchases: Map<string, number>, totalCost: number) => void,
        onViewRecipe: () => void 
    ) {
        this.stage = stage;
        this.layer = layer;
        this.currentFunds = currentFunds;
        this.currentDay = currentDay;
        this.onPurchaseComplete = onPurchaseComplete;
        this.onViewRecipe = onViewRecipe; 
        this.keyboardHandler = this.handleKeyPress.bind(this);
        this.setupUI();
        this.setupKeyboardInput();
    }

    private setupUI(): void {
        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        // Title
        const title = new Konva.Text({
            x: stageWidth * 0.05,
            y: stageHeight * 0.05,
            text: `Day ${this.currentDay} - Shopping Phase`,
            fontSize: Math.min(stageWidth * 0.03, 36),
            fill: 'black',
            fontStyle: 'bold'
        });
        this.layer.add(title);

        // Funds display
        const fundsText = new Konva.Text({
            x: stageWidth * 0.05,
            y: stageHeight * 0.12,
            text: `Available Funds: $${this.currentFunds.toFixed(2)}`,
            fontSize: Math.min(stageWidth * 0.025, 30),
            fill: 'green',
            fontStyle: 'bold'
        });
        this.layer.add(fundsText);

        // Ingredient list with input fields
        let currentY = stageHeight * 0.22;
        this.ingredients.forEach((ingredient) => {
            this.createIngredientRow(stageWidth, currentY, ingredient);
            currentY += stageHeight * 0.08;
        });

        // Total cost display
        this.totalCostText = new Konva.Text({
            x: stageWidth * 0.05,
            y: currentY + stageHeight * 0.02,
            text: 'Total Cost: $0.00',
            fontSize: Math.min(stageWidth * 0.025, 30),
            fill: 'red',
            fontStyle: 'bold'
        });
        this.layer.add(this.totalCostText);

        // Purchase button
        this.createPurchaseButton(stageWidth, currentY + stageHeight * 0.1);
        
        // Add "View Recipe" button to the top right
        this.createViewRecipeButton(stageWidth, stageHeight);

        this.layer.draw();
    }
    
    private createViewRecipeButton(stageWidth: number, stageHeight: number): void {
        const buttonWidth = Math.min(stageWidth * 0.2, 200);
        const buttonHeight = Math.min(stageHeight * 0.07, 50);

        const buttonGroup = new Konva.Group({
            x: stageWidth - buttonWidth - (stageWidth * 0.05), // Top right
            y: stageHeight * 0.05
        });

        const rect = new Konva.Rect({
            width: buttonWidth,
            height: buttonHeight,
            fill: '#f77f00', // Orange color
            cornerRadius: 10
        });

        const text = new Konva.Text({
            width: buttonWidth,
            height: buttonHeight,
            text: 'View Recipe',
            fontSize: Math.min(stageWidth * 0.018, 22),
            fill: 'white',
            align: 'center',
            verticalAlign: 'middle',
            fontStyle: 'bold'
        });

        buttonGroup.add(rect);
        buttonGroup.add(text);
        
        text.listening(false); // make text ignore pointer events

        rect.on('click', () => {
            this.cleanup(); // Clean up keyboard listeners
            this.onViewRecipe();
        });
        rect.on('mouseenter', () => {
            this.stage.container().style.cursor = 'pointer';
            rect.fill('#fcbf49');
            this.layer.draw();
        });
        rect.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
            rect.fill('#f77f00');
            this.layer.draw();
        });

        this.layer.add(buttonGroup);
    }

    // --- MODIFIED: To show new price and unit ---
    private createIngredientRow(stageWidth: number, y: number, ingredient: IngredientItem): void {
        const label = new Konva.Text({
            x: stageWidth * 0.05,
            y: y,
            text: `${ingredient.name} - $${ingredient.price.toFixed(2)} per ${ingredient.unit}`,
            fontSize: Math.min(stageWidth * 0.02, 24),
            fill: 'black'
        });
        this.layer.add(label);
        
        const inputBox = new Konva.Rect({
            x: stageWidth * 0.5,
            y: y - 5,
            width: stageWidth * 0.15,
            height: 40,
            fill: 'white',
            stroke: '#3498db',
            strokeWidth: 2,
            cornerRadius: 5
        });
        this.layer.add(inputBox);
        
        const inputText = new Konva.Text({
            x: stageWidth * 0.5 + 10,
            y: y + 5,
            text: '0',
            fontSize: Math.min(stageWidth * 0.02, 24),
            fill: 'black',
            width: stageWidth * 0.15 - 20
        });
        this.layer.add(inputText);
        
        this.inputTexts.set(ingredient.name, inputText);
        
        inputBox.on('click', () => {
            this.focusInput(ingredient.name, inputBox, inputText);
        });
        inputText.on('click', () => {
            this.focusInput(ingredient.name, inputBox, inputText);
        });
    }

    private focusInput(ingredientName: string, inputBox: Konva.Rect, inputText: Konva.Text): void {
        if (this.focusedInputBox) {
            this.focusedInputBox.stroke('#3498db');
            this.focusedInputBox.strokeWidth(2);
        }
        if (this.cursor) {
            this.cursor.destroy();
            this.cursor = null;
        }
        if (this.cursorInterval) {
            clearInterval(this.cursorInterval);
        }
        this.focusedInput = ingredientName;
        this.focusedInputBox = inputBox;
        inputBox.stroke('#27ae60');
        inputBox.strokeWidth(3);
        const textWidth = inputText.getTextWidth();
        this.cursor = new Konva.Rect({
            x: inputText.x() + textWidth + 2,
            y: inputText.y(),
            width: 2,
            height: inputText.fontSize(),
            fill: 'black'
        });
        this.layer.add(this.cursor);
        let visible = true;
        this.cursorInterval = window.setInterval(() => {
            if (this.cursor) {
                this.cursor.visible(visible);
                visible = !visible;
                this.layer.draw();
            }
        }, 500);
        this.layer.draw();
    }

    private setupKeyboardInput(): void {
        window.addEventListener('keydown', this.keyboardHandler);
    }

    private handleKeyPress(e: KeyboardEvent): void {
        if (!this.focusedInput) return;
        const ingredient = this.ingredients.find(i => i.name === this.focusedInput);
        if (!ingredient) return;
        if (e.key >= '0' && e.key <= '9') {
            if (ingredient.inputValue === '0') {
                ingredient.inputValue = e.key;
            } else {
                ingredient.inputValue += e.key;
            }
            this.updateInputDisplay(ingredient.name);
            this.updateTotalCost();
        } else if (e.key === 'Backspace') {
            ingredient.inputValue = ingredient.inputValue.slice(0, -1) || '0';
            this.updateInputDisplay(ingredient.name);
            this.updateTotalCost();
        }
    }

    private updateInputDisplay(ingredientName: string): void {
        const ingredient = this.ingredients.find(i => i.name === ingredientName);
        const inputText = this.inputTexts.get(ingredientName);
        if (ingredient && inputText) {
            inputText.text(ingredient.inputValue);
            if (this.cursor && this.focusedInput === ingredientName) {
                const textWidth = inputText.getTextWidth();
                this.cursor.x(inputText.x() + textWidth + 2);
            }
            this.layer.draw();
        }
    }

    private updateTotalCost(): void {
        const total = this.ingredients.reduce((sum, ing) => {
            const qty = parseInt(ing.inputValue) || 0;
            return sum + (qty * ing.price);
        }, 0);
        if (this.totalCostText) {
            this.totalCostText.text(`Total Cost: $${total.toFixed(2)}`);
            this.totalCostText.fill(total > this.currentFunds ? 'red' : 'green');
            this.layer.draw();
        }
    }

    private createPurchaseButton(stageWidth: number, y: number): void {
        const buttonWidth = Math.min(stageWidth * 0.25, 300);
        const buttonHeight = Math.min(this.stage.height() * 0.08, 60);
        const buttonGroup = new Konva.Group({
            x: stageWidth * 0.05,
            y: y
        });
        const rect = new Konva.Rect({
            width: buttonWidth,
            height: buttonHeight,
            fill: '#4CAF50',
            cornerRadius: 10
        });
        const label = new Konva.Text({
            width: buttonWidth,
            height: buttonHeight,
            text: 'PURCHASE',
            fontSize: Math.min(stageWidth * 0.022, 28),
            fill: 'white',
            align: 'center',
            verticalAlign: 'middle',
            fontStyle: 'bold'
        });
        buttonGroup.add(rect);
        buttonGroup.add(label);
        buttonGroup.on('click', () => {
            const totalCost = this.ingredients.reduce((sum, ing) => {
                const qty = parseInt(ing.inputValue) || 0;
                return sum + (qty * ing.price);
            }, 0);
            if (totalCost > this.currentFunds) {
                alert('Not enough funds!');
                return;
            }
            const purchases = new Map<string, number>();
            this.ingredients.forEach(ing => {
                const qty = parseInt(ing.inputValue) || 0;
                if (qty > 0) {
                    purchases.set(ing.name, qty);
                }
            });
            this.cleanup();
            this.onPurchaseComplete(purchases, totalCost);
        });
        buttonGroup.on('mouseenter', () => {
            this.stage.container().style.cursor = 'pointer';
            rect.fill('#45a049');
            this.layer.draw();
        });
        buttonGroup.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
            rect.fill('#4CAF50');
            this.layer.draw();
        });
        this.layer.add(buttonGroup);
    }

    public cleanup(): void {
        window.removeEventListener('keydown', this.keyboardHandler);
        if (this.cursorInterval) {
            clearInterval(this.cursorInterval);
        }
    }
}