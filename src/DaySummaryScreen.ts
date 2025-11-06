import Konva from 'konva';
import { ExitButton } from './ui/ExitButton';

export class DaySummaryScreen {
    private layer: Konva.Layer;
    private stage: Konva.Stage;
    private onContinue: () => void;
    private currentDay: number;
    private daySales: number;
    private dayExpenses: number;
    private currentFunds: number;
    private dayTips: number; // <-- ADDED THIS

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

        // Background box
        const backgroundRect = new Konva.Rect({
            x: stageWidth * 0.2,
            y: stageHeight * 0.15,
            width: stageWidth * 0.6,
            height: stageHeight * 0.7,
            fill: '#FDF5E6',
            stroke: '#A0522D',
            strokeWidth: 5,
            cornerRadius: 15,
            shadowColor: 'black',
            shadowBlur: 15,
            shadowOpacity: 0.5,
            shadowOffsetX: 5,
            shadowOffsetY: 5
        });
        this.layer.add(backgroundRect);

        // Title
        const title = new Konva.Text({
            x: backgroundRect.x(),
            y: backgroundRect.y() + stageHeight * 0.05,
            width: backgroundRect.width(),
            text: `DAY ${this.currentDay} SUMMARY`,
            fontSize: Math.min(stageWidth * 0.035, 42),
            fontStyle: 'bold',
            fill: '#8B4513',
            align: 'center'
        });
        this.layer.add(title);

        let currentY = title.y() + title.height() + stageHeight * 0.05;

        // Sales
        const salesText = new Konva.Text({
            x: backgroundRect.x() + backgroundRect.width() * 0.1,
            y: currentY,
            width: backgroundRect.width() * 0.8,
            text: `Sales (Cookies Sold): $${this.daySales.toFixed(2)}`,
            fontSize: Math.min(stageWidth * 0.018, 22),
            fill: '#228B22',
            fontStyle: 'bold'
        });
        this.layer.add(salesText);
        currentY += salesText.height() + stageHeight * 0.02;
        
        // --- NEW: Tips Earned ---
        const tipsText = new Konva.Text({
            x: backgroundRect.x() + backgroundRect.width() * 0.1,
            y: currentY,
            width: backgroundRect.width() * 0.8,
            text: `Tips Earned: $${this.dayTips.toFixed(2)}`,
            fontSize: Math.min(stageWidth * 0.018, 22),
            fill: '#FFD700', // Gold color
            fontStyle: 'bold'
        });
        this.layer.add(tipsText);
        currentY += tipsText.height() + stageHeight * 0.02;

        // Expenses
        const expensesText = new Konva.Text({
            x: backgroundRect.x() + backgroundRect.width() * 0.1,
            y: currentY,
            width: backgroundRect.width() * 0.8,
            text: `Expenses (Ingredients, Fines): -$${this.dayExpenses.toFixed(2)}`,
            fontSize: Math.min(stageWidth * 0.018, 22),
            fill: '#B22222',
            fontStyle: 'bold'
        });
        this.layer.add(expensesText);
        currentY += expensesText.height() + stageHeight * 0.04;

        // Net Change
        const netChange = this.daySales + this.dayTips - this.dayExpenses; // Include tips
        const netChangeColor = netChange >= 0 ? '#006400' : '#8B0000';
        const netChangeText = new Konva.Text({
            x: backgroundRect.x() + backgroundRect.width() * 0.1,
            y: currentY,
            width: backgroundRect.width() * 0.8,
            text: `Net Change: ${netChange >= 0 ? '+' : ''}$${netChange.toFixed(2)}`,
            fontSize: Math.min(stageWidth * 0.02, 26),
            fill: netChangeColor,
            fontStyle: 'bold'
        });
        this.layer.add(netChangeText);
        currentY += netChangeText.height() + stageHeight * 0.04;

        // Current Funds
        const fundsText = new Konva.Text({
            x: backgroundRect.x() + backgroundRect.width() * 0.1,
            y: currentY,
            width: backgroundRect.width() * 0.8,
            text: `Current Funds: $${this.currentFunds.toFixed(2)}`,
            fontSize: Math.min(stageWidth * 0.025, 30),
            fill: '#4682B4',
            fontStyle: 'bold'
        });
        this.layer.add(fundsText);

        // Continue Button
        const buttonWidth = Math.min(stageWidth * 0.2, 250);
        const buttonHeight = Math.min(stageHeight * 0.07, 50);

        const continueButton = new Konva.Rect({
            x: (stageWidth - buttonWidth) / 2,
            y: backgroundRect.y() + backgroundRect.height() - buttonHeight - stageHeight * 0.03,
            width: buttonWidth,
            height: buttonHeight,
            fill: '#6B8E23',
            cornerRadius: 10,
            shadowColor: 'black',
            shadowBlur: 5,
            shadowOpacity: 0.3,
            shadowOffsetX: 2,
            shadowOffsetY: 2
        });
        this.layer.add(continueButton);

        const continueText = new Konva.Text({
            x: continueButton.x(),
            y: continueButton.y() + (buttonHeight - Math.min(stageWidth * 0.02, 24)) / 2,
            width: buttonWidth,
            text: 'CONTINUE',
            fontSize: Math.min(stageWidth * 0.02, 24),
            fill: 'white',
            align: 'center',
            fontStyle: 'bold',
            listening: false
        });
        this.layer.add(continueText);

        continueButton.on('click tap', () => {
            this.onContinue();
        });
        continueButton.on('mouseenter', () => {
            this.stage.container().style.cursor = 'pointer';
            continueButton.fill('#556B2F');
            this.layer.batchDraw();
        });
        continueButton.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
            continueButton.fill('#6B8E23');
            this.layer.batchDraw();
        });

        //Exit Button
        const exitButton = new ExitButton(this.stage, this.layer, () => {
            this.cleanup();
            window.location.href = '/login.hmtl'; //go to login page
        });
        
        this.layer.draw();
    }

    public cleanup(): void {
        this.layer.destroyChildren();
    }
}