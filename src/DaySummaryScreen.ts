import Konva from 'konva';
import { ExitButton } from './ui/ExitButton';
import { InfoButton } from './ui/InfoButton';
import { SavingsTracker } from './ui/SavingsTracker';

export class DaySummaryScreen {
    private layer: Konva.Layer;
    private stage: Konva.Stage;
    private onContinue: () => void;
    private currentDay: number;
    private daySales: number;
    private dayExpenses: number;
    private currentFunds: number;
    private dayTips: number;
    
    // 1. Add active flag to prevent ghost resizes
    private isActive: boolean = true;
    private resizeHandler: (() => void) | null = null;
  
    private dayTips: number; // <-- ADDED THIS
    private savingsTracker!: SavingsTracker;

    constructor(
        stage: Konva.Stage,
        layer: Konva.Layer,
        currentDay: number,
        daySales: number,
        dayExpenses: number,
        currentFunds: number,
        dayTips: number,
        onContinue: () => void
    ) {
        this.stage = stage;
        this.layer = layer;
        this.currentDay = currentDay;
        this.daySales = daySales;
        this.dayExpenses = dayExpenses;
        this.currentFunds = currentFunds;
        this.dayTips = dayTips;
        this.onContinue = onContinue;
        
        // Ensure we mark it active on creation
        this.isActive = true;

        this.setupUI();
        this.setupResizeHandler();
    }

    private setupResizeHandler(): void {
        this.resizeHandler = () => {
            // 2. Guard Clause: If this screen isn't active, STOP.
            if (!this.isActive) return;

            const container = this.stage.container();
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;

            this.stage.width(containerWidth);
            this.stage.height(containerHeight);

            this.layer.destroyChildren();
            this.setupUI();
        };

        window.addEventListener('resize', this.resizeHandler);
    }

    private setupUI(): void {
        // Double check active state before drawing
        if (!this.isActive) return;

        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        this.loadOwlImage(stageWidth, stageHeight, () => {
            if (!this.isActive) return; // Guard in case async load finishes after cleanup
            this.createReceiptGroup(stageWidth, stageHeight);
            this.createContinueButton(stageWidth, stageHeight);
        });

        // Exit Button
        new ExitButton(this.stage, this.layer, () => {
            this.cleanup();
            window.location.href = '/login.html';
        });

        // Info Button
        new InfoButton(this.stage, this.layer);
    }

    private loadOwlImage(stageWidth: number, stageHeight: number, onLoad: () => void): void {
        const imageObj = new Image();
        imageObj.onload = () => {
            if (!this.isActive) return; // Guard

            const aspectRatio = imageObj.width / imageObj.height;
            const owlWidth = stageWidth * 0.35;
            const owlHeight = owlWidth / aspectRatio;

            const owl = new Konva.Image({
                x: stageWidth * 0.1,
                y: stageHeight * 0.6 - (stageWidth * 0.25 / 2), 
                image: imageObj,
                width: owlWidth,
                height: owlHeight
            });
            this.layer.add(owl);
            this.layer.draw();
            onLoad();
        };
        imageObj.src = '/end-owl.png';
    }

