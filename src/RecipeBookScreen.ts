import Konva from 'konva';

export class RecipeBookScreen {
    private layer: Konva.Layer;
    private stage: Konva.Stage;
    private onClose: () => void;
    private ingredients: Map<string, number>;

    // --- MODIFIED: New Recipe ---
    private recipe: Map<string, number> = new Map([
        ['Flour', 3],
        ['Sugar', 1],
        ['Butter', 8],
        ['Chocolate', 1],
        ['Baking Soda', 2]
    ]);

    constructor(
        stage: Konva.Stage,
        layer: Konva.Layer,
        playerIngredients: Map<string, number>,
        onClose: () => void
    ) {
        this.stage = stage;
        this.layer = layer;
        this.ingredients = playerIngredients;
        this.onClose = onClose; // This callback now leads back to Shopping
        this.setupUI();
    }

    private setupUI(): void {
        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        // Modal box
        const modal = new Konva.Rect({
            x: stageWidth * 0.1,
            y: stageHeight * 0.1,
            width: stageWidth * 0.8,
            height: stageHeight * 0.8,
            fill: '#F5F5DC',
            stroke: '#003049',
            strokeWidth: 8,
            cornerRadius: 20
        });
        this.layer.add(modal);

        // Title
        const title = new Konva.Text({
            x: stageWidth * 0.1,
            y: stageHeight * 0.13,
            width: stageWidth * 0.8,
            text: 'SECRET FAMILY RECIPE',
            fontSize: Math.min(stageWidth * 0.04, 48),
            fontStyle: 'bold',
            fill: '#003049',
            align: 'center'
        });
        this.layer.add(title);

        // Sub-header for the recipe
        const subHeader = new Konva.Text({
            x: stageWidth * 0.1,
            y: stageHeight * 0.22,
            width: stageWidth * 0.8,
            text: 'Ingredients per Cookie:',
            fontSize: Math.min(stageWidth * 0.02, 22),
            fontStyle: 'bold',
            fill: '#333',
            align: 'center'
        });
        this.layer.add(subHeader);
        
        // --- MODIFIED: Column Headers ---
        const header = new Konva.Text({
            x: stageWidth * 0.15,
            y: stageHeight * 0.30,
            width: stageWidth * 0.7,
            text: 'INGREDIENT          NEEDED       YOU HAVE',
            fontSize: Math.min(stageWidth * 0.02, 22),
            fontStyle: 'bold',
            fill: '#333',
            fontFamily: 'monospace'
        });
        this.layer.add(header);

        let currentY = stageHeight * 0.36;

        // --- MODIFIED: Loop to display units ---
        this.recipe.forEach((needed, ingredient) => {
            const has = this.ingredients.get(ingredient) || 0;

            // Add units to the ingredient name for display
            let ingredientDisplay = ingredient;
            if (ingredient === 'Flour') ingredientDisplay = 'Flour (cups)';
            else if (ingredient === 'Sugar') ingredientDisplay = 'Sugar (cups)';
            else if (ingredient === 'Butter') ingredientDisplay = 'Butter (tbsp)';
            else if (ingredient === 'Chocolate') ingredientDisplay = 'Chocolate (cups)';
            else if (ingredient === 'Baking Soda') ingredientDisplay = 'Baking Soda (tsp)';

            const line = new Konva.Text({
                x: stageWidth * 0.15,
                y: currentY,
                width: stageWidth * 0.7,
                text: `${ingredientDisplay.padEnd(20)} ${String(needed).padStart(5)} ${String(has).padStart(12)}`,
                fontSize: Math.min(stageWidth * 0.02, 22),
                fill: 'black',
                fontFamily: 'monospace'
            });
            this.layer.add(line);
            currentY += stageHeight * 0.06;
        });

        // Change the button to a "BACK" button
        this.createBackButton(stageWidth, stageHeight);
        this.layer.draw();
    }

    private createBackButton(stageWidth: number, stageHeight: number): void {
        const buttonWidth = Math.min(stageWidth * 0.25, 300);
        const buttonHeight = Math.min(stageHeight * 0.08, 60);

        const buttonGroup = new Konva.Group({
            x: (stageWidth - buttonWidth) / 2,
            y: stageHeight * 0.8
        });

        const rect = new Konva.Rect({
            width: buttonWidth,
            height: buttonHeight,
            fill: '#d62828', // Red "back" color
            cornerRadius: 10
        });

        const text = new Konva.Text({
            width: buttonWidth,
            height: buttonHeight,
            text: 'BUY INGREDIENTS', // Changed text
            fontSize: Math.min(stageWidth * 0.022, 28),
            fill: 'white',
            align: 'center',
            verticalAlign: 'middle',
            fontStyle: 'bold'
        });

        buttonGroup.add(rect);
        buttonGroup.add(text);

        buttonGroup.on('click', this.onClose); // Still uses the onClose callback
        buttonGroup.on('mouseenter', () => {
            this.stage.container().style.cursor = 'pointer';
            rect.fill('#f77f00'); // Hover color
            this.layer.draw();
        });
        buttonGroup.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
            rect.fill('#d62828');
            this.layer.draw();
        });

        this.layer.add(buttonGroup);
    }

    public cleanup(): void {
        // No listeners to remove
    }
}