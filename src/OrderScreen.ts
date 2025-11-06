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

        const title = new Konva.Text({
            x: stageWidth * 0.1,
            y: stageHeight * 0.1,
            width: stageWidth * 0.8,
            fontSize: Math.min(stageWidth * 0.045, 54),
            fontStyle: 'bold',
            fill: 'black',
            align: 'center'
        });
        this.layer.add(title);

        this.loadOwlImage(stageWidth, stageHeight);
        this.loadOrderPlaceholder(stageWidth, stageHeight); 

        //Exit Button
        const exitButton = new ExitButton(this.stage, this.layer, () => {
            this.cleanup();
            window.location.href = '/login.hmtl'; //go to login page
        });

        this.layer.draw(); 
    }

    private loadOwlImage(stageWidth: number, stageHeight: number): void {
        const imageObj = new Image();
        imageObj.onload = () => {
            const owl = new Konva.Image({
                x: stageWidth * 0.05,
                y: stageHeight * 0.4 - (stageWidth * 0.25 / 2), 
                image: imageObj,
                width: stageWidth * 0.25,
                height: stageWidth * 0.25
            });
            this.layer.add(owl);
            this.layer.draw();
        };
        imageObj.src = '/owl.png';
    }

    private loadOrderPlaceholder(stageWidth: number, stageHeight: number): void {
        const imageObj = new Image();
        
        const createContentAndButtons = () => {
            this.createOrderText(stageWidth, stageHeight);
            this.createContinueButton(stageWidth, stageHeight); 
            this.layer.batchDraw();
        };

        imageObj.onload = () => {
            const placeholder = new Konva.Image({
                x: stageWidth * 0.45,
                y: stageHeight * 0.15,
                image: imageObj,
                width: stageWidth * 0.45,
                height: stageHeight * 0.7
            });
            this.layer.add(placeholder);
            createContentAndButtons(); 
        };
        imageObj.onerror = () => {
            const fallbackRect = new Konva.Rect({
                x: stageWidth * 0.45,
                y: stageHeight * 0.15,
                width: stageWidth * 0.45,
                height: stageHeight * 0.7,
                fill: '#FFF8DC', 
                stroke: '#ccc',
                strokeWidth: 2,
                cornerRadius: 10 
            });
            this.layer.add(fallbackRect);
            createContentAndButtons(); 
        };
        imageObj.src = '/order.png';
    }


    private createOrderText(stageWidth: number, stageHeight: number): void {
        const paperX = stageWidth * 0.45;
        const paperY = stageHeight * 0.15;
        const paperWidth = stageWidth * 0.45;
        const textPadding = paperWidth * 0.05; 
        const textWidth = paperWidth - (textPadding * 2);
        
        let currentY = paperY + stageHeight * 0.03; 

        const gameTitle = new Konva.Text({
            x: paperX + textPadding,
            y: currentY,
            width: textWidth,
            text: 'COOKIE TRAILER TYCOON',
            fontSize: Math.min(stageWidth * 0.025, 30),
            fontStyle: 'bold',
            fill: '#FF6B35',
            align: 'center'
        });
        this.layer.add(gameTitle);
        currentY += stageHeight * 0.06;

        const ordersTitle = new Konva.Text({
            x: paperX + textPadding,
            y: currentY,
            width: textWidth,
            text: "TODAY'S ORDERS",
            fontSize: Math.min(stageWidth * 0.018, 22),
            fill: 'black',
            align: 'center'
        });
        this.layer.add(ordersTitle);
        currentY += stageHeight * 0.04;

        const dayText = new Konva.Text({
            x: paperX + textPadding,
            y: currentY,
            width: textWidth,
            text: `DAY ${this.currentDay}`,
            fontSize: Math.min(stageWidth * 0.015, 18),
            fill: 'black',
            align: 'center'
        });
        this.layer.add(dayText);
        currentY += stageHeight * 0.04;

        const separator = new Konva.Text({
            x: paperX + textPadding,
            y: currentY,
            width: textWidth,
            text: '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -',
            fontSize: Math.min(stageWidth * 0.012, 14),
            fill: 'black',
            align: 'center'
        });
        this.layer.add(separator);
        currentY += stageHeight * 0.05;

        // --- Generate random customer orders based on reputation ---
        this.totalDemand = 0; // Reset total
        const numCustomers = Math.max(1, Math.floor((Math.random() * 6 + 5) * this.reputation)); 
        
        for (let i = 1; i <= numCustomers; i++) {
            const cookieCount = Math.max(1, Math.floor((Math.random() * 31 + 6) * this.reputation)); 
            this.totalDemand += cookieCount; // <-- Store total

            const customerOrder = new Konva.Text({
                x: paperX + textPadding + (textWidth * 0.05), 
                y: currentY,
                width: textWidth * 0.9, 
                text: `${i}. CUSTOMER ${i}                    ${cookieCount} COOKIES`,
                fontSize: Math.min(stageWidth * 0.013, 15), 
                fill: 'black',
                fontFamily: 'monospace' 
            });
            this.layer.add(customerOrder);
            currentY += stageHeight * 0.045; 
        }

        currentY += stageHeight * 0.02;

        const total = new Konva.Text({
            x: paperX + textPadding,
            y: currentY,
            width: textWidth,
            text: `TOTAL ........................ ${this.totalDemand} COOKIES`, // <-- Use stored total
            fontSize: Math.min(stageWidth * 0.016, 18),
            fontStyle: 'bold',
            fill: 'black',
            align: 'center'
        });
        this.layer.add(total);
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