    private createReceiptGroup(stageWidth: number, stageHeight: number): void {
        const imageObj = new Image();
        imageObj.onload = () => {
            if (!this.isActive) return; // Guard

            const aspectRatio = imageObj.width / imageObj.height;
            const receiptWidth = stageWidth * 0.3;
            const receiptHeight = receiptWidth / aspectRatio;

            const FONT_FAMILY = 'Doto';
            const BASE_FONT_SIZE = Math.min(stageWidth * 0.014, 14);
            const LINE_ADVANCE = receiptHeight * 0.035;

            const GROUP_VISUAL_HEIGHT = receiptHeight; 
            const CENTERED_Y = (stageHeight / 2) - (GROUP_VISUAL_HEIGHT / 2);

            const receiptGroup = new Konva.Group({
                x: stageWidth * 0.6 + (stageWidth * 0.4 - receiptWidth) / 2, 
                y: CENTERED_Y,
            });
            
            const receipt = new Konva.Image({
                image: imageObj,
                width: receiptWidth,
                height: receiptHeight
            });
            receiptGroup.add(receipt);

            let currentY = receiptHeight * 0.2;

            const dayText = new Konva.Text({
                x: receiptWidth * 0.15,
                y: receiptHeight * 0.14,
                width: receiptWidth * 0.7,
                text: `DAY ${this.currentDay}`,
                fontSize: Math.min(stageWidth * 0.016, 20),
                fill: 'black',
                align: 'center',
                fontFamily: FONT_FAMILY,
                fontStyle: 'bold'
            });
            receiptGroup.add(dayText);

            const salesText = new Konva.Text({
                x: receiptWidth * 0.1,
                y: currentY,
                width: receiptWidth * 0.8,
                text: `Sales (Cookies Sold): $${this.daySales.toFixed(2)}`,
                fontSize: BASE_FONT_SIZE,
                fill: '#4CAF50',
                fontFamily: FONT_FAMILY,
                fontStyle: 'bold'
            });
            receiptGroup.add(salesText);
            currentY += LINE_ADVANCE * 1.5;

            const tipsText = new Konva.Text({
                x: receiptWidth * 0.1,
                y: currentY,
                width: receiptWidth * 0.8,
                text: `Tips Earned: $${this.dayTips.toFixed(2)}`,
                fontSize: BASE_FONT_SIZE,
                fill: '#FFD700', 
                fontFamily: FONT_FAMILY,
                fontStyle: 'bold'
            });
            receiptGroup.add(tipsText);
            currentY += LINE_ADVANCE * 1.5;

            const expensesText = new Konva.Text({
                x: receiptWidth * 0.1,
                y: currentY,
                width: receiptWidth * 0.8,
                text: `Expenses (Ingredients, Fines): -$${this.dayExpenses.toFixed(2)}`,
                fontSize: BASE_FONT_SIZE,
                fill: '#B22222',
                fontFamily: FONT_FAMILY,
                fontStyle: 'bold'
            });
            receiptGroup.add(expensesText);
            currentY += LINE_ADVANCE * 1.5;

            const netChange = this.daySales + this.dayTips - this.dayExpenses; 
            const netChangeColor = netChange >= 0 ? '#006400' : '#8B0000';
            const netChangeText = new Konva.Text({
                x: receiptWidth * 0.1,
                y: currentY,
                width: receiptWidth * 0.8,
                text: `Combined Profit & Loss: ${netChange >= 0 ? '+' : ''}$${netChange.toFixed(2)}`,
                fontSize: BASE_FONT_SIZE,
                fill: netChangeColor,
                fontFamily: FONT_FAMILY,
                fontStyle: 'bold'
            });
            receiptGroup.add(netChangeText);
            currentY += LINE_ADVANCE * 1.5;

            const fundsText = new Konva.Text({
                x: receiptWidth * 0.1,
                y: currentY,
                width: receiptWidth * 0.8,
                text: `Current Funds: $${this.currentFunds.toFixed(2)}`,
                fontSize: BASE_FONT_SIZE,
                fill: '#4682B4',
                fontFamily: FONT_FAMILY,
                fontStyle: 'bold'
            });
            receiptGroup.add(fundsText);
            this.layer.add(receiptGroup);
            this.layer.draw();
        };
        imageObj.src = '/end-receipt.png'
    }

    private createContinueButton(stageWidth: number, stageHeight: number): void {
        const buttonWidth = Math.min(stageWidth * 0.25, 300);
        const buttonHeight = Math.min(stageHeight * 0.08, 60);
        
        const textFontSize = Math.min(stageWidth * 0.02, 24);
        const textCenterYOffset = (buttonHeight / 2) - (textFontSize / 2);

        const buttonGroup = new Konva.Group({
            x: (stageWidth - buttonWidth) / 2, 
            y: (stageHeight * 0.15) + (stageHeight * 0.7) + (stageHeight * 0.02)
        });

        const rect = new Konva.Rect({
            width: buttonWidth,
            height: buttonHeight,
            fill: '#4CAF50',
            cornerRadius: 10,
            shadowColor: 'black',
            shadowBlur: 5,
            shadowOpacity: 0.4,
            shadowOffsetX: 2,
            shadowOffsetY: 2,
            hitFunc: (context, shape) => {
                context.beginPath();
                context.rect(0, 0, shape.width(), shape.height());
                context.closePath();
                context.fillStrokeShape(shape); 
            }
        });

        const text = new Konva.Text({
            x: 0,
            y: textCenterYOffset,
            width: buttonWidth,
            text: 'CONTINUE',
            fontSize: textFontSize,
            fontFamily: "Press Start 2P",
            fill: 'white',
            align: 'center',
            verticalAlign: 'middle',
            fontStyle: 'bold',
            listening: false
        });

        buttonGroup.add(rect);
        buttonGroup.add(text);

        buttonGroup.on('click tap', () => {
            // 3. IMPORTANT: Cleanup this screen before moving on!
            this.cleanup(); 
            this.onContinue();
        });
        
        buttonGroup.on('mouseenter', () => {
            this.stage.container().style.cursor = 'pointer';
            rect.fill('#45a049');
            this.layer.batchDraw();
        });
        buttonGroup.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
            rect.fill('#4CAF50');
            this.layer.batchDraw();
        });

        this.layer.add(buttonGroup);
        //Exit Button
        const exitButton = new ExitButton(this.stage, this.layer, () => {
            this.cleanup();
            window.location.href = '/login.html'; //go to login page
        });

        //Info Button
        const infoButton = new InfoButton(this.stage, this.layer);
        
        // Add savings tracker
        this.savingsTracker = new SavingsTracker(this.layer, this.stage);
        this.savingsTracker.update(this.currentFunds);

        this.layer.draw();
    }

    public cleanup(): void {
        // 4. Mark inactive immediately
        this.isActive = false;

        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
        this.layer.destroyChildren();
    }
}