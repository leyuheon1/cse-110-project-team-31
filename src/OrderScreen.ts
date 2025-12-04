import Konva from 'konva';
import { ExitButton } from './ui/ExitButton';
import { InfoButton } from './ui/InfoButton';
import { getAssetPath } from './utils';

export class OrderScreen {
    private layer: Konva.Layer;
    private stage: Konva.Stage;
    private onContinue: (totalDemand: number, customerOrders: Array<{customerNum: number, cookieCount: number}>) => void;
    private currentDay: number;
    private reputation: number; 
    private totalDemand: number = 0;
    private customerOrders: Array<{customerNum: number, cookieCount: number}> = [];
    private rootGroup: Konva.Group | null = null;

    constructor(
        stage: Konva.Stage, 
        layer: Konva.Layer, 
        currentDay: number, 
        reputation: number, 
        onContinue: (totalDemand: number, customerOrders: Array<{customerNum: number, cookieCount: number}>) => void
    ) {
        this.stage = stage;
        this.layer = layer;
        this.currentDay = currentDay;
        this.reputation = reputation; 
        this.onContinue = onContinue;

        this.setupUI();
    }

    private setupUI(): void {
        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        // Root group for all screen elements
        this.rootGroup = new Konva.Group({ x: 0, y: 0 });
        this.layer.add(this.rootGroup);

        // Load owl image then build receipt + button
        this.loadOwlImage(stageWidth, stageHeight, () => {
            this.createReceiptGroup(stageWidth, stageHeight);
            this.createContinueButton(stageWidth, stageHeight);
            this.layer.batchDraw();
        });

        // Exit & Info buttons
        new ExitButton(this.stage, this.layer, () => {
            this.cleanup();
            window.location.href = getAssetPath('login.html');
        });
        new InfoButton(this.stage, this.layer);
        

        this.layer.batchDraw(); 
    }

    private loadOwlImage(stageWidth: number, stageHeight: number, onLoad: () => void): void {
        const imageObj = new Image();
        imageObj.onload = () => {
            const aspectRatio = imageObj.width / imageObj.height || 1;
            const owlWidth = stageWidth * 0.35;
            const owlHeight = owlWidth / aspectRatio;

            const owl = new Konva.Image({
                x: stageWidth * 0.1,
                y: stageHeight * 0.6 - (owlHeight / 2),
                image: imageObj,
                width: owlWidth,
                height: owlHeight
            });

            if (this.rootGroup) this.rootGroup.add(owl);
            else this.layer.add(owl);

            this.layer.batchDraw();
            onLoad();
        };
        imageObj.src = getAssetPath('order-owl.png');
    }

