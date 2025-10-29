import Konva from 'konva';

export class DaySummaryScreen {
    private layer: Konva.Layer;
    private stage: Konva.Stage;
    private onContinue: () => void;
    private sales: number;
    private expenses: number;
    private profit: number;
    private remainingFunds: number;
    private currentDay: number;

    constructor(
        stage: Konva.Stage,
        layer: Konva.Layer,
        currentDay: number,
        sales: number,
        expenses: number,
        remainingFunds: number,
        onContinue: () => void
    ) {
        this.stage = stage;
        this.layer = layer;
        this.currentDay = currentDay;
        this.sales = sales;
        this.expenses = expenses;
        this.profit = sales - expenses;
        this.remainingFunds = remainingFunds;
        this.onContinue = onContinue;
        this.setupUI();
    }

    private setupUI(): void {
        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        // Title
        const title = new Konva.Text({
            x: stageWidth * 0.1,
            y: stageHeight * 0.1,
            width: stageWidth * 0.8,
            text: `Day ${this.currentDay} - End of Day Summary`,
            fontSize: Math.min(stageWidth * 0.04, 48),
            fontStyle: 'bold',
            fill: 'black',
            align: 'center'
        });
        this.layer.add(title);

        let currentY = stageHeight * 0.25;

        // Total Sales
        const salesText = new Konva.Text({
            x: stageWidth * 0.2,
            y: currentY,
            width: stageWidth * 0.6,
            text: `Total Sales: $${this.sales.toFixed(2)}`,
            fontSize: Math.min(stageWidth * 0.03, 36),
            fill: '#27ae60',
            fontStyle: 'bold'
        });
        this.layer.add(salesText);
        currentY += stageHeight * 0.1;

        // Expenses
        const expensesText = new Konva.Text({
            x: stageWidth * 0.2,
            y: currentY,
            width: stageWidth * 0.6,
            text: `Expenses: -$${this.expenses.toFixed(2)}`,
            fontSize: Math.min(stageWidth * 0.03, 36),
            fill: '#e74c3c',
            fontStyle: 'bold'
        });
        this.layer.add(expensesText);
        currentY += stageHeight * 0.1;

        // Separator line
        const separator = new Konva.Line({
            points: [stageWidth * 0.2, currentY, stageWidth * 0.8, currentY],
            stroke: 'black',
            strokeWidth: 2
        });
        this.layer.add(separator);
        currentY += stageHeight * 0.05;

        // Profit
        const profitColor = this.profit >= 0 ? '#27ae60' : '#e74c3c';
        const profitText = new Konva.Text({
            x: stageWidth * 0.2,
            y: currentY,
            width: stageWidth * 0.6,
            text: `Profit: ${this.profit >= 0 ? '+' : ''}$${this.profit.toFixed(2)}`,
            fontSize: Math.min(stageWidth * 0.035, 42),
            fill: profitColor,
            fontStyle: 'bold'
        });
        this.layer.add(profitText);
        currentY += stageHeight * 0.12;

        // Remaining Funds
        const fundsText = new Konva.Text({
            x: stageWidth * 0.2,
            y: currentY,
            width: stageWidth * 0.6,
            text: `Remaining Funds: $${this.remainingFunds.toFixed(2)}`,
            fontSize: Math.min(stageWidth * 0.032, 38),
            fill: '#2c3e50',
            fontStyle: 'bold'
        });
        this.layer.add(fundsText);

        // Continue button
        this.createContinueButton(stageWidth, stageHeight);

        this.layer.draw();
    }

    private createContinueButton(stageWidth: number, stageHeight: number): void {
        const buttonWidth = Math.min(stageWidth * 0.25, 300);
        const buttonHeight = Math.min(stageHeight * 0.08, 60);

        const buttonGroup = new Konva.Group({
            x: (stageWidth - buttonWidth) / 2,
            y: stageHeight * 0.8
        });

        const rect = new Konva.Rect({
            width: buttonWidth,
            height: buttonHeight,
            fill: '#4CAF50',
            cornerRadius: 10
        });

        const text = new Konva.Text({
            width: buttonWidth,
            height: buttonHeight,
            text: 'CONTINUE',
            fontSize: Math.min(stageWidth * 0.022, 28),
            fill: 'white',
            align: 'center',
            verticalAlign: 'middle',
            fontStyle: 'bold'
        });

        buttonGroup.add(rect);
        buttonGroup.add(text);

        buttonGroup.on('click', this.onContinue);
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
        // Cleanup if needed
    }
}