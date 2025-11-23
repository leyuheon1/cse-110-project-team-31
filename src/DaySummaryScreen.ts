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
    private dayTips: number; // <-- ADDED THIS
    private savingsTracker!: SavingsTracker;

    // --- MODIFIED CONSTRUCTOR ---
    constructor(
        stage: Konva.Stage,
        layer: Konva.Layer,
        currentDay: number,
        daySales: number,
        dayExpenses: number,
        currentFunds: number,
        dayTips: number, // <-- ADDED THIS
        onContinue: () => void
    ) {
        this.stage = stage;
        this.layer = layer;
        this.currentDay = currentDay;
        this.daySales = daySales;
        this.dayExpenses = dayExpenses;
        this.currentFunds = currentFunds;
        this.dayTips = dayTips; // <-- SET THIS
        this.onContinue = onContinue;

        this.setupUI();
    }

    private setupUI(): void {
        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        this.loadOwlImage(stageWidth, stageHeight, () => {
            // Once owl loads, add receipt + button
            this.createReceiptGroup(stageWidth, stageHeight);
            this.createContinueButton(stageWidth, stageHeight);
        });

        //Exit Button
        const exitButton = new ExitButton(this.stage, this.layer, () => {
            this.cleanup();
            window.location.href = '/login.hmtl'; //go to login page
        });
    }

    // --- NEW: Add owl image like OrderSummary page ---
    private loadOwlImage(stageWidth: number, stageHeight: number, onLoad: () => void): void {
        const imageObj = new Image();
        imageObj.onload = () => {
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

    /// --- NEW: Group receipt components ---
    private createReceiptGroup(stageWidth: number, stageHeight: number): void {
        const imageObj = new Image();
        imageObj.onload = () => {
            const aspectRatio = imageObj.width / imageObj.height;
            const receiptWidth = stageWidth * 0.3;
            const receiptHeight = receiptWidth / aspectRatio;

            // --- FONT AND SPACING CONSTANTS ---
            const FONT_FAMILY = 'Doto';
            const BASE_FONT_SIZE = Math.min(stageWidth * 0.018, 18); // Use a single size for list items
            const LINE_ADVANCE = receiptHeight * 0.035; // 3.5% of receipt height for line spacing

            // Calculate center Y position for the receipt group
            const GROUP_VISUAL_HEIGHT = receiptHeight; 
            const CENTERED_Y = (stageHeight / 2) - (GROUP_VISUAL_HEIGHT / 2);

            // Create group to hold receipt and text
            const receiptGroup = new Konva.Group({
                x: stageWidth * 0.6 + (stageWidth * 0.4 - receiptWidth) / 2, 
                y: CENTERED_Y, // Centered vertically
            });
            
            const receipt = new Konva.Image({
                image: imageObj,
                width: receiptWidth,
                height: receiptHeight
            });
            receiptGroup.add(receipt);

            let currentY = receiptHeight * 0.2; // Start point adjusted lower to clear "END OF DAY SUMMARY"

            // Day Text (Slightly larger, separate size)
            const dayText = new Konva.Text({
                x: receiptWidth * 0.15,
                y: receiptHeight * 0.14, // Fixed position below static header
                width: receiptWidth * 0.7,
                text: `DAY ${this.currentDay}`,
                fontSize: Math.min(stageWidth * 0.016, 20),
                fill: 'black',
                align: 'center',
                fontFamily: FONT_FAMILY,
                fontStyle: 'bold'
            });
            receiptGroup.add(dayText);

            // Sales (Use BASE_FONT_SIZE and LINE_ADVANCE)
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

            // Tips Earned
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

            // Expenses
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
            currentY += LINE_ADVANCE * 1.5; // Extra space before Net Change

            // Combined Profits & Losses
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

            // Current Funds
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

    // MODIFIED: Continue Button
    private createContinueButton(stageWidth: number, stageHeight: number): void {
        const buttonWidth = Math.min(stageWidth * 0.25, 300);
        const buttonHeight = Math.min(stageHeight * 0.08, 60);
        
        // Responsive font size for continue
        const textFontSize = Math.min(stageWidth * 0.02, 24);

        // Calculate center Y
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
            fill: 'white',
            align: 'center',
            verticalAlign: 'middle',
            fontStyle: 'bold',
            listening: false
        });

        buttonGroup.add(rect);
        buttonGroup.add(text);

        buttonGroup.on('click tap', () => {
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
        this.layer.destroyChildren();
    }
}