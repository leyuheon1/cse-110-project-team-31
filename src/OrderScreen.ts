import Konva from 'konva';

export class OrderScreen {
    private layer: Konva.Layer;
    private stage: Konva.Stage;
    private onContinue: () => void;
    private currentDay: number;

    constructor(stage: Konva.Stage, layer: Konva.Layer, currentDay: number, onContinue: () => void) {
        this.stage = stage;
        this.layer = layer;
        this.currentDay = currentDay;
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
            text: `Day ${this.currentDay} - Today's Orders`,
            fontSize: Math.min(stageWidth * 0.045, 54),
            fontStyle: 'bold',
            fill: 'black',
            align: 'center'
        });
        this.layer.add(title);

        // Load orders from file
        this.loadOrders(stageWidth, stageHeight);

        // Continue button
        this.createContinueButton(stageWidth, stageHeight);

        this.layer.draw();
    }

    private async loadOrders(stageWidth: number, stageHeight: number): Promise<void> {
        try {
            const response = await fetch('/orders.txt');
            const text = await response.text();
            
            const ordersText = new Konva.Text({
                x: stageWidth * 0.15,
                y: stageHeight * 0.25,
                width: stageWidth * 0.7,
                text: text,
                fontSize: Math.min(stageWidth * 0.022, 26),
                fill: 'black',
                lineHeight: 1.8,
                wrap: 'word'
            });
            
            this.layer.add(ordersText);
            this.layer.draw();
        } catch (error) {
            console.error('Could not load orders:', error);
            
            const fallback = new Konva.Text({
                x: stageWidth * 0.15,
                y: stageHeight * 0.3,
                width: stageWidth * 0.7,
                text: 'No orders for today!',
                fontSize: Math.min(stageWidth * 0.025, 30),
                fill: 'gray',
                align: 'center'
            });
            this.layer.add(fallback);
            this.layer.draw();
        }
    }

    private createContinueButton(stageWidth: number, stageHeight: number): void {
        const buttonWidth = Math.min(stageWidth * 0.25, 300);
        const buttonHeight = Math.min(stageHeight * 0.08, 60);
        
        const buttonGroup = new Konva.Group({
            x: (stageWidth - buttonWidth) / 2,
            y: stageHeight * 0.75
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