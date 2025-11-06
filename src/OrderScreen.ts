import Konva from 'konva';
import { ExitButton } from './ui/ExitButton';

export class OrderScreen {
    private layer: Konva.Layer;
    private stage: Konva.Stage;
    private onContinue: (totalDemand: number) => void; // <-- MODIFIED
    private currentDay: number;
    private reputation: number; 
    private totalDemand: number = 0; // <-- ADDED THIS

    // --- MODIFIED CONSTRUCTOR ---
    constructor(
        stage: Konva.Stage, 
        layer: Konva.Layer, 
        currentDay: number, 
        reputation: number, 
        onContinue: (totalDemand: number) => void // <-- MODIFIED
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

        this.loadOwlImage(stageWidth, stageHeight, () => {
            // Once owl loads, add receipt + button
            this.createReceiptGroup(stageWidth, stageHeight);
            this.createContinueButton(stageWidth, stageHeight);
        });
        this.layer.add(title);

        this.loadOwlImage(stageWidth, stageHeight);
        this.loadOrderPlaceholder(stageWidth, stageHeight); 

        //Exit Button
        const exitButton = new ExitButton(this.stage, this.layer, () => {
            this.cleanup();
            window.location.href = '/login.html'; //go to login page
        });

        this.layer.draw(); 
    }

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
        imageObj.src = '/order-owl.png';
    }

    private createReceiptGroup(stageWidth: number, stageHeight: number): void {
        const imageObj = new Image();
        imageObj.onload = () => {
            const aspectRatio = imageObj.width / imageObj.height;
            const receiptWidth = stageWidth * 0.3;
            const receiptHeight = receiptWidth / aspectRatio;
            const MAX_CUSTOMER_LINES = 7; // <-- NEW HARD LIMIT (TO KEEP FROM EXCEEDING RECEIPT BOUNDS)

            // Scaling constants based on receipt height
            const V_PAD_HEADER = receiptHeight * 0.05;
            const V_STEP_ORDER = receiptHeight * 0.035;

            // X-axis constants to keep text in bounds of receipt
            const X_PAD_LEFT = receiptWidth * 0.1;
            const X_PAD_RIGHT = receiptWidth * 0.7;

            // Create group to hold receipt and text
            const receiptGroup = new Konva.Group({
                x: stageWidth * 0.6,
                y: stageHeight * 0.15,
            });
            
            // Create receipt image
            const receipt = new Konva.Image({
                image: imageObj,
                width: receiptWidth,
                height: receiptHeight
            });
            receiptGroup.add(receipt);

            // Start currentY much lower to clear the static "TODAY'S ORDERS" text on the image.
            let currentY = receiptHeight * 0.14; 

            const dayText = new Konva.Text({
                x: receiptWidth * 0.1,
                y: currentY,
                width: receiptWidth * 0.8,
                text: `DAY ${this.currentDay}`,
                fontSize: Math.min(stageWidth * 0.015, 18),
                fill: 'black',
                align: 'center',
                fontFamily: 'Doto',
                fontStyle: 'bold'
            });
            receiptGroup.add(dayText);
            
            // Advance currentY based on the screen height to leave a gap before the orders start
            currentY += stageHeight * 0.04;

            // --- Generate and Limit Customer Orders ---
            this.totalDemand = 0; // Reset total
            
            // Generate raw customer count based on reputation
            const rawNumCustomers = Math.floor((Math.random() * 6 + 5) * this.reputation);
            // Apply the hard limit
            const numCustomers = Math.min(MAX_CUSTOMER_LINES, Math.max(1, rawNumCustomers)); 
            
            const fontSize = Math.min(stageWidth * 0.013, 15);

            for (let i = 1; i <= numCustomers; i++) {
                const cookieCount = Math.max(1, Math.floor((Math.random() * 31 + 6) * this.reputation)); 
                this.totalDemand += cookieCount; 

                // LEFT COLUMN (Customer Name)
                const customerName = new Konva.Text({
                    x: X_PAD_LEFT,
                    y: currentY,
                    text: `${i}. CUSTOMER ${i}`,
                    fontSize: fontSize,
                    fontFamily: 'Doto',
                    fill: 'black'
                })
                receiptGroup.add(customerName);
                
                // RIGHT COLUMN (Cookie Count)
                const cookieCountText = new Konva.Text({
                    x: X_PAD_RIGHT, 
                    y: currentY,
                    width: receiptWidth * 0.2, 
                    text: `${cookieCount} COOKIES`,
                    fontSize: fontSize, 
                    fill: 'black',
                    fontFamily: 'Doto',
                    align: 'right'
                });
                receiptGroup.add(cookieCountText);
                currentY += V_STEP_ORDER; // Tighter vertical advance
            }
            
            // Calculate final TOTAL position based on where the list ended
            const totalY = currentY + V_PAD_HEADER * 0.5; 

            const totalText = new Konva.Text({
                x: receiptWidth * 0.1,
                y: totalY,
                width: receiptWidth * 0.8,
                text: `TOTAL: ${this.totalDemand} COOKIES`,
                fontSize: Math.min(stageWidth * 0.016, 18),
                fontStyle: 'bold',
                fontFamily: 'Doto',
                fill: 'black',
                align: 'center'
            });
            receiptGroup.add(totalText);

            this.layer.add(receiptGroup);
            this.layer.draw();
        };

        imageObj.src = '/start-receipt.png'
    }

    // --- MODIFIED createContinueButton ---
    private createContinueButton(stageWidth: number, stageHeight: number): void {
        const buttonWidth = Math.min(stageWidth * 0.25, 300);
        const buttonHeight = Math.min(stageHeight * 0.08, 60);
        
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
            width: buttonWidth,
            height: buttonHeight,
            text: 'CONTINUE',
            fontSize: Math.min(stageWidth * 0.022, 28),
            fill: 'white',
            align: 'center',
            verticalAlign: 'middle',
            fontStyle: 'bold',
            listening: false 
        });

        buttonGroup.add(rect);
        buttonGroup.add(text);
        
        // --- MODIFIED: Pass totalDemand on click ---
        buttonGroup.on('click', () => {
            this.onContinue(this.totalDemand);
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

        this.layer.add(buttonGroup);
    }
    
    public cleanup(): void {
    }
}