    private createReceiptGroup(stageWidth: number, stageHeight: number): void {
        const imageObj = new Image();
        imageObj.onload = () => {
            const aspectRatio = imageObj.width / imageObj.height || 1;
            const receiptWidth = stageWidth * 0.3;
            const receiptHeight = receiptWidth / aspectRatio;
            const MAX_CUSTOMER_LINES = 7;

            const receiptGroup = new Konva.Group({
                x: stageWidth * 0.6,
                y: stageHeight * 0.15
            });

            const receipt = new Konva.Image({
                image: imageObj,
                width: receiptWidth,
                height: receiptHeight
            });
            receiptGroup.add(receipt);

            let currentY = receiptHeight * 0.14;

            const dayText = new Konva.Text({
                x: 0,
                y: currentY,
                width: receiptWidth,
                text: `DAY ${this.currentDay}`,
                fontSize: Math.min(stageWidth * 0.015, 18),
                fill: 'black',
                align: 'center',
                fontFamily: 'Doto',
                fontStyle: 'bold'
            });
            receiptGroup.add(dayText);

            currentY += stageHeight * 0.04;

            // --- Generate customer orders ---
            this.totalDemand = 0;
            this.customerOrders = [];
            //updated so that customer count always at least 1 and ranges between 1 and MAX_CUSTOMER_LINES
            const rawNumCustomers = 1 + Math.floor(this.reputation * (MAX_CUSTOMER_LINES - 1));
            const numCustomers = Math.min(MAX_CUSTOMER_LINES, Math.max(1, rawNumCustomers));

            const fontSize = Math.min(stageWidth * 0.013, 15);
            const LEFT_PADDING = 10;
            //RIGHT_PADDING unused

            for (let i = 1; i <= numCustomers; i++) {
                // updated calculation for cookieCount for each customer, decreased base cookie number based of reputation
                // scale cookie demand based from reputation + add some variation between -2 and +1 cookies
                const cookieCount = Math.max(1, Math.floor((this.reputation * 4) + (Math.random() * 3 - 2)));
                this.totalDemand += cookieCount;

                this.customerOrders.push({ customerNum: i, cookieCount });

                // Customer name (left)
                const customerName = new Konva.Text({
                    x: LEFT_PADDING + (receiptWidth * 0.1),
                    y: currentY,
                    width: receiptWidth * 0.6,
                    text: `${i}. CUSTOMER ${i}`,
                    fontSize,
                    fontFamily: 'Doto',
                    fill: 'black',
                    align: 'left'
                });
                receiptGroup.add(customerName);

                // Cookie count (right)
                const cookieCountText = new Konva.Text({
                    x: receiptWidth * 0.525 + LEFT_PADDING,
                    y: currentY,
                    width: receiptWidth * 0.35,
                    text: `${cookieCount} COOKIES`,
                    fontSize,
                    fontFamily: 'Doto',
                    fill: 'black',
                    align: 'right'
                });
                receiptGroup.add(cookieCountText);

                currentY += receiptHeight * 0.035;
            }

            // Total line
            const totalText = new Konva.Text({
                x: 0,
                y: currentY + 5,
                width: receiptWidth,
                text: `TOTAL: ${this.totalDemand} COOKIES`,
                fontSize: Math.min(stageWidth * 0.016, 18),
                fontStyle: 'bold',
                fontFamily: 'Doto',
                fill: 'black',
                align: 'center'
            });
            receiptGroup.add(totalText);

            if (this.rootGroup) this.rootGroup.add(receiptGroup);
            else this.layer.add(receiptGroup);

            this.layer.batchDraw();
        };

        imageObj.src = getAssetPath('start-receipt.png');
    }

    private createContinueButton(stageWidth: number, stageHeight: number): void {
        const buttonWidth = Math.min(stageWidth * 0.25, 300);
        const buttonHeight = Math.min(stageHeight * 0.08, 60);

        const buttonGroup = new Konva.Group({
            x: (stageWidth - buttonWidth) / 2,
            y: stageHeight * 0.88
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
            shadowOffsetY: 2
        });

        const text = new Konva.Text({
            width: buttonWidth,
            height: buttonHeight,
            text: 'CONTINUE',
            fontSize: Math.min(stageWidth * 0.022, 28),
            fontFamily: 'Press Start 2P',
            fill: 'white',
            align: 'center',
            verticalAlign: 'middle',
            fontStyle: 'bold',
            listening: false
        });

        buttonGroup.add(rect);
        buttonGroup.add(text);

        let clicked = false;
        buttonGroup.on('click', () => {
            if (clicked) return;
            clicked = true;
            rect.fill('#2e7d32');
            this.layer.batchDraw();
            this.onContinue(this.totalDemand, this.customerOrders.map(o => ({ ...o })));
        });

        rect.on('mouseenter', () => {
            this.stage.container().style.cursor = 'pointer';
            rect.fill('#45a049');
            this.layer.batchDraw();
        });
        rect.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
            rect.fill('#4CAF50');
            this.layer.batchDraw();
        });

        if (this.rootGroup) this.rootGroup.add(buttonGroup);
        else this.layer.add(buttonGroup);
    }

    public cleanup(): void {
        if (this.rootGroup) {
            this.rootGroup.remove();
            this.rootGroup = null;
        }
        this.layer.batchDraw();
    }
}
