import Konva from 'konva';
import { ExitButton } from './ui/ExitButton'; 

export class RecipeBookScreen {
    private layer: Konva.Layer;
    private stage: Konva.Stage;
    private onClose: () => void;
    private ingredients: Map<string, number>;
    private bookGroup: Konva.Group;
    private exitButtonInstance: ExitButton | null = null; 

    // --- UPDATED ORDER: Flour, Butter, Sugar ---
    private recipe: Map<string, number> = new Map([
        ['Flour', 3],
        ['Butter', 8], // Moved up
        ['Sugar', 1],  // Moved down
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
        this.onClose = onClose;
        this.bookGroup = new Konva.Group();
        this.layer.add(this.bookGroup);
        this.setupUI();
    }

    private setupUI(): void {
        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        // Paper Modal
        const modalW = stageWidth * 0.7;
        const modalH = stageHeight * 0.8;
        const modalX = (stageWidth - modalW) / 2;
        const modalY = (stageHeight - modalH) / 2;

        const paper = new Konva.Rect({
            x: modalX, y: modalY, width: modalW, height: modalH,
            fill: '#F5F1E8', cornerRadius: 15,
            shadowColor: 'rgba(0,0,0,0.5)', shadowBlur: 20,
            shadowOffset: { x: 5, y: 10 }, shadowOpacity: 0.5
        });
        this.bookGroup.add(paper);

        // Holes
        const holeRadius = modalH * 0.02;
        const holeMarginX = modalX + modalW * 0.06;
        const holeStartY = modalY + modalH * 0.15;
        const holeSpacing = modalH * 0.12;
        for (let i = 0; i < 6; i++) {
            this.bookGroup.add(new Konva.Circle({
                x: holeMarginX, y: holeStartY + (i * holeSpacing),
                radius: holeRadius, fill: '#dbe9f4', opacity: 0.8
            }));
        }
        
        // Fold Lines
        this.bookGroup.add(new Konva.Line({
            points: [modalX, modalY + modalH / 2, modalX + modalW, modalY + modalH / 2],
            stroke: 'rgba(0,0,0,0.08)', strokeWidth: 1, dash: [10, 5]
        }));
        this.bookGroup.add(new Konva.Line({
            points: [modalX + modalW / 2, modalY, modalX + modalW / 2, modalY + modalH],
            stroke: 'rgba(0,0,0,0.08)', strokeWidth: 1, dash: [10, 5]
        }));

        // Title
        this.bookGroup.add(new Konva.Text({
            x: modalX, y: modalY + modalH * 0.05, width: modalW,
            text: "Owl's Top-Secret Recipe",
            fontSize: Math.min(stageWidth * 0.035, 48),
            fontStyle: 'bold', fontFamily: 'Schoolbell', fill: '#333', align: 'center'
        }));
        
        // Data Content
        const contentLeftMargin = modalX + modalW * 0.15;
        const contentWidth = modalW * 0.75; 
        const baseFontSize = Math.min(stageWidth * 0.015, 20);

        const col1Width = contentWidth * 0.5; // GOODIES
        const col3Width = contentWidth * 0.25; // NEED
        const col4Width = contentWidth * 0.25; // HAVE

        const col1X = contentLeftMargin;
        const col3X = col1X + col1Width;
        const col4X = col3X + col3Width;
        
        const headerY = modalY + modalH * 0.22;

        this.bookGroup.add(new Konva.Text({
            x: col1X, y: headerY, text: 'GOODIES',
            fontSize: baseFontSize, fontStyle: 'bold', fill: '#555', fontFamily: 'Schoolbell'
        }));
        this.bookGroup.add(new Konva.Text({
            x: col3X, y: headerY, text: 'NEED',
            fontSize: baseFontSize, fontStyle: 'bold', fill: '#555', fontFamily: 'Schoolbell', width: col3Width, align: 'right'
        }));
        this.bookGroup.add(new Konva.Text({
            x: col4X, y: headerY, text: 'HAVE',
            fontSize: baseFontSize, fontStyle: 'bold', fill: '#555', fontFamily: 'Arial, sans-serif', width: col4Width, align: 'right'
        }));

        let currentY = modalY + modalH * 0.30;

        this.recipe.forEach((needed, ingredient) => {
            const has = this.ingredients.get(ingredient) || 0;
            const hasColor = has >= needed ? '#27ae60' : '#e74c3c';

            let ingredientDisplay = ingredient;
            if (ingredient === 'Flour') ingredientDisplay = 'Flour (cups)';
            else if (ingredient === 'Sugar') ingredientDisplay = 'Sugar (cups)';
            else if (ingredient === 'Butter') ingredientDisplay = 'Butter (tbsp)';
            else if (ingredient === 'Chocolate') ingredientDisplay = 'Chocolate (cups)';
            else if (ingredient === 'Baking Soda') ingredientDisplay = 'Baking Soda (tsp)';

            this.bookGroup.add(new Konva.Text({
                x: col1X, y: currentY, text: ingredientDisplay,
                fontSize: baseFontSize, fill: 'black', fontFamily: 'Schoolbell'
            }));
            
            this.bookGroup.add(new Konva.Text({
                x: col3X, y: currentY, text: String(needed),
                fontSize: baseFontSize, fill: 'black', fontFamily: 'Schoolbell', width: col3Width, align: 'right'
            }));
            
            this.bookGroup.add(new Konva.Text({
                x: col4X, y: currentY, text: String(has),
                fontSize: baseFontSize, fill: hasColor, fontStyle: 'bold', fontFamily: 'Arial, sans-serif', width: col4Width, align: 'right'
            }));
            
            currentY += stageHeight * 0.06;
        });

        // "BUY INGREDIENTS" Button
        const buttonWidth = Math.min(stageWidth * 0.25, 300);
        const buttonHeight = Math.min(stageHeight * 0.08, 60);

        const buttonGroup = new Konva.Group({
            x: modalX + (modalW - buttonWidth) / 2,
            y: modalY + modalH - buttonHeight - (modalH * 0.05),
        });

        const rect = new Konva.Rect({ width: buttonWidth, height: buttonHeight, fill: '#d62828', cornerRadius: 10 });

        const text = new Konva.Text({
            width: buttonWidth, height: buttonHeight,
            text: 'BUY INGREDIENTS',
            fontSize: Math.min(stageWidth * 0.022, 24),
            fontFamily: 'Press Start 2P', fill: 'white', align: 'center', verticalAlign: 'middle', fontStyle: 'bold'
        });

        buttonGroup.add(rect);
        buttonGroup.add(text);
        buttonGroup.on('click', this.onClose); 
        buttonGroup.on('mouseenter', () => {
            this.stage.container().style.cursor = 'pointer';
            rect.fill('#f77f00'); 
            this.layer.draw();
        });
        buttonGroup.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
            rect.fill('#d62828'); 
            this.layer.draw();
        });

        this.bookGroup.add(buttonGroup);

        this.exitButtonInstance = new ExitButton(this.stage, this.layer, () => {
            this.cleanup();
            window.location.href = '/login.hmtl';
        });

        this.layer.draw();
    }
    
    public cleanup(): void {
        if (this.bookGroup) this.bookGroup.destroy();
        if (this.exitButtonInstance) {
            this.exitButtonInstance.destroy();
            this.exitButtonInstance = null;
        }
    }
}